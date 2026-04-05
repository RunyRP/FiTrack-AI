from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.ai_meal import get_ai_service
from app.core.auth import get_current_user
from app.models.user import User
from app.models.log import DailyLog
from datetime import date

router = APIRouter()

@router.post("/analyze")
async def analyze_meal(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contents = await file.read()
    ai_service = get_ai_service()
    analysis = ai_service.analyze_image(contents)
    
    if not analysis:
        return {"message": "No food detected", "results": []}
    
    # Update daily log
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today)
        db.add(log)
    
    # Add first detected item for simplicity in MVP
    top_item = analysis[0]
    if log.food_items is None:
        log.food_items = []
    log.food_items = log.food_items + [top_item]
    log.total_kcal += top_item["kcal"]
    
    db.commit()
    db.refresh(log)
    
    return {"results": analysis, "current_log": log}
