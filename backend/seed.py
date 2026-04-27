from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.machinery import Machinery

def seed_machinery():
    db = SessionLocal()
    
    machinery_data = [
        {
            "name": "Technogym Selection Leg Extension",
            "description": "Premium isolation for the quadriceps.",
            "image_url": "https://www.technogym.com/media/catalog/product/cache/1/image/602f0fa2c1f0d1ba5e241f914e856ff9/l/e/leg_extension_selection_700_hero.jpg",
            "exercises": [{"name": "Leg Extension", "muscles": ["Quads"]}]
        },
        {
            "name": "Technogym Chest Press",
            "description": "Ergonomic chest training from the Selection line.",
            "image_url": "https://www.technogym.com/media/catalog/product/cache/1/image/602f0fa2c1f0d1ba5e241f914e856ff9/c/h/chest_press_selection_700_hero.jpg",
            "exercises": [{"name": "Machine Chest Press", "muscles": ["Chest", "Shoulders", "Triceps"]}]
        },
        {
            "name": "Technogym Lat Pulldown",
            "description": "Standard lat pulldown machine for back development.",
            "image_url": "https://www.technogym.com/media/catalog/product/cache/1/image/602f0fa2c1f0d1ba5e241f914e856ff9/l/a/lat_machine_selection_700_hero.jpg",
            "exercises": [{"name": "Wide Grip Lat Pulldown", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Technogym Pure Strength Leg Press",
            "description": "Plate-loaded leg press for heavy lower body training.",
            "image_url": "https://www.technogym.com/media/catalog/product/cache/1/image/602f0fa2c1f0d1ba5e241f914e856ff9/l/e/leg_press_pure_hero.jpg",
            "exercises": [{"name": "Leg Press", "muscles": ["Quads", "Glutes", "Hamstrings"]}]
        },
        {
            "name": "Technogym Shoulder Press",
            "description": "Isolation for the deltoids.",
            "image_url": "https://www.technogym.com/media/catalog/product/cache/1/image/602f0fa2c1f0d1ba5e241f914e856ff9/s/h/shoulder_press_selection_700_hero.jpg",
            "exercises": [{"name": "Machine Overhead Press", "muscles": ["Shoulders", "Triceps"]}]
        },
        {
            "name": "Technogym Dual Adjustable Pulley",
            "description": "Versatile cable station for full body training.",
            "image_url": "https://www.technogym.com/media/catalog/product/cache/1/image/602f0fa2c1f0d1ba5e241f914e856ff9/d/u/dual_adjustable_pulley_performance_hero.jpg",
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
            "image_url": "https://www.technogym.com/media/catalog/product/cache/1/image/602f0fa2c1f0d1ba5e241f914e856ff9/l/o/lower_back_selection_700_hero.jpg",
            "exercises": [{"name": "Machine Back Extension", "muscles": ["Lower Back"]}]
        },
        {
            "name": "Bodyweight / No Equipment",
            "description": "Standard bodyweight exercises.",
            "image_url": "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?q=80&w=800&auto=format&fit=crop",
            "exercises": [
                {"name": "Push-ups", "muscles": ["Chest", "Triceps"]},
                {"name": "Bodyweight Squats", "muscles": ["Quads"]},
                {"name": "Plank", "muscles": ["Core"]}
            ]
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
