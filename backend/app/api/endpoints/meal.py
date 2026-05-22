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
    fiber: Optional[float] = 0
    salt: Optional[float] = 0
    type: Optional[str] = "Lunch"
    ingredients: Optional[List[dict]] = None

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

from app.models.meal import CustomMeal
from sqlalchemy import or_, func

class CustomMealCreate(BaseModel):
    label: str
    kcal_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    fiber_per_100g: Optional[float] = 0.0
    salt_per_100g: Optional[float] = 0.0
    is_whole_meal: Optional[bool] = False
    default_grams: Optional[float] = 100.0
    is_quantifiable: Optional[bool] = False
    unit_name: Optional[str] = None
    ingredients: Optional[List[dict]] = None

@router.get("/custom")
def get_custom_meals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(CustomMeal).filter(CustomMeal.user_id == current_user.id).all()

@router.post("/custom")
def create_custom_meal(
    request: CustomMealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(CustomMeal).filter(
        CustomMeal.user_id == current_user.id,
        func.lower(CustomMeal.label) == request.label.lower()
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="An item with this name already exists in your library.")

    new_meal = CustomMeal(
        user_id=current_user.id,
        label=request.label,
        kcal_per_100g=request.kcal_per_100g,
        protein_per_100g=request.protein_per_100g,
        carbs_per_100g=request.carbs_per_100g,
        fat_per_100g=request.fat_per_100g,
        fiber_per_100g=request.fiber_per_100g,
        salt_per_100g=request.salt_per_100g,
        is_whole_meal=request.is_whole_meal,
        default_grams=request.default_grams,
        is_quantifiable=request.is_quantifiable,
        unit_name=request.unit_name,
        ingredients=request.ingredients
    )
    db.add(new_meal)
    db.commit()
    db.refresh(new_meal)
    return new_meal

@router.delete("/custom/{meal_id}")
def delete_custom_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meal = db.query(CustomMeal).filter(
        CustomMeal.id == meal_id,
        CustomMeal.user_id == current_user.id
    ).first()

    if not meal:
        raise HTTPException(status_code=404, detail="Custom meal not found")

    db.delete(meal)
    db.commit()
    return {"status": "ok"}

@router.put("/custom/{meal_id}")
def update_custom_meal(
    meal_id: int,
    request: CustomMealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meal = db.query(CustomMeal).filter(
        CustomMeal.id == meal_id,
        CustomMeal.user_id == current_user.id
    ).first()

    if not meal:
        raise HTTPException(status_code=404, detail="Custom meal not found")

    existing = db.query(CustomMeal).filter(
        CustomMeal.user_id == current_user.id,
        func.lower(CustomMeal.label) == request.label.lower(),
        CustomMeal.id != meal_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="An item with this name already exists in your library.")        
    meal.label = request.label
    meal.kcal_per_100g = request.kcal_per_100g
    meal.protein_per_100g = request.protein_per_100g
    meal.carbs_per_100g = request.carbs_per_100g
    meal.fat_per_100g = request.fat_per_100g
    meal.fiber_per_100g = request.fiber_per_100g
    meal.salt_per_100g = request.salt_per_100g
    meal.is_whole_meal = request.is_whole_meal
    meal.default_grams = request.default_grams
    meal.is_quantifiable = request.is_quantifiable
    meal.unit_name = request.unit_name
    meal.ingredients = request.ingredients
    
    db.commit()
    db.refresh(meal)
    return meal

@router.get("/search")
def search_meal_items(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.ai_meal import search_food
    
    # 1. Search in AI service (CLIP based or internal list)
    results = search_food(q)
    
    # 2. Search in user's custom meals
    custom_matches = db.query(CustomMeal).filter(
        CustomMeal.user_id == current_user.id,
        CustomMeal.label.ilike(f"%{q}%")
    ).all()
    
    # Convert custom matches to the same format
    for cm in custom_matches:
        # Scale to default_grams for consistency
        is_whole = bool(cm.is_whole_meal)
        def_g = cm.default_grams or 100.0
        ratio = (def_g / 100.0) if not is_whole else 1.0
        
        # For whole meals, cm.kcal_per_100g is actually total kcal.
        # We need to provide a correct per-100g base for the frontend to scale correctly.
        base_ratio = 1.0 if not is_whole else (def_g / 100.0)
        
        results.insert(0, {
            "label": cm.label,
            "kcal": int(cm.kcal_per_100g * ratio),
            "protein": cm.protein_per_100g * ratio,
            "carbs": cm.carbs_per_100g * ratio,
            "fat": cm.fat_per_100g * ratio,
            "fiber": cm.fiber_per_100g * ratio,
            "salt": cm.salt_per_100g * ratio,
            "grams": def_g,
            "default_grams": def_g,
            "is_custom": True,
            "is_whole_meal": is_whole,
            "is_quantifiable": cm.is_quantifiable,
            "unit_name": cm.unit_name,
            "portion_note": "Custom",
            # Base values for accurate recalculation
            "kcal_100g": cm.kcal_per_100g / base_ratio,
            "protein_100g": cm.protein_per_100g / base_ratio,
            "carbs_100g": cm.carbs_per_100g / base_ratio,
            "fat_100g": cm.fat_per_100g / base_ratio,
            "fiber_100g": cm.fiber_per_100g / base_ratio,
            "salt_100g": cm.salt_per_100g / base_ratio,
            "ingredients": cm.ingredients
        })
        
    return {"results": results}

@router.post("/log")
def log_meal(
    request: MealLogRequest,
    date_str: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = date.fromisoformat(date_str) if date_str else date.today()
    log = db.query(DailyLog).filter(DailyLog.user_id == current_user.id, DailyLog.date == target_date).first()
    
    if not log:
        log = DailyLog(user_id=current_user.id, date=target_date, food_items=[], total_kcal=0)
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
        "fiber": request.fiber,
        "salt": request.salt,
        "type": request.type,
        "ingredients": request.ingredients,
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
