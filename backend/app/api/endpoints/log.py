from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.log import DailyLog
from datetime import date, timedelta
from typing import Optional, List
import os
import requests
import datetime
from pydantic import BaseModel
from sqlalchemy import isnot

class GoogleSyncRequest(BaseModel):
    access_token: Optional[str] = None

class GoogleStoreCodeRequest(BaseModel):
    code: str

router = APIRouter()

@router.get("/today")
def get_today_log(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today, food_items=[], total_kcal=0, steps=0, water_ml=0)
        db.add(log)
        db.commit()
        db.refresh(log)
    return log

@router.get("/dashboard-data")
def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today_dt = date.today()
    
    # 1. Get today's log (ensure it exists)
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today_dt).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today_dt, food_items=[], total_kcal=0, steps=0, water_ml=0)
        db.add(log)
        db.commit()
        db.refresh(log)
    
    # 2. Get 7-day history for kcal/steps charts
    start_date_7 = today_dt - timedelta(days=6)
    existing_logs_7 = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date_7,
        DailyLog.date <= today_dt
    ).all()
    
    log_map_7 = {l.date: l for l in existing_logs_7}
    history_7 = []
    for i in range(7):
        curr_date = start_date_7 + timedelta(days=i)
        if curr_date in log_map_7:
            history_7.append(log_map_7[curr_date])
        else:
            history_7.append({"date": curr_date, "total_kcal": 0, "steps": 0, "water_ml": 0, "weight": None, "food_items": []})

    # 3. Get 30-day weight history (progressive)
    start_date_30 = today_dt - timedelta(days=29)
    logs_30 = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date_30,
        DailyLog.date <= today_dt
    ).order_by(DailyLog.date.asc()).all()
    
    weight_map_30 = {l.date.isoformat(): l.weight for l in logs_30 if l.weight is not None}
    
    # Robust Baseline Search:
    # 1. Start with Profile Weight
    # 2. Check for most recent weight log BEFORE our 30-day window
    # 3. Check for ANY weight log if still None
    last_weight = None
    if current_user.profile and current_user.profile.weight is not None:
        last_weight = current_user.profile.weight
    
    prev_log = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date < start_date_30,
        isnot(DailyLog.weight, None)
    ).order_by(DailyLog.date.desc()).first()
    
    if prev_log:
        last_weight = prev_log.weight
    
    if last_weight is None:
        any_log = db.query(DailyLog).filter(
            DailyLog.user_id == current_user.id,
            isnot(DailyLog.weight, None)
        ).order_by(DailyLog.date.desc()).first()
        if any_log:
            last_weight = any_log.weight
            
    # Absolute fallback to avoid empty chart
    if last_weight is None:
        last_weight = 70.0

    weight_history = []
    # If still None, use a safe default for the chart
    chart_last_weight = last_weight if last_weight is not None else 70.0

    for i in range(30):
        curr_date = start_date_30 + timedelta(days=i)
        curr_iso = curr_date.isoformat()
        actual_weight = weight_map_30.get(curr_iso)
        
        if actual_weight is not None:
            chart_last_weight = actual_weight
            
        weight_history.append({
            "date": curr_iso,
            "weight": float(chart_last_weight),
            "is_actual": actual_weight is not None
        })

    # 4. Feedback & Insights
    profile = current_user.profile
    cached_summary = getattr(log, 'ai_summary', None)
    feedback = {
        "summary": cached_summary or "Your AI Coach is analyzing your progress...",
        "insights": [],
        "status": "on_track"
    }
    
    target_kcal = (profile.target_kcal if profile else 2000) or 2000
    if log.total_kcal < target_kcal * 0.8:
        feedback["insights"].append(f"You're currently {target_kcal - log.total_kcal} kcal under target.")
    elif log.total_kcal > target_kcal * 1.1:
        feedback["insights"].append(f"You've exceeded your target by {log.total_kcal - target_kcal} kcal.")
    
    if log.steps < 5000:
        feedback["insights"].append("Activity is low today.")
    elif log.steps >= 10000:
        feedback["insights"].append("Goal reached!")

    # Explicit serialization to avoid lazy-loading issues in JSON response
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "has_google_sync": current_user.has_google_sync,
            "profile": {
                "name": profile.name if profile else None,
                "weight": profile.weight if profile else None,
                "target_kcal": profile.target_kcal if profile else 2000,
                "objective": profile.objective if profile else "maintain"
            }
        },
        "today": {
            "date": log.date.isoformat(),
            "steps": log.steps,
            "water_ml": log.water_ml,
            "weight": log.weight,
            "total_kcal": log.total_kcal,
            "food_items": log.food_items,
            "ai_summary": log.ai_summary
        },
        "history": [
            {
                "date": h.date.isoformat() if hasattr(h, 'date') else h['date'].isoformat(),
                "total_kcal": h.total_kcal if hasattr(h, 'total_kcal') else h['total_kcal'],
                "steps": h.steps if hasattr(h, 'steps') else h['steps'],
                "weight": h.weight if hasattr(h, 'weight') else h['weight']
            } for h in history_7
        ],
        "weightHistory": weight_history,
        "feedback": feedback
    }

@router.get("/feedback")
def get_daily_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    profile = current_user.profile
    
    if not log or not profile:
        return {"feedback": "Start logging your day to get personalized feedback!"}
    
    # Generate insights
    insights = []
    
    # Calorie check
    target_kcal = profile.target_kcal or 2000
    if log.total_kcal < target_kcal * 0.8:
        insights.append(f"You're currently {target_kcal - log.total_kcal} kcal under your daily target. Consider a healthy snack.")
    elif log.total_kcal > target_kcal * 1.1:
        insights.append(f"You've exceeded your calorie target by {log.total_kcal - target_kcal} kcal today.")
    else:
        insights.append("Great job staying within your calorie target!")
        
    # Step check
    if log.steps < 5000:
        insights.append("Your activity level is low today. A 15-minute walk could help!")
    elif log.steps >= 10000:
        insights.append("Excellent work hitting your step goal!")
        
    # Hydration check
    if log.water_ml < 2000:
        insights.append("Don't forget to hydrate. Aim for at least 2L of water per day.")
        
    # Combine into a prompt for the AI to make it more conversational
    from app.services.ai_chat import get_chat_service
    chat_service = get_chat_service()
    
    user_name = profile.name or "Athlete"
    raw_data = f"User Name: {user_name}, Calories: {log.total_kcal}/{target_kcal}, Steps: {log.steps}, Water: {log.water_ml}ml. Goal: {profile.objective}."
    ai_feedback = chat_service.generate_response(
        f"Give a short, punchy, 2-sentence motivational coaching tip to {user_name} based on these stats: {raw_data}. Be direct and professional, no formal letter salutations like 'Dear'.",
        user_profile={
            "age": profile.age,
            "weight": profile.weight,
            "objective": profile.objective,
            "name": user_name
        }
    )
    
    # Cache the result
    log.ai_summary = ai_feedback
    db.commit()
    
    return {
        "summary": ai_feedback,
        "insights": insights,
        "status": "on_track" if log.steps >= 8000 and abs(log.total_kcal - target_kcal) < 300 else "needs_work"
    }

@router.put("/steps")
def update_steps(
    steps: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today, steps=steps)
        db.add(log)
    else:
        log.steps = steps
    db.commit()
    return log

@router.put("/water")
def update_water(
    water_ml: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today, water_ml=water_ml)
        db.add(log)
    else:
        log.water_ml = water_ml
    db.commit()
    return log

@router.put("/add-water")
def add_water(
    water_ml: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today, water_ml=water_ml)
        db.add(log)
    else:
        log.water_ml += water_ml
    db.commit()
    return log

@router.put("/weight")
def update_weight(
    weight: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today, weight=weight)
        db.add(log)
    else:
        log.weight = weight

    # Also update user profile weight if it's the latest
    if current_user.profile:
        current_user.profile.weight = weight
        # Recalculate target_kcal based on new weight
        from app.core.calculations import calculate_target_kcal_logic
        current_user.profile.target_kcal = calculate_target_kcal_logic(
            current_user.profile.age,
            current_user.profile.gender,
            current_user.profile.weight,
            current_user.profile.height,
            current_user.profile.activity_level,
            current_user.profile.objective
        )

    db.commit()
    return log


@router.get("/history")
def get_log_history(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import datetime
    today_dt = datetime.date.today()
    start_date = today_dt - datetime.timedelta(days=days-1)
    
    existing_logs = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date,
        DailyLog.date <= today_dt
    ).all()
    
    log_map = {l.date: l for l in existing_logs}
    history = []
    for i in range(days):
        curr_date = start_date + datetime.timedelta(days=i)
        if curr_date in log_map:
            history.append(log_map[curr_date])
        else:
            history.append({"date": curr_date, "total_kcal": 0, "steps": 0, "water_ml": 0, "weight": None, "food_items": []})
    
    return history

@router.post("/google-store-code")
def google_store_code(
    request: GoogleStoreCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Exchange code for tokens
    url = "https://oauth2.googleapis.com/token"
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    # Using 'postmessage' is the standard for react-oauth/google auth-code flow
    redirect_uri = "postmessage" 
    
    data = {
        "code": request.code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    response = requests.post(url, data=data)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"Google Token Exchange error: {response.text}")
    
    tokens = response.json()
    refresh_token = tokens.get("refresh_token")
    
    if refresh_token:
        current_user.google_refresh_token = refresh_token
        db.commit()
    
    return {"status": "success", "has_refresh_token": bool(refresh_token)}

@router.get("/weight-history")
def get_weight_history(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # We'll keep this as a standalone endpoint too for specific needs, 
    # but the dashboard now gets it via /dashboard-data
    import datetime
    today_dt = datetime.date.today()
    start_dt = today_dt - datetime.timedelta(days=days-1)
    
    logs = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_dt,
        DailyLog.date <= today_dt
    ).order_by(DailyLog.date.asc()).all()
    
    log_map = {l.date.isoformat(): l.weight for l in logs if l.weight is not None}
    last_weight = current_user.profile.weight if current_user.profile else None
    
    prev_log = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date < start_dt,
        DailyLog.weight != None
    ).order_by(DailyLog.date.desc()).first()
    
    if prev_log:
        last_weight = prev_log.weight
    elif last_weight is None:
        any_log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.weight != None).first()
        if any_log:
            last_weight = any_log.weight

    progressive_history = []
    for i in range(days):
        curr_date = start_dt + datetime.timedelta(days=i)
        curr_iso = curr_date.isoformat()
        actual_weight = log_map.get(curr_iso)
        if actual_weight is not None:
            last_weight = actual_weight
        if last_weight is not None:
            progressive_history.append({
                "date": curr_iso,
                "weight": last_weight,
                "is_actual": actual_weight is not None
            })
    return progressive_history

@router.post("/sync-google-fit")
def sync_google_fit(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: GoogleSyncRequest = None
):
    try:
        print(f"DEBUG: Starting Google Fit sync for user {current_user.email}")
        access_token = request.access_token if request else None
        
        # If no access token provided or it's expired, try to use refresh token
        if not access_token and current_user.google_refresh_token:
            print("DEBUG: Refreshing Google Access Token...")
            # Refresh the access token
            refresh_url = "https://oauth2.googleapis.com/token"
            refresh_data = {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "refresh_token": current_user.google_refresh_token,
                "grant_type": "refresh_token"
            }
            refresh_response = requests.post(refresh_url, data=refresh_data)
            if refresh_response.status_code == 200:
                access_token = refresh_response.json().get("access_token")
                print("DEBUG: Access token refreshed successfully.")
            else:
                print(f"DEBUG: Token refresh failed: {refresh_response.status_code} - {refresh_response.text}")
        
        if not access_token:
            print("DEBUG: No access token available, raising 403.")
            raise HTTPException(status_code=403, detail="No valid Google access token found. Please re-sync.")

        # Calculate start and end of today in milliseconds
        now = datetime.datetime.now()
        start_of_today = datetime.datetime(now.year, now.month, now.day)
        end_of_today = start_of_today + datetime.timedelta(days=1)
        
        start_ms = int(start_of_today.timestamp() * 1000)
        end_ms = int(end_of_today.timestamp() * 1000)
        
        # Google Fit Aggregate API
        url = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # We'll sync both steps and weight in one go if possible, or separate calls
        # For reliability, let's do one aggregate call with both data types
        body = {
            "aggregateBy": [
                { "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps" },
                { "dataTypeName": "com.google.weight" }
            ],
            "bucketByTime": { "durationMillis": end_ms - start_ms },
            "startTimeMillis": start_ms,
            "endTimeMillis": end_ms
        }
        
        response = requests.post(url, json=body, headers=headers)
        if response.status_code != 200:
            print(f"DEBUG: Google Fit API error {response.status_code}: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Google Fit API error: {response.text}")
            
        data = response.json()
        total_steps = 0
        latest_weight = None
        
        # Parse the nested Google Fit response
        for bucket in data.get("bucket", []):
            for dataset in bucket.get("dataset", []):
                # Check data type
                source = dataset.get("dataSourceId", "")
                for point in dataset.get("point", []):
                    for value in point.get("value", []):
                        if "step_count" in source:
                            total_steps += value.get("intVal", 0)
                        elif "weight" in source or dataset.get("dataTypeName") == "com.google.weight":
                            # Weight is usually a float
                            latest_weight = value.get("fpVal")
        
        print(f"DEBUG: Parsed steps={total_steps}, weight={latest_weight}")
        
        # Update our database
        today_date = date.today()
        log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today_date).first()
        if not log:
            log = DailyLog(user_id=current_user.id, date=today_date, steps=total_steps, weight=latest_weight)
            db.add(log)
        else:
            log.steps = total_steps
            if latest_weight:
                log.weight = latest_weight
            
        db.commit()
        db.refresh(log)
        
        return {"steps": total_steps, "weight": latest_weight, "date": today_date}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"DEBUG: Sync exception: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
