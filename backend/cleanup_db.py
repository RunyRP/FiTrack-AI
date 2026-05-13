from sqlalchemy.orm import Session
from app.db.session import SessionLocal
import app.models.user
import app.models.log
import app.models.chat
import app.models.workout

def cleanup_persona_messages():
    db = SessionLocal()
    try:
        logs = db.query(app.models.log.DailyLog).all()
        count = 0
        for log in logs:
            if log.ai_summary:
                # Identify persona-style messages
                is_persona = False
                if any(x in log.ai_summary for x in ["Ronnie!", "Ronnie,", "Dear", "Coach", "Coach John", "session is all about you", "journey"]):
                    is_persona = True
                
                if is_persona:
                    log.ai_summary = "Your AI Coach is preparing your feedback..."
                    count += 1
                    print(f"Resetting log for {log.date} | User {log.user_id}")
        
        db.commit()
        print(f"Successfully cleaned up {count} logs.")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_persona_messages()
