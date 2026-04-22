import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor
import io
import os
from typing import List, Dict

# Advanced Calorie DB with portion types
# kcal is always per 100g
FOOD_DB = {
    # Proteins
    "grilled chicken":     {"kcal": 165, "default_portion": 200, "type": "volume"},
    "fried chicken":       {"kcal": 260, "default_portion": 250, "type": "volume"},
    "beef steak":          {"kcal": 250, "default_portion": 250, "type": "volume"},
    "pork chop":           {"kcal": 242, "default_portion": 200, "type": "unit", "unit_weight": 200},
    "bacon":               {"kcal": 541, "default_portion": 50,  "type": "unit", "unit_weight": 15},
    "salmon":              {"kcal": 208, "default_portion": 180, "type": "volume"},
    "shrimp":              {"kcal": 99,  "default_portion": 150, "type": "volume"},
    "boiled egg":          {"kcal": 155, "default_portion": 50,  "type": "unit", "unit_weight": 50},
    "fried egg":           {"kcal": 196, "default_portion": 50,  "type": "unit", "unit_weight": 50},
    "tofu":                {"kcal": 76,  "default_portion": 150, "type": "volume"},
    
    # Vegetables
    "broccoli":            {"kcal": 34,  "default_portion": 100, "type": "volume"},
    "carrot":              {"kcal": 41,  "default_portion": 80,  "type": "unit", "unit_weight": 60},
    "bell pepper":         {"kcal": 31,  "default_portion": 80,  "type": "unit", "unit_weight": 120},
    "tomato":              {"kcal": 18,  "default_portion": 100, "type": "unit", "unit_weight": 100},
    "cucumber":            {"kcal": 16,  "default_portion": 100, "type": "unit", "unit_weight": 200},
    "spinach":             {"kcal": 23,  "default_portion": 50,  "type": "volume"},
    "lettuce":             {"kcal": 15,  "default_portion": 50,  "type": "volume"},
    "mushroom":            {"kcal": 22,  "default_portion": 80,  "type": "volume"},
    "corn":                {"kcal": 86,  "default_portion": 100, "type": "volume"},
    "asparagus":           {"kcal": 20,  "default_portion": 100, "type": "volume"},
    "onion":               {"kcal": 40,  "default_portion": 50,  "type": "unit", "unit_weight": 110},
    "garlic":              {"kcal": 149, "default_portion": 10,  "type": "unit", "unit_weight": 5},
    
    # Fruits
    "apple":               {"kcal": 52,  "default_portion": 150, "type": "unit", "unit_weight": 180},
    "banana":              {"kcal": 89,  "default_portion": 120, "type": "unit", "unit_weight": 120},
    "orange":              {"kcal": 47,  "default_portion": 130, "type": "unit", "unit_weight": 130},
    "strawberry":          {"kcal": 32,  "default_portion": 100, "type": "volume"},
    "blueberry":           {"kcal": 57,  "default_portion": 100, "type": "volume"},
    "grapes":              {"kcal": 67,  "default_portion": 100, "type": "volume"},
    "watermelon":          {"kcal": 30,  "default_portion": 200, "type": "volume"},
    "avocado":             {"kcal": 160, "default_portion": 100, "type": "unit", "unit_weight": 200},
    
    # Carbs & Grains
    "white rice":          {"kcal": 130, "default_portion": 150, "type": "volume"},
    "brown rice":          {"kcal": 112, "default_portion": 150, "type": "volume"},
    "pasta":               {"kcal": 158, "default_portion": 200, "type": "volume"},
    "french fries":        {"kcal": 312, "default_portion": 150, "type": "volume"},
    "mashed potatoes":     {"kcal": 113, "default_portion": 200, "type": "volume"},
    "roast potatoes":      {"kcal": 149, "default_portion": 200, "type": "volume"},
    "bread":               {"kcal": 265, "default_portion": 60,  "type": "unit", "unit_weight": 30},
    "oatmeal":             {"kcal": 68,  "default_portion": 200, "type": "volume"},
    "quinoa":              {"kcal": 120, "default_portion": 150, "type": "volume"},
    
    # Dishes & Fast Food
    "pizza":               {"kcal": 266, "default_portion": 300, "type": "unit", "unit_weight": 150},
    "hamburger":           {"kcal": 295, "default_portion": 250, "type": "unit", "unit_weight": 250},
    "sushi":               {"kcal": 150, "default_portion": 200, "type": "unit", "unit_weight": 30},
    "tacos":               {"kcal": 218, "default_portion": 200, "type": "unit", "unit_weight": 70},
    "burrito":             {"kcal": 206, "default_portion": 350, "type": "unit", "unit_weight": 350},
    "spaghetti bolognese": {"kcal": 150, "default_portion": 300, "type": "volume"},
    "caesar salad":        {"kcal": 100, "default_portion": 200, "type": "volume"},
    "lasagna":             {"kcal": 135, "default_portion": 300, "type": "volume"},
    
    # Snacks & Desserts
    "yogurt":              {"kcal": 59,  "default_portion": 150, "type": "volume"},
    "cheese":              {"kcal": 402, "default_portion": 30,  "type": "volume"},
    "chocolate":           {"kcal": 546, "default_portion": 40,  "type": "unit", "unit_weight": 10},
    "almonds":             {"kcal": 579, "default_portion": 30,  "type": "volume"},
    "peanut butter":       {"kcal": 588, "default_portion": 32,  "type": "volume"},
    "cookie":              {"kcal": 502, "default_portion": 50,  "type": "unit", "unit_weight": 25},
    "ice cream":           {"kcal": 207, "default_portion": 100, "type": "volume"},
}

MODEL_ID = "openai/clip-vit-base-patch32"

class AIMealService:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = CLIPProcessor.from_pretrained(MODEL_ID)
        self.model = CLIPModel.from_pretrained(MODEL_ID).to(self.device)
        self.model.eval()

    def analyze_image(self, image_bytes: bytes) -> List[Dict]:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        food_labels = list(FOOD_DB.keys())

        # Negative prompts to filter non-food
        negative_labels = ["a person", "a room", "electronics", "an animal", "furniture", "clothing", "building"]
        
        # Portion size prompts for better estimation
        portion_labels = ["a small portion", "a normal portion", "a large portion", "a giant portion"]
        
        all_labels = food_labels + negative_labels + portion_labels
        texts = [f"a photo of {lbl}" for lbl in all_labels]

        inputs = self.processor(text=texts, images=image, return_tensors="pt", padding=True).to(self.device)

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=-1)[0].cpu().tolist()

        # Extract probabilities for different categories
        food_probs = probs[:len(food_labels)]
        neg_probs = probs[len(food_labels):len(food_labels)+len(negative_labels)]
        size_probs = probs[len(food_labels)+len(negative_labels):]

        # 1. Rejection Logic: If a negative label is dominant, it's probably not food
        max_neg_prob = max(neg_probs)
        if max_neg_prob > 0.25:
            return []

        # 2. Size Multiplier based on size prompts
        # small=0.7, normal=1.0, large=1.3, giant=1.6
        size_multipliers = [0.7, 1.0, 1.3, 1.6]
        max_size_idx = size_probs.index(max(size_probs))
        base_size_multiplier = size_multipliers[max_size_idx]

        results = []
        for i, prob in enumerate(food_probs):
            label = food_labels[i]

            # Multi-item detection:
            # Instead of just the top 1, we look for items with significant confidence
            # even if they aren't the absolute winner.
            if prob > 0.08:  # Lower threshold to catch side items
                db_entry = FOOD_DB[label]
                
                # Refined Portion Logic:
                # Combine the size multiplier with the item's confidence
                est_multiplier = base_size_multiplier
                
                # If confidence is exceptionally high for an item (>40%), 
                # it's likely a primary component, maybe increase its portion
                if prob > 0.40:
                    est_multiplier *= 1.1

                est_grams = int(db_entry["default_portion"] * est_multiplier)
                est_kcal = int(est_grams * db_entry["kcal"] / 100)

                results.append({
                    "label": label,
                    "confidence": prob,
                    "grams": est_grams,
                    "kcal": est_kcal,
                    "base_kcal": db_entry["kcal"],
                    "portion_note": portion_labels[max_size_idx].replace("a ", "")
                })

        # Sort and filter
        sorted_results = sorted(results, key=lambda x: x["confidence"], reverse=True)

        if not sorted_results or sorted_results[0]["confidence"] < 0.12:
            return []

        # Return top matches, prioritizing diversity in labels
        return sorted_results[:5]

# Lazy initialization
ai_service = None

def get_ai_service():
    global ai_service
    if ai_service is None:
        ai_service = AIMealService()
    return ai_service

def search_food(query: str) -> List[Dict]:
    query = query.lower()
    results = []
    for label, data in FOOD_DB.items():
        if query in label:
            results.append({
                "label": label,
                "grams": data["default_portion"],
                "kcal": int(data["default_portion"] * data["kcal"] / 100),
                "base_kcal": data["kcal"]
            })
    return results
