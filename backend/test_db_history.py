
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.log import DailyLog
from datetime import date, timedelta
import os

# Create engine and session
DB_PATH = os.path.join(os.getcwd(), "fittrack_v2.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_logic(user_id):
    db = SessionLocal()
    try:
        days = 30
        start_date = date.today() - timedelta(days=days - 1)
        print(f"--- Testing for User ID: {user_id} ---")
        print(f"Today: {date.today()}")
        print(f"Start Date: {start_date}")
        
        logs = db.query(DailyLog).filter(
            DailyLog.user_id == user_id,
            DailyLog.date >= start_date
        ).order_by(DailyLog.date.desc()).all()
        
        print(f"Found {len(logs)} logs.")
        for log in logs:
            print(f"Log Date: {log.date}, Kcal: {log.total_kcal}")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_logic(1)
    test_logic(3)
