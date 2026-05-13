from sqlalchemy.orm import Session
from app.db.session import SessionLocal
import app.models.user
import app.models.log
import app.models.chat
import app.models.workout

def inspect_logs():
    db = SessionLocal()
    try:
        logs = db.query(app.models.log.DailyLog).all()
        for log in logs:
            if log.ai_summary:
                print(f"DATE: {log.date} | USER: {log.user_id}")
                print(f"SUMMARY: {log.ai_summary}")
                print("-" * 30)
    finally:
        db.close()

if __name__ == "__main__":
    inspect_logs()
