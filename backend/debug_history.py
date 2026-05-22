from app.db.session import SessionLocal
from app.models.log import DailyLog
from app.models.user import User
from app.models.chat import ChatMessage
from app.models.workout import WorkoutSession, WorkoutExercise
from datetime import date, timedelta

def check_recent_history():
    db = SessionLocal()
    today = date.today()
    three_days_ago = today - timedelta(days=3)
    
    print(f"Checking logs since: {three_days_ago}")
    logs = db.query(DailyLog).filter(DailyLog.date >= three_days_ago).all()
    
    if not logs:
        print("No logs found for the last 3 days.")
        return

    for log in logs:
        print(f"Date: {log.date} | User: {log.user_id}")
        print(f"  Kcal: {log.total_kcal}")
        print(f"  Steps: {log.steps}")
        print(f"  Water: {log.water_ml}ml")
        print("-" * 20)
    db.close()

if __name__ == "__main__":
    check_recent_history()
