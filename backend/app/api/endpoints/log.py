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
    history_list = []
    for i in range(7):
        curr_date = start_date_7 + timedelta(days=i)
        if curr_date in log_map_7:
            entry = log_map_7[curr_date]
            history_list.append({
                "date": curr_date.isoformat(),
                "total_kcal": int(entry.total_kcal or 0),
                "steps": int(entry.steps or 0),
                "weight": entry.weight
            })
        else:
            history_list.append({
                "date": curr_date.isoformat(),
                "total_kcal": 0,
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
    
    # Baseline weight for chart
    last_weight = 70.0
    if current_user.profile and current_user.profile.weight:
        last_weight = current_user.profile.weight
    
    # Check for weight before window
    prev_log = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date < start_date_30,
        DailyLog.weight != None
    ).order_by(DailyLog.date.desc()).first()
    if prev_log:
        last_weight = prev_log.weight

    weight_history = []
    chart_val = last_weight
    for i in range(30):
        curr_date = start_date_30 + timedelta(days=i)
        curr_iso = curr_date.isoformat()
        actual = weight_map_30.get(curr_iso)
        if actual is not None:
            chart_val = actual
        weight_history.append({
            "date": curr_iso,
            "weight": float(chart_val),
            "is_actual": actual is not None
        })

    # 4. Feedback & Insights
    profile = current_user.profile
    feedback = {
        "summary": getattr(log, 'ai_summary', "Your AI Coach is analyzing your progress..."),
        "insights": [],
        "status": "on_track"
    }
    
    target_kcal = (profile.target_kcal if profile else 2000) or 2000
    if log.total_kcal < target_kcal * 0.8:
        feedback["insights"].append(f"Calories are low.")
    
    # 5. Build Final Response
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
            "steps": int(log.steps or 0),
            "water_ml": int(log.water_ml or 0),
            "weight": log.weight,
            "total_kcal": int(log.total_kcal or 0),
            "food_items": log.food_items,
            "ai_summary": log.ai_summary
        },
        "history": history_list,
        "weightHistory": weight_history,
        "feedback": feedback
    }

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
    
    time_context = "today"
    if hour is not None:
        if 5 <= hour < 12: time_context = "this morning"
        elif 12 <= hour < 17: time_context = "this afternoon"
        elif 17 <= hour < 21: time_context = "this evening"
        else: time_context = "tonight"

    target_kcal = profile.target_kcal or 2000
    user_name = profile.name or "Athlete"
    raw_data = f"Calories: {log.total_kcal}/{target_kcal}, Steps: {log.steps}. Goal: {profile.objective}."
    
    from app.services.ai_chat import get_chat_service
    chat_service = get_chat_service()
    
    prompt = f"It is {time_context}. Give a short, high-energy coaching tip to {user_name}. Data: {raw_data}. Max 2 sentences."
    ai_feedback = chat_service.generate_response(prompt, {"name": user_name, "objective": profile.objective})
    
    log.ai_summary = ai_feedback
    db.commit()
    return {"summary": ai_feedback, "insights": [], "status": "on_track"}

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
        if r.status_code == 200: access_token = r.json().get("access_token")
    if not access_token: raise HTTPException(status_code=403)
    now = datetime.datetime.now(); start = datetime.datetime(now.year, now.month, now.day); end = start + datetime.timedelta(days=1)
    url = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"
    body = {"aggregateBy": [{"dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"}, {"dataTypeName": "com.google.weight"}], "bucketByTime": {"durationMillis": 86400000}, "startTimeMillis": int(start.timestamp()*1000), "endTimeMillis": int(end.timestamp()*1000)}
    res = requests.post(url, json=body, headers={"Authorization": f"Bearer {access_token}"})
    if res.status_code == 200:
        d = res.json(); steps = 0; weight = None
        for b in d.get("bucket", []):
            for ds in b.get("dataset", []):
                for p in ds.get("point", []):
                    for v in p.get("value", []):
                        if "step_count" in ds.get("dataSourceId", ""): steps += v.get("intVal", 0)
                        else: weight = v.get("fpVal")
        today_date = date.today()
        l = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today_date).first()
        if not l: l = DailyLog(user_id=current_user.id, date=today_date, steps=steps, weight=weight); db.add(l)
        else: l.steps = steps; 
        if weight: l.weight = weight
        db.commit(); return {"steps": steps, "weight": weight}
    return {"status": "error"}
