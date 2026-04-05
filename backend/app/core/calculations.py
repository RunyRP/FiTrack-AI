from app.models.user import Gender, ActivityLevel

def calculate_target_kcal_logic(age: int, gender: Gender, weight: float, height: float, activity_level: ActivityLevel):
    # Mifflin-St Jeor Equation
    # Men: BMR = 10*weight + 6.25*height - 5*age + 5
    # Women: BMR = 10*weight + 6.25*height - 5*age - 161
    
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
    return int(bmr * multiplier)
