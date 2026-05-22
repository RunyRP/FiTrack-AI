from app.db.session import SessionLocal
from app.models.log import DailyLog
from app.models.user import User
from app.models.chat import ChatMessage
from app.models.workout import WorkoutSession, WorkoutExercise
from datetime import date

def seed_performance():
    db = SessionLocal()
    # Monday: 2026-05-18
    # Tuesday: 2026-05-19
    dates_to_update = [date(2026, 5, 18), date(2026, 5, 19)]
    
    for d in dates_to_update:
        log = db.query(DailyLog).filter(DailyLog.user_id == 1, DailyLog.date == d).first()
        if log:
            print(f"Updating log for {d}...")
            log.total_kcal = 1400  # Exactly target
            log.steps = 10000      # Exactly target
            log.water_ml = 3000   # Exactly target
        else:
            print(f"Creating missing log for {d}...")
            log = DailyLog(user_id=1, date=d, total_kcal=1400, steps=10000, water_ml=3000, food_items=[])
            db.add(log)
    
    db.commit()
    print("Historical performance updated.")
    db.close()

if __name__ == "__main__":
    seed_performance()
