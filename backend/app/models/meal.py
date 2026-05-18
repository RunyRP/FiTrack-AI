from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, JSON
from app.db.session import Base

class CustomMeal(Base):
    __tablename__ = "custom_meals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    label = Column(String, index=True, nullable=False)
    
    # Nutritional info per 100g (or total if is_whole_meal is True)
    kcal_per_100g = Column(Float, default=0.0)
    protein_per_100g = Column(Float, default=0.0)
    carbs_per_100g = Column(Float, default=0.0)
    fat_per_100g = Column(Float, default=0.0)
    fiber_per_100g = Column(Float, default=0.0)
    salt_per_100g = Column(Float, default=0.0)

    # New fields for "Whole Meal" support
    is_whole_meal = Column(Boolean, default=False)
    default_grams = Column(Float, default=100.0)
    
    # Unit-based tracking
    is_quantifiable = Column(Boolean, default=False)
    unit_name = Column(String, nullable=True) # e.g. "slice", "cake", "piece"
    
    # List of ingredients for composed meals
    # e.g., [{"food_id": 1, "label": "Egg", "grams": 50, "kcal": 140, ...}, ...]
    ingredients = Column(JSON, nullable=True)
