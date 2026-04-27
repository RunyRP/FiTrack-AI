from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.log import DailyLog
from datetime import date

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

@router.get("/history")
def get_log_history(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import datetime
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=days-1)
    
    # Fetch existing logs in range
    existing_logs = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date,
        DailyLog.date <= end_date
    ).all()
    
    # Map by date for easy lookup
    log_map = {log.date: log for log in existing_logs}
    
    # Create complete list including missing days
    history = []
    for i in range(days):
        current_date = start_date + datetime.timedelta(days=i)
        if current_date in log_map:
            history.append(log_map[current_date])
        else:
            # Return empty log object for missing days
            history.append({
                "date": current_date,
                "total_kcal": 0,
                "steps": 0,
                "water_ml": 0,
                "food_items": []
            })
            
    return history

@router.put("/steps")
def update_steps(
    steps: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today)
        db.add(log)
    
    log.steps = steps
    db.commit()
    db.refresh(log)
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
        log = DailyLog(user_id=current_user.id, date=today)
        db.add(log)
    
    log.water_ml = water_ml
    db.commit()
    db.refresh(log)
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
        log = DailyLog(user_id=current_user.id, date=today)
        db.add(log)
    
    log.weight = weight
    db.commit()
    db.refresh(log)
    return log

@router.get("/dashboard-data")
def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # This single endpoint replaces 4 calls
    today = date.today()
    
    # 1. Get today's log
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today, food_items=[], total_kcal=0, steps=0, water_ml=0)
        db.add(log)
        db.commit()
        db.refresh(log)
    
    # 2. Get history
    import datetime
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=6)
    existing_logs = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date,
        DailyLog.date <= end_date
    ).all()
    
    log_map = {l.date: l for l in existing_logs}
    history = []
    for i in range(7):
        curr_date = start_date + datetime.timedelta(days=i)
        if curr_date in log_map:
            history.append(log_map[curr_date])
        else:
            history.append({"date": curr_date, "total_kcal": 0, "steps": 0, "water_ml": 0, "weight": None, "food_items": []})

    # 3. Get Feedback (Only generate if needed or requested, or just return basic insights for speed)
    # To keep dashboard fast, we return the insights immediately and generate the AI summary only if it doesn't exist for today.
    feedback = {
        "summary": "Your AI Coach is analyzing your progress...",
        "insights": [],
        "status": "on_track"
    }
    
    # Calculate insights immediately (very fast)
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
    
    # For now, we'll return a faster response. The user can click 'Refresh' or we can fetch AI feedback separately.
    # To truly fix the lag, I'll provide the data first.
    return {
        "user": current_user,
        "today": log,
        "history": history,
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
    
    return {
        "summary": ai_feedback,
        "insights": insights,
        "status": "on_track" if log.steps >= 8000 and abs(log.total_kcal - target_kcal) < 300 else "needs_work"
    }
