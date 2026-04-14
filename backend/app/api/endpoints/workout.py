from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.machinery import Machinery
from app.core.auth import get_current_user
from app.models.user import User
from typing import List

router = APIRouter()

@router.get("/machinery")
def get_all_machinery(db: Session = Depends(get_db)):
    return db.query(Machinery).all()

@router.get("/suggest")
def suggest_workouts(
    machine_ids: List[int] = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch machines matching the provided IDs
    machines = db.query(Machinery).filter(Machinery.id.in_(machine_ids)).all()
    
    # Get user objective
    objective = current_user.profile.objective if current_user.profile else "maintain"
    
    # Define goal-specific logic
    # lose_weight: higher reps (12-15), moderate rest
    # gain_muscle: moderate reps (8-12), emphasis on heavy-ish weights
    # maintain: moderate reps (10-12)
    
    goal_params = {
        "lose_weight": {"reps": "12-15", "sets": "3-4", "rest": "60s", "focus": "Calorie burn & endurance"},
        "gain_muscle": {"reps": "8-12", "sets": "4-5", "rest": "90s", "focus": "Hypertrophy & strength"},
        "maintain": {"reps": "10-12", "sets": "3", "rest": "60s", "focus": "General fitness & tone"}
    }
    
    params = goal_params.get(objective, goal_params["maintain"])
    
    suggestions = []
    for machine in machines:
        # Exercises are stored in JSON as a list of dicts: [{"name": "...", "muscles": [...]}]
        for exercise in machine.exercises:
            suggestions.append({
                "machine_id": machine.id,
                "machine_name": machine.name,
                "exercise_name": exercise["name"],
                "muscles": exercise["muscles"],
                "reps": params["reps"],
                "sets": params["sets"],
                "rest": params["rest"],
                "focus": params["focus"]
            })
            
    return {
        "objective": objective,
        "parameters": params,
        "suggestions": suggestions
    }
