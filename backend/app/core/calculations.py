from app.models.user import Gender, ActivityLevel

def calculate_target_kcal_logic(
    age: int, 
    gender: Gender, 
    weight: float, 
    height: float, 
    activity_level: ActivityLevel, 
    objective: str = "maintain",
    cut_intensity: str = "medium",
    manual_target_kcal: int = None
):
    if manual_target_kcal:
        return manual_target_kcal

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
        ActivityLevel.moderately_active: 1.465,
        ActivityLevel.active: 1.55,
        ActivityLevel.very_active: 1.725,
        ActivityLevel.extra_active: 1.9
    }
    
    multiplier = activity_multipliers.get(activity_level, 1.2)
    tdee = bmr * multiplier

    # Objective Multipliers
    if objective == "lose_weight":
        deficit = 500 # Standard Weight Loss
        if cut_intensity == "medium":
            deficit = 750 # Aggressive Cut
        elif cut_intensity == "aggressive":
            deficit = 1000 # Extreme Cut
        return int(tdee - deficit)
    elif objective == "bulk":
        surplus = 500 # Bulking
        if cut_intensity == "light":
            surplus = 300 # Lean Bulk
        return int(tdee + surplus)
    elif objective == "maintenance":
        return int(tdee)
    
    # Legacy mappings
    adjustments = {
        "extreme_cut": -1000,
        "aggressive_cut": -750,
        "weight_loss": -500,
        "maintenance": 0,
        "lean_bulk": 300,
        "bulking": 500,
        "body_recomposition": 0,
        "gain_muscle": 300,
        "maintain": 0,
        "bulk": 500
    }

    if objective in adjustments:
        return int(tdee + adjustments[objective])

    return int(tdee)
