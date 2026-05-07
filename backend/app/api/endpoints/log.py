from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.log import DailyLog
from datetime import date
from typing import Optional, List
import os
import requests
import datetime
from pydantic import BaseModel

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
    today_dt = datetime.date.today()
    
    # 1. Get today's log
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today_dt).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today_dt, food_items=[], total_kcal=0, steps=0, water_ml=0)
        db.add(log)
        db.commit()
        db.refresh(log)
    
    # 2. Get 7-day history for kcal/steps charts
    start_date_7 = today_dt - datetime.timedelta(days=6)
    existing_logs_7 = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date_7,
        DailyLog.date <= today_dt
    ).all()
    
    log_map_7 = {l.date: l for l in existing_logs_7}
    history_7 = []
    for i in range(7):
        curr_date = start_date_7 + datetime.timedelta(days=i)
        if curr_date in log_map_7:
            history_7.append(log_map_7[curr_date])
        else:
            history_7.append({"date": curr_date, "total_kcal": 0, "steps": 0, "water_ml": 0, "weight": None, "food_items": []})

    # 3. Get 30-day weight history for the progressive chart
    start_date_30 = today_dt - datetime.timedelta(days=29)
    logs_30 = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date_30,
        DailyLog.date <= today_dt
    ).order_by(DailyLog.date.asc()).all()
    
    weight_map_30 = {l.date.isoformat(): l.weight for l in logs_30 if l.weight is not None}
    
    # Find baseline weight
    last_weight = current_user.profile.weight if current_user.profile else None
    
    prev_log = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date < start_date_30,
        DailyLog.weight != None
    ).order_by(DailyLog.date.desc()).first()
    
    if prev_log:
        last_weight = prev_log.weight
    elif last_weight is None:
        any_log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.weight != None).first()
        if any_log:
            last_weight = any_log.weight

    weight_history = []
    for i in range(30):
        curr_date = start_date_30 + datetime.timedelta(days=i)
        curr_iso = curr_date.isoformat()
        actual_weight = weight_map_30.get(curr_iso)
        if actual_weight is not None:
            last_weight = actual_weight
        
        if last_weight is not None:
            weight_history.append({
                "date": curr_iso,
                "weight": last_weight,
                "is_actual": actual_weight is not None
            })

    # 4. Basic Insights
    profile = current_user.profile
    cached_summary = getattr(log, 'ai_summary', None)
    
    feedback = {
        "summary": cached_summary or "Your AI Coach is analyzing your progress...",
        "insights": [],
        "status": "on_track"
    }
    
    insights = []
    target_kcal = profile.target_kcal or 2000
    if log.total_kcal < target_kcal * 0.8:
        insights.append(f"You're currently {target_kcal - log.total_kcal} kcal under target.")
    elif log.total_kcal > target_kcal * 1.1:
        insights.append(f"You've exceeded your target by {log.total_kcal - target_kcal} kcal.")
    
    if log.steps < 5000:
        insights.append("Activity is low today.")
    elif log.steps >= 10000:
        insights.append("Goal reached!")

    feedback["insights"] = insights
    
    return {
        "user": current_user,
        "today": log,
        "history": history_7,
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
    access_token = request.access_token if request else None
    
    # If no access token provided or it's expired, try to use refresh token
    if not access_token and current_user.google_refresh_token:
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
    
    if not access_token:
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
    
    try:
        response = requests.post(url, json=body, headers=headers)
        if response.status_code != 200:
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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
