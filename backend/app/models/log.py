from sqlalchemy import Column, Integer, Float, ForeignKey, Date, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import date

class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    date = Column(Date, default=date.today, index=True)
    
    steps = Column(Integer, default=0)
    water_ml = Column(Integer, default=0)
    weight = Column(Float, nullable=True)
    
    # Store food items: [{"label": "pizza", "kcal": 266, "grams": 100, "type": "Lunch", "protein": 10, "carbs": 30, "fat": 12}, ...]
    food_items = Column(JSON, default=list)
    total_kcal = Column(Integer, default=0)
    ai_summary = Column(String, nullable=True)

    user = relationship("User", back_populates="logs")
