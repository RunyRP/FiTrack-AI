import requests

def test_user_me():
    # Login
    res = requests.post("http://localhost:8000/auth/login", data={"username": "haciucadrian9d@gmail.com", "password": "password"})
    if res.status_code != 200:
        print("Login failed:", res.text)
        return
    token = res.json()["access_token"]
    
    # Get User
    res2 = requests.get("http://localhost:8000/user/me", headers={"Authorization": f"Bearer {token}"})
    print(res2.json())

if __name__ == "__main__":
    test_user_me()
