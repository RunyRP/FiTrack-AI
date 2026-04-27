from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.machinery import Machinery

def seed_machinery():
    db = SessionLocal()
    
    # Remove all existing machinery to ensure a clean Technogym-only list
    db.query(Machinery).delete()
    db.commit()
    
    machinery_data = [
        {
            "name": "Technogym Selection Leg Extension",
            "description": "Premium isolation for the quadriceps.",
            "image_url": "https://images.unsplash.com/photo-1591504770183-49033327663f?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Leg Extension", "muscles": ["Quads"]}]
        },
        {
            "name": "Technogym Chest Press",
            "description": "Ergonomic chest training from the Selection line.",
            "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Machine Chest Press", "muscles": ["Chest", "Shoulders", "Triceps"]}]
        },
        {
            "name": "Technogym Lat Pulldown",
            "description": "Standard lat pulldown machine for back development.",
            "image_url": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Wide Grip Lat Pulldown", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Technogym Pure Strength Leg Press",
            "description": "Plate-loaded leg press for heavy lower body training.",
            "image_url": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Leg Press", "muscles": ["Quads", "Glutes", "Hamstrings"]}]
        },
        {
            "name": "Technogym Shoulder Press",
            "description": "Isolation for the deltoids.",
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Machine Overhead Press", "muscles": ["Shoulders", "Triceps"]}]
        },
        {
            "name": "Technogym Dual Adjustable Pulley",
            "description": "Versatile cable station for full body training.",
            "image_url": "https://images.unsplash.com/photo-1541534401786-2077ee4b25e0?q=80&w=800&auto=format&fit=crop",
            "exercises": [
                {"name": "Cable Flyes", "muscles": ["Chest"]},
                {"name": "Cable Rows", "muscles": ["Back"]},
                {"name": "Cable Bicep Curls", "muscles": ["Biceps"]},
                {"name": "Tricep Pushdowns", "muscles": ["Triceps"]}
            ]
        },
        {
            "name": "Technogym Lower Back",
            "description": "Targeted lower back extension.",
            "image_url": "https://images.unsplash.com/photo-1594737625785-a6907409f583?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Machine Back Extension", "muscles": ["Lower Back"]}]
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
    print("Technogym machinery seeded successfully")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    seed_machinery()
