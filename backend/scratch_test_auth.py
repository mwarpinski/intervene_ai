import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.utils.auth import hash_password, verify_password, create_access_token, verify_turnstile_captcha

client = TestClient(app)

def test_unit_auth():
    print("--- 1. Testing Password Hashing & Verification ---")
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    assert hashed != password, "Password was not hashed"
    assert verify_password(password, hashed), "Password verification failed for valid password"
    assert not verify_password("WrongPassword", hashed), "Password verification succeeded for invalid password"
    print("✓ Password hashing & verification passed.")

    print("\n--- 2. Testing JWT Token Creation ---")
    token = create_access_token(user_id="test-user-123", email="teacher@school.edu")
    assert token and isinstance(token, str), "Failed to generate JWT token"
    print("✓ JWT token creation passed.")

async def test_captcha():
    print("\n--- 3. Testing Cloudflare Turnstile Verification ---")
    res1 = await verify_turnstile_captcha("1x0000000000000000000000000000000AA")
    assert res1 is True, "Test Turnstile token failed verification"
    res2 = await verify_turnstile_captcha("local_dev_bypass")
    assert res2 is True, "Local dev bypass token failed verification"
    print("✓ Cloudflare Turnstile token verification passed.")

def test_endpoints():
    import time
    test_email = f"sarah.jenkins_{int(time.time())}@oakridge.edu"
    print("\n--- 4. Testing Signup Endpoint ---")
    signup_payload = {
        "email": test_email,
        "password": "Password123!",
        "first_name": "Sarah",
        "role": "Special Ed Teacher",
        "grade_level": "Middle School",
        "school_id": "Oakridge-MS",
        "captcha_token": "1x0000000000000000000000000000000AA"
    }
    response = client.post("/api/v1/auth/signup", json=signup_payload)
    print("Signup response status:", response.status_code)
    assert response.status_code == 200, f"Signup failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == signup_payload["email"]
    token = data["access_token"]
    print("✓ Signup endpoint passed. Token received.")

    print("\n--- 5. Testing Login Endpoint ---")
    login_payload = {
        "email": test_email,
        "password": "Password123!",
        "captcha_token": "1x0000000000000000000000000000000AA"
    }

    response = client.post("/api/v1/auth/login", json=login_payload)
    print("Login response status:", response.status_code)
    assert response.status_code == 200, f"Login failed: {response.text}"
    login_data = response.json()
    assert "access_token" in login_data
    print("✓ Login endpoint passed.")

    print("\n--- 6. Testing /auth/me Endpoint ---")
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200, f"Get me failed: {me_resp.text}"
    user_me = me_resp.json()
    assert user_me["email"] == signup_payload["email"]
    print("✓ Authenticated /auth/me endpoint passed.")

if __name__ == "__main__":
    test_unit_auth()
    asyncio.run(test_captcha())
    test_endpoints()
    print("\n==========================================")
    print("ALL BACKEND AUTH & BOT TESTS PASSED!")
    print("==========================================")
