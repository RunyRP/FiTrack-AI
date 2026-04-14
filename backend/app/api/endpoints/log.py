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
