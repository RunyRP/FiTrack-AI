from sqlalchemy import Column, Integer, String, JSON
from app.db.session import Base

class Machinery(Base):
    __tablename__ = "machinery"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    image_url = Column(String, nullable=True)
    
    # List of exercises that can be performed with this machine
    # e.g., [{"name": "Leg Extension", "muscles": ["Quads"]}, ...]
    exercises = Column(JSON, default=list)
