from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.machinery import Machinery
from typing import List

router = APIRouter()

@router.get("/machinery")
def get_all_machinery(db: Session = Depends(get_db)):
    return db.query(Machinery).all()

@router.get("/suggest")
def suggest_workouts(
    machine_ids: List[int] = Query(...),
    db: Session = Depends(get_db)
):
    machines = db.query(Machinery).filter(Machinery.id.in_(machine_ids)).all()
    
    suggestions = []
    for machine in machines:
        for exercise in machine.exercises:
            suggestions.append({
                "machine_name": machine.name,
                "exercise_name": exercise["name"],
                "muscles": exercise["muscles"]
            })
            
    return suggestions
