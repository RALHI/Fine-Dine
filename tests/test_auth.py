from fastapi.testclient import TestClient
from user_service.main import app
from common.database import get_db

def test_register_and_login(override_db):
    # Override database dependency
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    # 1. Register a new customer user
    reg_response = client.post(
        "/api/auth/register",
        json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "password": "securepassword123",
            "role": "Customer"
        }
    )
    assert reg_response.status_code == 201
    data = reg_response.json()
    assert data["name"] == "Jane Doe"
    assert data["email"] == "jane@example.com"
    assert data["role"] == "Customer"
    assert "id" in data

    # 2. Try registering the same user again (should fail)
    duplicate_response = client.post(
        "/api/auth/register",
        json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "password": "securepassword123",
            "role": "Customer"
        }
    )
    assert duplicate_response.status_code == 400
    assert "already exists" in duplicate_response.json()["detail"]

    # 3. Login
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "jane@example.com",
            "password": "securepassword123"
        }
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    assert login_data["role"] == "Customer"
    assert login_data["name"] == "Jane Doe"

    # Reset overrides
    app.dependency_overrides.clear()

def test_address_management(override_db):
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    # Register & Login first
    client.post(
        "/api/auth/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "password",
            "role": "Customer"
        }
    )
    login_res = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "password"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add Address
    addr_res = client.post(
        "/api/users/addresses",
        headers=headers,
        json={
            "address_line": "123 Test St",
            "city": "Test City",
            "is_default": True
        }
    )
    assert addr_res.status_code == 201
    addr_data = addr_res.json()
    assert addr_data["address_line"] == "123 Test St"
    assert addr_data["city"] == "Test City"
    assert addr_data["is_default"] is True

    # Get Addresses list
    list_res = client.get("/api/users/addresses", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["address_line"] == "123 Test St"

    app.dependency_overrides.clear()
