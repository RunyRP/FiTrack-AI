import os
import requests
import time

def get_slug(name):
    return name.lower().replace(" ", "_").replace("/", "_").replace("-", "_")

selectorised = [
    {"name": "Artis Lat Machine", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_lat_machine_hero_1.jpg"},
    {"name": "Artis Pectoral", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_pectoral_hero_1.jpg"},
    {"name": "Artis Squat", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_squat_hero_1.jpg"},
    {"name": "Artis Adductor", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_adductor_hero_1.jpg"},
    {"name": "Artis Abductor", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_abductor_hero_1.jpg"},
    {"name": "Artis Arm Extension", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_arm_extension_hero_1.jpg"},
    {"name": "Artis Rear Delt Row", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_rear_delt_row_hero_1.jpg"},
    {"name": "Artis Rotary Torso", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_rotary_torso_hero_1.jpg"},
    {"name": "Artis Leg Press", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_leg_press_hero_1.jpg"},
    {"name": "Artis Multi Hip", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_multi_hip_hero_1.jpg"},
    {"name": "Artis Lower Back", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_lower_back_hero_1.jpg"},
    {"name": "Artis Shoulder Press", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_shoulder_press_hero_1.jpg"},
    {"name": "Artis Chest Press", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_chest_press_hero_1.jpg"},
    {"name": "Artis Vertical Traction", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_vertical_traction_hero_1.jpg"},
    {"name": "Artis Low Row", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_low_row_hero_1.jpg"},
    {"name": "Artis Total Abdominal", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_total_abdominal_hero_1.jpg"},
    {"name": "Artis Leg Curl", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_leg_curl_hero_1.jpg"},
    {"name": "Artis Leg Extension", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_leg_extension_hero_1.jpg"},
    {"name": "Artis Arm Curl", "image_url": "https://www.technogym.com/media/catalog/product/a/r/artis_arm_curl_hero_1.jpg"},
    {"name": "Selection 700 Dual Pectoral / Reverse Fly", "image_url": "https://www.technogym.com/media/catalog/product/cache/1/thumbnail/9df78eab33525d08d6e5fb8d27136e95/p/e/pectoral-reverse-dual-selection-700-1-1.jpg"},
    {"name": "Selection 700 Delts Machine", "image_url": "https://www.technogym.com/media/catalog/product/s/e/selection_700_delts_machine_hero_2.jpg"}
]

plate_loaded = [
    {"name": "Pure Strength T-Bar Row", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_t_bar_row_hero_1.jpg"},
    {"name": "Pure Strength Incline Chest Press", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_incline_chest_press_hero_1.jpg"},
    {"name": "Pure Strength Wide Chest Press", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_wide_chest_press_hero_1.jpg"},
    {"name": "Pure Strength Shoulder Press", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_shoulder_press_hero_1.jpg"},
    {"name": "Pure Strength Leg Press", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_leg_press_hero_1.jpg"},
    {"name": "Pure Strength Hack Squat", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_hack_squat_hero_1.jpg"},
    {"name": "Pure Strength Leg Extension", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_leg_extension_hero_1.jpg"},
    {"name": "Pure Strength Standing Leg Curl", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_standing_leg_curl_hero_1.jpg"},
    {"name": "Pure Strength Rear Kick", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_rear_kick_hero_1.jpg"},
    {"name": "Pure Strength Row", "image_url": "https://www.technogym.com/media/catalog/product/cache/1/thumbnail/9df78eab33525d08d6e5fb8d27136e95/M/G/MG3000_purestrength_row_hero_01_19.jpg"},
    {"name": "Pure Strength Linear Leg Press", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_linear_leg_press_hero_1.jpg"},
    {"name": "Pure Strength Calf", "image_url": "https://www.technogym.com/media/catalog/product/m/g/mg4500_pure_calf_hero.jpg"},
    {"name": "Pure Strength Low Row", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_low_row_hero_1.jpg"},
    {"name": "Pure Strength Biceps", "image_url": "https://www.technogym.com/media/catalog/product/m/g/mg6000_pure_biceps_hero.jpg"},
    {"name": "Pure Strength Pullover", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_pullover_hero_1.jpg"},
    {"name": "Pure Strength Seated Dip", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_seated_dip_hero_1.jpg"},
    {"name": "Pure Strength Seated Calf", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_seated_calf_hero_1.jpg"},
    {"name": "Pure Strength Hip Thrust", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_hip_thrust_hero_1.jpg"},
    {"name": "Pure Strength Pulldown", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_pulldown_hero_1.jpg"},
    {"name": "Pure Strength Standing Abductor", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_standing_abductor_hero_1.jpg"},
    {"name": "Pure Strength Chest Press", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_chest_press_hero_1.jpg"},
    {"name": "Pure Strength Deadlift", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_deadlift_hero_1.jpg"},
    {"name": "Pure Strength Belt Squat", "image_url": "https://www.technogym.com/media/catalog/product/p/u/pure_strength_belt_squat_hero_1.jpg"}
]

all_data = selectorised + plate_loaded

static_dir = os.path.join("app", "static", "machinery")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.technogym.com/'
}

def download_image(name, url):
    slug = get_slug(name)
    file_path = os.path.join(static_dir, f"{slug}.jpg")
    
    # Check if already exists to avoid redundant downloads
    if os.path.exists(file_path):
        print(f"Image for {name} already exists. Skipping.")
        return True

    print(f"Downloading {name} from {url}...")
    try:
        response = requests.get(url, headers=headers, timeout=20)
        if response.status_code == 200:
            with open(file_path, "wb") as f:
                f.write(response.content)
            print(f"Saved to {file_path}")
            return True
        else:
            print(f"Failed to download {name}: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"Error downloading {name}: {e}")
        return False

for item in all_data:
    download_image(item["name"], item["image_url"])
    time.sleep(0.5)

print("Finished downloading images.")
