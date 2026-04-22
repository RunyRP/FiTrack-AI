from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.machinery import Machinery

def seed_machinery():
    db = SessionLocal()
    
    # Check if already seeded
    # We'll update instead of just checking if empty to add image URLs
    
    machinery_data = [
        {
            "name": "Leg Extension Machine",
            "description": "Isolates the quadriceps muscles.",
            "image_url": "https://images.unsplash.com/photo-1591504770183-49033327663f?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Leg Extension", "muscles": ["Quads"]}]
        },
        {
            "name": "Chest Press Machine",
            "description": "Targeting the pectoral muscles, shoulders, and triceps.",
            "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Machine Chest Press", "muscles": ["Chest", "Shoulders", "Triceps"]}]
        },
        {
            "name": "Lat Pulldown Machine",
            "description": "Exercises the latissimus dorsi muscles.",
            "image_url": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Wide Grip Lat Pulldown", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Seated Row Machine",
            "description": "Targets the middle back and lats.",
            "image_url": "https://images.unsplash.com/photo-1594737625785-a6907409f583?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Seated Cable Row", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Leg Press Machine",
            "description": "Targets the quads, hamstrings, and glutes.",
            "image_url": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Leg Press", "muscles": ["Quads", "Glutes", "Hamstrings"]}]
        },
        {
            "name": "Shoulder Press Machine",
            "description": "Isolates the deltoid muscles.",
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Overhead Press", "muscles": ["Shoulders", "Triceps"]}]
        },
        {
            "name": "Bicep Curl Machine",
            "description": "Isolates the biceps brachii.",
            "image_url": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Machine Bicep Curl", "muscles": ["Biceps"]}]
        },
        {
            "name": "Tricep Extension Machine",
            "description": "Isolates the triceps muscles.",
            "image_url": "https://images.unsplash.com/photo-1590239062391-9e79435b2e65?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Machine Tricep Extension", "muscles": ["Triceps"]}]
        }
    ]

    for machine_data in machinery_data:
        existing = db.query(Machinery).filter(Machinery.name == machine_data["name"]).first()
        if existing:
            existing.image_url = machine_data["image_url"]
            existing.description = machine_data["description"]
            existing.exercises = machine_data["exercises"]
        else:
            machine = Machinery(**machine_data)
            db.add(machine)
    
    db.commit()
    db.close()
    print("Machinery seeded and updated successfully")

if __name__ == "__main__":
    # Ensure tables are created first
    # Note: If database already exists, create_all won't modify existing tables.
    # But since we added image_url, users might need to drop fittrack.db if it fails.
    # For now we assume the SQLAlchemy models handle the session properly.
    Base.metadata.create_all(bind=engine)
    seed_machinery()
