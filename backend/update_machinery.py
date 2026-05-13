import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.machinery import Machinery

def get_slug(name):
    return name.lower().replace(" ", "_").replace("/", "_").replace("-", "_")

def clean_and_update_machinery():
    db = SessionLocal()
    
    # 1. DELETE ALL EXISTING MACHINERY
    print("DEBUG: Cleaning up existing machinery...")
    db.query(Machinery).delete()
    db.commit()
    
    # 2. SEED ONLY THE NEW TECHNOGYM PURE STRENGTH MACHINES
    machinery_data = [
        {
            "name": "Pure Strength T-Bar Row",
            "description": "Plate-loaded T-bar row for back thickness.",
            "image_url": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "T-Bar Row", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Pure Strength Incline Chest Press",
            "description": "Targeted upper chest development.",
            "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Incline Chest Press", "muscles": ["Chest", "Shoulders", "Triceps"]}]
        },
        {
            "name": "Pure Strength Wide Chest Press",
            "description": "Effective for broad chest development.",
            "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Wide Chest Press", "muscles": ["Chest", "Shoulders", "Triceps"]}]
        },
        {
            "name": "Pure Strength Shoulder Press",
            "description": "Isolates the deltoids for maximum growth.",
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Shoulder Press", "muscles": ["Shoulders", "Triceps"]}]
        },
        {
            "name": "Pure Strength Leg Press",
            "description": "Heavy leg training with controlled movement.",
            "image_url": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Leg Press", "muscles": ["Quads", "Glutes", "Hamstrings"]}]
        },
        {
            "name": "Pure Strength Hack Squat",
            "description": "Focused quad isolation with back support.",
            "image_url": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Hack Squat", "muscles": ["Quads", "Glutes"]}]
        },
        {
            "name": "Pure Strength Leg Extension",
            "description": "Isolation for the quadriceps.",
            "image_url": "https://images.unsplash.com/photo-1591504770183-49033327663f?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Leg Extension", "muscles": ["Quads"]}]
        },
        {
            "name": "Pure Strength Standing Leg Curl",
            "description": "Unilateral hamstring development.",
            "image_url": "https://images.unsplash.com/photo-1591504770183-49033327663f?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Standing Leg Curl", "muscles": ["Hamstrings"]}]
        },
        {
            "name": "Pure Strength Rear Kick",
            "description": "Targeted glute development.",
            "image_url": "https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Glute Kickback", "muscles": ["Glutes"]}]
        },
        {
            "name": "Pure Strength Seated Row",
            "description": "Back thickness and mid-traps focus.",
            "image_url": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Seated Row", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Pure Strength Linear Leg Press",
            "description": "Linear motion for consistent leg pressure.",
            "image_url": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Linear Leg Press", "muscles": ["Quads", "Glutes", "Hamstrings"]}]
        },
        {
            "name": "Pure Strength Standing Calf Raise",
            "description": "Heavy calf development.",
            "image_url": "https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Standing Calf Raise", "muscles": ["Calves"]}]
        },
        {
            "name": "Pure Strength Low Row",
            "description": "Targeted lower lat and mid-back focus.",
            "image_url": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Low Row", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Pure Strength Biceps Curl",
            "description": "Isolation for the biceps brachii.",
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Bicep Curl", "muscles": ["Biceps"]}]
        },
        {
            "name": "Pure Strength Pullover",
            "description": "Full upper body development (Back and Chest).",
            "image_url": "https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Pullover", "muscles": ["Back", "Chest"]}]
        },
        {
            "name": "Pure Strength Seated Dip",
            "description": "Focused triceps and lower chest development.",
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Seated Dip", "muscles": ["Triceps", "Chest", "Shoulders"]}]
        },
        {
            "name": "Pure Strength Seated Calf",
            "description": "Targeted soleus development.",
            "image_url": "https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Seated Calf Raise", "muscles": ["Calves"]}]
        },
        {
            "name": "Pure Strength Hip Thrust",
            "description": "The ultimate glute building machine.",
            "image_url": "https://images.unsplash.com/photo-1594737625785-a6907409f583?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Hip Thrust", "muscles": ["Glutes", "Hamstrings"]}]
        },
        {
            "name": "Pure Strength Pulldown",
            "description": "Wide lat development.",
            "image_url": "https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Lat Pulldown", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Pure Strength Standing Abductor",
            "description": "Glute medius and hip stability.",
            "image_url": "https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Standing Hip Abduction", "muscles": ["Glutes"]}]
        },
        {
            "name": "Pure Strength Chest Press",
            "description": "Effective chest development with natural range of motion.",
            "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Chest Press", "muscles": ["Chest", "Shoulders", "Triceps"]}]
        },
        {
            "name": "Pure Strength Deadlift",
            "description": "Plate-loaded deadlift for posterior chain power.",
            "image_url": "https://images.unsplash.com/photo-1594737625785-a6907409f583?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Deadlift", "muscles": ["Back", "Glutes", "Hamstrings"]}]
        },
        {
            "name": "Pure Strength Belt Squat",
            "description": "Heavy squatting without spinal compression.",
            "image_url": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Belt Squat", "muscles": ["Quads", "Glutes"]}]
        },
        {
            "name": "Artis Lat Machine",
            "description": "Premium pulldown machine for back and arm development.",
            "image_url": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Lat Pulldown", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Artis Pectoral",
            "description": "Isolates chest muscles with a natural fly motion.",
            "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Chest Fly", "muscles": ["Chest"]}]
        },
        {
            "name": "Artis Squat",
            "description": "Guided squat machine for safe and effective leg training.",
            "image_url": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Guided Squat", "muscles": ["Quads", "Glutes", "Hamstrings"]}]
        },
        {
            "name": "Artis Abductor",
            "description": "Targets outer thigh and gluteal muscles.",
            "image_url": "https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Hip Abduction", "muscles": ["Glutes"]}]
        },
        {
            "name": "Artis Adductor",
            "description": "Targets inner thigh muscles effectively.",
            "image_url": "https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Hip Adduction", "muscles": ["Adductors"]}]
        },
        {
            "name": "Artis Arm Extension",
            "description": "Isolates triceps with a comfortable pushing motion.",
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Tricep Extension", "muscles": ["Triceps"]}]
        },
        {
            "name": "Artis Rear Delt Row",
            "description": "Targets posterior deltoids and upper back.",
            "image_url": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Rear Delt Row", "muscles": ["Shoulders", "Back"]}]
        },
        {
            "name": "Artis Rotary Torso",
            "description": "Targets obliques through controlled rotation.",
            "image_url": "https://images.unsplash.com/photo-1594737625785-a6907409f583?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Torso Rotation", "muscles": ["Abs"]}]
        },
        {
            "name": "Artis Leg Press",
            "description": "Versatile leg training with adjustable seating.",
            "image_url": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Leg Press", "muscles": ["Quads", "Glutes", "Hamstrings"]}]
        },
        {
            "name": "Artis Multi Hip",
            "description": "Versatile machine for multiple hip movements.",
            "image_url": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Multi Hip Movement", "muscles": ["Glutes", "Quads", "Hamstrings", "Hip Flexors"]}]
        },
        {
            "name": "Artis Lower Back",
            "description": "Strengthens lower back for better posture.",
            "image_url": "https://images.unsplash.com/photo-1594737625785-a6907409f583?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Back Extension", "muscles": ["Lower Back"]}]
        },
        {
            "name": "Artis Shoulder Press",
            "description": "Isolates shoulders with independent movement arms.",
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Shoulder Press", "muscles": ["Shoulders", "Triceps"]}]
        },
        {
            "name": "Artis Chest Press",
            "description": "Strengthens pectorals and arms with converging movement.",
            "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Chest Press", "muscles": ["Chest", "Shoulders", "Triceps"]}]
        },
        {
            "name": "Artis Vertical Traction",
            "description": "Targets upper back and arms with a safe pulldown motion.",
            "image_url": "https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Vertical Traction", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Artis Low Row",
            "description": "Targets middle and lower back muscles.",
            "image_url": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Low Row", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Artis Total Abdominal",
            "description": "Strengthens core and hip flexors with a crunch motion.",
            "image_url": "https://images.unsplash.com/photo-1594737625785-a6907409f583?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Ab Crunch", "muscles": ["Abs"]}]
        },
        {
            "name": "Artis Leg Curl",
            "description": "Isolates hamstrings from a seated position.",
            "image_url": "https://images.unsplash.com/photo-1591504770183-49033327663f?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Seated Leg Curl", "muscles": ["Hamstrings"]}]
        },
        {
            "name": "Artis Leg Extension",
            "description": "Isolates quadriceps while ensuring joint safety.",
            "image_url": "https://images.unsplash.com/photo-1591504770183-49033327663f?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Leg Extension", "muscles": ["Quads"]}]
        },
        {
            "name": "Artis Arm Curl",
            "description": "Isolates biceps with ergonomic handgrips.",
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Bicep Curl", "muscles": ["Biceps"]}]
        },
        {
            "name": "Selection 700 Dual Pectoral / Reverse Fly",
            "description": "Dual-function machine for chest and rear deltoids.",
            "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
            "exercises": [
                {"name": "Pectoral Fly", "muscles": ["Chest"]},
                {"name": "Reverse Fly", "muscles": ["Shoulders", "Back"]}
            ]
        },
        {
            "name": "Selection 700 Delts Machine",
            "description": "Isolates lateral deltoids for broad shoulders.",
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
            "exercises": [{"name": "Lateral Raise", "muscles": ["Shoulders"]}]
        }
    ]

    static_dir = os.path.join("app", "static", "machinery")
    
    for machine_data in machinery_data:
        # Check if we have a local version of the image
        slug = get_slug(machine_data["name"])
        local_found = False
        for ext in ["jpg", "jpeg", "png"]:
            local_filename = f"{slug}.{ext}"
            if os.path.exists(os.path.join(static_dir, local_filename)):
                machine_data["image_url"] = f"/static/machinery/{local_filename}"
                local_found = True
                break
        
        if local_found:
            print(f"Using local image for {machine_data['name']}")
        else:
            print(f"Using external image for {machine_data['name']}: {machine_data['image_url']}")

        machine = Machinery(**machine_data)
        db.add(machine)
    
    db.commit()
    db.close()
    print("SUCCESS: Machinery list updated.")

if __name__ == "__main__":
    clean_and_update_machinery()
