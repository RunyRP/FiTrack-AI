from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.services.ai_meal import get_ai_service
from app.core.auth import get_current_user
from app.models.user import User
from app.models.log import DailyLog
from datetime import date, datetime
from typing import List, Optional

router = APIRouter()

class MealLogRequest(BaseModel):
    label: str
    grams: int
    kcal: int
    protein: Optional[float] = 0
    carbs: Optional[float] = 0
    fat: Optional[float] = 0
    type: Optional[str] = "Lunch"

@router.post("/analyze")
async def analyze_meal(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    from app.services.ai_meal import get_ai_service
    contents = await file.read()
    ai_service = get_ai_service()
    analysis = ai_service.analyze_image(contents)

    if not analysis:
        return {"message": "No food detected", "results": []}

    return {"results": analysis}

@router.get("/search")
def search_meal_items(
    q: str,
    current_user: User = Depends(get_current_user)
):
    from app.services.ai_meal import search_food
    results = search_food(q)
    return {"results": results}

@router.post("/log")
def log_meal(
    request: MealLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == today).first()
    
    if not log:
        log = DailyLog(user_id=current_user.id, date=today, food_items=[], total_kcal=0)
        db.add(log)
        db.flush()
    
    # Add the manually confirmed item with macros
    new_item = {
        "label": request.label,
        "grams": request.grams,
        "kcal": request.kcal,
        "protein": request.protein,
        "carbs": request.carbs,
        "fat": request.fat,
        "type": request.type,
        "logged_at": str(datetime.now())
    }
    
    # Standard way to update JSON in SQLAlchemy
    current_items = list(log.food_items) if log.food_items else []
    current_items.append(new_item)
    log.food_items = current_items
    
    log.total_kcal += request.kcal
    
    db.commit()
    db.refresh(log)
    
    return {"message": "Meal logged successfully", "current_log": log}
