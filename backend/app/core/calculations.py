from app.models.user import Gender, ActivityLevel

def calculate_target_kcal_logic(age: int, gender: Gender, weight: float, height: float, activity_level: ActivityLevel, objective: str = "maintain"):
    # ... (BMR calculation)
    if not all([weight, height, age, gender]):
        return 2000 # Default
        
    if gender == Gender.male:
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
        
    activity_multipliers = {
        ActivityLevel.sedentary: 1.2,
        ActivityLevel.lightly_active: 1.375,
        ActivityLevel.moderately_active: 1.55,
        ActivityLevel.very_active: 1.725,
        ActivityLevel.extra_active: 1.9
    }
    
    multiplier = activity_multipliers.get(activity_level, 1.2)
    tdee = bmr * multiplier

    # Objective Multipliers
    if objective == "lose_weight":
        return int(tdee - 500) # Calorie deficit
    elif objective == "gain_muscle":
        return int(tdee + 300) # Calorie surplus
    elif objective == "body_recomposition":
        return int(tdee) # Maintenance calories but high protein
    else:
        return int(tdee)
