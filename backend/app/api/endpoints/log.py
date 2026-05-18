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
from sqlalchemy import and_
from sqlalchemy.orm.attributes import flag_modified

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

@router.get("/recent-items")
def get_recent_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get logs from the last 7 days
    start_date = date.today() - timedelta(days=7)
    logs = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date
    ).order_by(DailyLog.date.desc()).all()
    
    recent_items = []
    seen_labels = set()
    
    for log in logs:
        if not log.food_items:
            continue
        # Items are stored with most recent last in the list, so we reverse it
        for item in reversed(log.food_items):
            label = item.get("label")
            if label and label not in seen_labels:
                # We need to format this for the 'selectQuickItem' function
                # The frontend expects kcal_per_100g or kcal + grams
                grams = item.get("grams", 100)
                kcal = item.get("kcal", 0)
                
                recent_items.append({
                    "label": label,
                    "kcal": kcal,
                    "grams": grams,
                    "kcal_per_100g": (kcal / grams) * 100 if grams > 0 else 0,
                    "protein": item.get("protein", 0),
                    "carbs": item.get("carbs", 0),
                    "fat": item.get("fat", 0),
                    "protein_per_100g": (item.get("protein", 0) / grams) * 100 if grams > 0 else 0,
                    "carbs_per_100g": (item.get("carbs", 0) / grams) * 100 if grams > 0 else 0,
                    "fat_per_100g": (item.get("fat", 0) / grams) * 100 if grams > 0 else 0,
                    "is_quantifiable": False,
                    "default_grams": grams
                })
                seen_labels.add(label)
                if len(recent_items) >= 10:
                    break
        if len(recent_items) >= 10:
            break
            
    return recent_items

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
    history_list = []
    for i in range(7):
        curr_date = start_date_7 + timedelta(days=i)
        if curr_date in log_map_7:
            entry = log_map_7[curr_date]
            # Calculate macros for the day
            p, c, f = 0, 0, 0
            if entry.food_items:
                for item in entry.food_items:
                    p += item.get("protein", 0)
                    c += item.get("carbs", 0)
                    f += item.get("fat", 0)
                    
            history_list.append({
                "date": curr_date.isoformat(),
                "total_kcal": int(entry.total_kcal or 0),
                "protein": round(p, 1),
                "carbs": round(c, 1),
                "fat": round(f, 1),
                "steps": int(entry.steps or 0),
                "weight": entry.weight
            })
        else:
            history_list.append({
                "date": curr_date.isoformat(),
                "total_kcal": 0,
                "protein": 0,
                "carbs": 0,
                "fat": 0,
                "steps": 0,
                "weight": None
            })

    # 3. Get 30-day weight history (progressive)
    start_date_30 = today_dt - timedelta(days=29)
    logs_30 = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date_30,
        DailyLog.date <= today_dt
    ).order_by(DailyLog.date.asc()).all()
    
    weight_map_30 = {l.date.isoformat(): l.weight for l in logs_30 if l.weight is not None}
    
    # Baseline weight: check for weight before window
    prev_log = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date < start_date_30,
        DailyLog.weight != None
    ).order_by(DailyLog.date.desc()).first()
    
    chart_val = prev_log.weight if prev_log else None
    first_weight_found = (chart_val is not None)

    weight_history = []
    for i in range(30):
        curr_date = start_date_30 + timedelta(days=i)
        curr_iso = curr_date.isoformat()
        actual = weight_map_30.get(curr_iso)
        
        if actual is not None:
            chart_val = actual
            first_weight_found = True
        
        weight_history.append({
            "date": curr_iso,
            "weight": float(chart_val) if first_weight_found else None,
            "is_actual": actual is not None
        })

    # 4. Feedback & Insights
    profile = current_user.profile

    # Robust summary fallback
    raw_summary = log.ai_summary
    if not raw_summary or raw_summary in ["null", "None", "No feedback yet.", "Click 'Generate' for your daily AI coaching!"]:
        display_summary = "Your AI Coach is analyzing your progress..."
    else:
        display_summary = raw_summary

    feedback = {
        "summary": display_summary,
        "insights": [],
        "status": "on_track"
    }

    # Generate hints (insights)
    target_kcal = (profile.target_kcal if profile else 2000) or 2000
    if log.total_kcal < target_kcal * 0.8:
        feedback["insights"].append("Your body needs fuel to keep crushing those goals! Make sure you're getting enough energy today.")
    elif log.total_kcal > target_kcal * 1.1:
        feedback["insights"].append("Let's stay mindful of our choices—every small decision brings you closer to your target.")
        feedback["status"] = "needs_attention"
    else:
        feedback["insights"].append("Your nutrition is spot on! Keep fueling your success with balanced choices.")

    target_steps = (profile.target_steps if profile else 10000) or 10000
    if log.steps < target_steps * 0.3:
        feedback["insights"].append("Every step counts! How about a quick 5-minute walk to get that energy flowing?")
        feedback["status"] = "needs_attention"
    elif log.steps > target_steps:
        feedback["insights"].append("Incredible activity level today! Keep that momentum—you're absolutely crushing it!")
    else:
        feedback["insights"].append("Good steady movement today. Keep those steps coming to maintain your energy levels.")

    if log.water_ml < 1500:
        feedback["insights"].append("Don't forget to hydrate! A glass of water is a simple win for your body right now.")
    else:
        feedback["insights"].append("Excellent hydration! You're keeping your body primed for peak performance.")

    # 5. Build Final Response
    from app.core.calculations import calculate_macros
    macros = calculate_macros(target_kcal, profile.macro_distribution if profile else "balanced")

    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "has_google_sync": current_user.has_google_sync,
            "profile": {
                "name": profile.name if profile else None,
                "weight": profile.weight if profile else None,
                "target_kcal": target_kcal,
                "target_protein": macros["protein"],
                "target_carbs": macros["carbs"],
                "target_fat": macros["fat"],
                "target_steps": profile.target_steps if profile else 10000,
                "objective": profile.objective if profile else "maintain",
                "macro_distribution": profile.macro_distribution if profile else "balanced"
            }
        },
        "today": {
            "date": log.date.isoformat(),
            "steps": int(log.steps or 0),
            "water_ml": int(log.water_ml or 0),
            "weight": log.weight,
            "got_creatine": log.got_creatine,
            "total_kcal": int(log.total_kcal or 0),
            "food_items": log.food_items,
            "ai_summary": log.ai_summary
        },
        "history": history_list,
        "weightHistory": weight_history,
        "feedback": feedback
    }

@router.post("/toggle-creatine")
def toggle_creatine(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today, got_creatine=True)
        db.add(log)
    else:
        log.got_creatine = not log.got_creatine
    
    db.commit()
    db.refresh(log)
    return {"got_creatine": log.got_creatine}

@router.get("/feedback")
def get_daily_feedback(
    hour: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    profile = current_user.profile

    if not log or not profile:
        return {"summary": "Start logging your day!"}

    # Generate insights for the response
    target_kcal = (profile.target_kcal if profile else 2000) or 2000
    insights = []
    status = "on_track"

    if log.total_kcal < target_kcal * 0.8:
        insights.append("Your body needs fuel to keep crushing those goals! Make sure you're getting enough energy today.")
    elif log.total_kcal > target_kcal * 1.1:
        insights.append("Let's stay mindful of our choices—every small decision brings you closer to your target.")
        status = "needs_attention"
    else:
        insights.append("Your nutrition is spot on! Keep fueling your success with balanced choices.")

    target_steps = (profile.target_steps if profile else 10000) or 10000
    if log.steps < target_steps * 0.3:
        insights.append("Every step counts! How about a quick 5-minute walk to get that energy flowing?")
        status = "needs_attention"
    elif log.steps > target_steps:
        insights.append("Incredible activity level today! Keep that momentum—you're absolutely crushing it!")
    else:
        insights.append("Good steady movement today. Keep those steps coming to maintain your energy levels.")

    if log.water_ml < 1500:
        insights.append("Don't forget to hydrate! A glass of water is a simple win for your body right now.")
    else:
        insights.append("Excellent hydration! You're keeping your body primed for peak performance.")

    if not log.got_creatine:
        insights.append("Your muscles are waiting for that extra edge—don't forget your daily dose of creatine!")

    time_context = "today"
    if hour is not None:
        if 5 <= hour < 12: time_context = "this morning"
        elif 12 <= hour < 17: time_context = "this afternoon"
        elif 17 <= hour < 21: time_context = "this evening"
        else: time_context = "tonight"

    user_name = profile.name or "Athlete"
    raw_data = f"Calories: {log.total_kcal}/{target_kcal}, Steps: {log.steps}. Goal: {profile.objective}."

    from app.services.ai_chat import get_chat_service
    chat_service = get_chat_service()

    prompt = f"It is {time_context}. Give a short, high-energy coaching tip to {user_name}. Data: {raw_data}. Max 2 sentences."
    ai_feedback = chat_service.generate_response(prompt, {"name": user_name, "objective": profile.objective})

    log.ai_summary = ai_feedback
    db.commit()
    return {"summary": ai_feedback, "insights": insights, "status": status}

class FoodItemUpdate(BaseModel):
    label: str
    grams: int
    kcal: int
    protein: Optional[float] = 0
    carbs: Optional[float] = 0
    fat: Optional[float] = 0
    fiber: Optional[float] = 0
    salt: Optional[float] = 0
    type: Optional[str] = "Lunch"

@router.put("/food-item")
def update_food_item(
    logged_at: str,
    request: FoodItemUpdate,
    date_str: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = date.fromisoformat(date_str) if date_str else date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == target_date).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    current_items = list(log.food_items) if log.food_items else []
    
    # Find the item to update
    item_idx = next((i for i, item in enumerate(current_items) if item.get("logged_at") == logged_at), -1)
    
    if item_idx == -1:
        raise HTTPException(status_code=404, detail="Food item not found")
    
    old_kcal = int(current_items[item_idx].get("kcal", 0))
    
    # Update the item
    current_items[item_idx].update({
        "label": request.label,
        "grams": request.grams,
        "kcal": request.kcal,
        "protein": request.protein,
        "carbs": request.carbs,
        "fat": request.fat,
        "fiber": request.fiber,
        "salt": request.salt,
        "type": request.type
    })
    
    log.food_items = current_items
    flag_modified(log, "food_items")
    log.total_kcal = max(0, log.total_kcal - old_kcal + request.kcal)
    
    db.commit()
    db.refresh(log)
    return {"message": "Item updated", "total_kcal": log.total_kcal, "item": current_items[item_idx]}

@router.delete("/food-item")
def delete_food_item(
    logged_at: str,
    date_str: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = date.fromisoformat(date_str) if date_str else date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == target_date).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    current_items = list(log.food_items) if log.food_items else []
    
    # Find the item to remove
    item_to_remove = next((item for item in current_items if item.get("logged_at") == logged_at), None)
    
    if not item_to_remove:
        raise HTTPException(status_code=404, detail="Food item not found")
    
    # Remove item and update calories
    current_items.remove(item_to_remove)
    log.food_items = current_items
    log.total_kcal = max(0, log.total_kcal - int(item_to_remove.get("kcal", 0)))
    
    db.commit()
    db.refresh(log)
    return {"message": "Item deleted", "total_kcal": log.total_kcal}

@router.put("/steps")
def update_steps(steps: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log: log = DailyLog(user_id=current_user.id, date=today, steps=steps); db.add(log)
    else: log.steps = steps
    db.commit(); return log

@router.put("/water")
def update_water(water_ml: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log: log = DailyLog(user_id=current_user.id, date=today, water_ml=water_ml); db.add(log)
    else: log.water_ml = water_ml
    db.commit(); return log

@router.put("/add-water")
def add_water(water_ml: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log: log = DailyLog(user_id=current_user.id, date=today, water_ml=water_ml); db.add(log)
    else: log.water_ml += water_ml
    db.commit(); return log

@router.put("/weight")
def update_weight(weight: float, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log: log = DailyLog(user_id=current_user.id, date=today, weight=weight); db.add(log)
    else: log.weight = weight
    if current_user.profile:
        current_user.profile.weight = weight
        from app.core.calculations import calculate_target_kcal_logic
        current_user.profile.target_kcal = calculate_target_kcal_logic(
            current_user.profile.age, current_user.profile.gender, weight, current_user.profile.height, current_user.profile.activity_level, current_user.profile.objective, current_user.profile.cut_intensity, current_user.profile.manual_target_kcal
        )
    db.commit(); return log

@router.post("/google-store-code")
def google_store_code(request: GoogleStoreCodeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    url = "https://oauth2.googleapis.com/token"
    data = {"code": request.code, "client_id": os.getenv("GOOGLE_CLIENT_ID"), "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"), "redirect_uri": "postmessage", "grant_type": "authorization_code"}
    response = requests.post(url, data=data)
    if response.status_code != 200: raise HTTPException(status_code=response.status_code, detail=response.text)
    tokens = response.json(); refresh_token = tokens.get("refresh_token")
    if refresh_token: current_user.google_refresh_token = refresh_token; db.commit()
    return {"status": "success"}

@router.post("/sync-google-fit")
def sync_google_fit(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: GoogleSyncRequest = None):
    access_token = None
    if current_user.google_refresh_token:
        r = requests.post("https://oauth2.googleapis.com/token", data={"client_id": os.getenv("GOOGLE_CLIENT_ID"), "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"), "refresh_token": current_user.google_refresh_token, "grant_type": "refresh_token"})
        if r.status_code == 200: 
            access_token = r.json().get("access_token")
        else:
            print(f"DEBUG: Failed to refresh token for {current_user.email}: {r.status_code} - {r.text}")
            # If token is invalid/expired, clear it so user can re-sync
            if r.status_code == 400:
                try:
                    error_data = r.json()
                    if error_data.get("error") == "invalid_grant":
                        print(f"DEBUG: Clearing expired/revoked token for {current_user.email}")
                        current_user.google_refresh_token = None
                        db.commit()
                except Exception as e:
                    print(f"DEBUG: Error parsing token error response: {e}")
    
    if not access_token: 
        print(f"DEBUG: No access token available for Google Fit sync ({current_user.email})")
        raise HTTPException(status_code=403, detail="Google Fit connection expired or invalid. Please reconnect.")
        
    now = datetime.datetime.now(); start = datetime.datetime(now.year, now.month, now.day); end = start + datetime.timedelta(days=1)
    url = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"
    body = {"aggregateBy": [{"dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"}, {"dataTypeName": "com.google.weight"}], "bucketByTime": {"durationMillis": 86400000}, "startTimeMillis": int(start.timestamp()*1000), "endTimeMillis": int(end.timestamp()*1000)}
    
    print(f"DEBUG: Syncing Google Fit for {current_user.email} between {start} and {end}")
    res = requests.post(url, json=body, headers={"Authorization": f"Bearer {access_token}"})
    
    if res.status_code == 200:
        d = res.json(); steps = 0; weight = None
        for b in d.get("bucket", []):
            for ds in b.get("dataset", []):
                for p in ds.get("point", []):
                    for v in p.get("value", []):
                        if "step_count" in ds.get("dataSourceId", ""): 
                            val = v.get("intVal", 0)
                            steps += val
                        else: 
                            weight = v.get("fpVal")
        
        today_date = date.today()
        l = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today_date).first()
        if not l: 
            l = DailyLog(user_id=current_user.id, date=today_date, steps=steps, weight=weight)
            db.add(l)
            print(f"DEBUG: Created new DailyLog for {today_date} with {steps} steps")
        else: 
            l.steps = steps
            if weight: l.weight = weight
            print(f"DEBUG: Updated DailyLog for {today_date} to {steps} steps")
            
        db.commit(); return {"steps": steps, "weight": weight}
    
    print(f"DEBUG: Google Fit API error: {res.status_code} - {res.text}")
    if res.status_code == 403:
        print(f"DEBUG: Clearing insufficient scopes token for {current_user.email}")
        current_user.google_refresh_token = None
        db.commit()
        raise HTTPException(status_code=403, detail="Google Fit permissions insufficient. Please reconnect.")
    raise HTTPException(status_code=500, detail="Failed to sync with Google Fit.")


