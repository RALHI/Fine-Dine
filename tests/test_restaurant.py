from fastapi.testclient import TestClient
from restaurant_service.main import app
from common.database import get_db
from common.security import create_access_token

def test_restaurant_and_menu(override_db):
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    # Mock access token for owner
    token_payload = {"sub": "1", "email": "owner@restaurant.com", "role": "Restaurant Owner", "name": "Chef"}
    token = create_access_token(data=token_payload)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a restaurant
    rest_response = client.post(
        "/api/restaurants",
        headers=headers,
        json={
            "restaurant_name": "Wok Star",
            "description": "Delicious Asian stir fry and fried rice.",
            "location": "78 Wok Lane",
        }
    )
    assert rest_response.status_code == 201
    rest_data = rest_response.json()
    assert rest_data["restaurant_name"] == "Wok Star"
    assert rest_data["rating"] == 0.0
    rest_id = rest_data["id"]

    # 2. Add MenuItem to restaurant menu
    item_response = client.post(
        f"/api/restaurants/{rest_id}/menu",
        headers=headers,
        json={
            "name": "Kung Pao Chicken",
            "description": "Spicy stir-fried chicken with peanuts and vegetables.",
            "price": 14.50,
            "is_available": True
        }
    )
    assert item_response.status_code == 201
    item_data = item_response.json()
    assert item_data["name"] == "Kung Pao Chicken"
    assert float(item_data["price"]) == 14.50

    # 3. Retrieve restaurant menu
    menu_res = client.get(f"/api/restaurants/{rest_id}/menu")
    assert menu_res.status_code == 200
    assert len(menu_res.json()) == 1
    assert menu_res.json()[0]["name"] == "Kung Pao Chicken"

    # Reset overrides
    app.dependency_overrides.clear()

def test_review_posting(override_db):
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    # Setup owner and restaurant first
    owner_token = create_access_token({"sub": "1", "email": "owner@restaurant.com", "role": "Restaurant Owner", "name": "Chef"})
    rest_res = client.post(
        "/api/restaurants",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"restaurant_name": "Pizzeria", "location": "12 Broadway"}
    )
    rest_id = rest_res.json()["id"]

    # Customer reviews
    cust_token = create_access_token({"sub": "2", "email": "cust@gmail.com", "role": "Customer", "name": "John"})
    headers = {"Authorization": f"Bearer {cust_token}"}

    # Post rating/review
    rev_res = client.post(
        f"/api/restaurants/{rest_id}/reviews",
        headers=headers,
        json={"rating": 5, "comment": "Best pizza in town!"}
    )
    assert rev_res.status_code == 201
    assert rev_res.json()["rating"] == 5
    assert rev_res.json()["comment"] == "Best pizza in town!"

    # Verify updated restaurant average rating
    rest_res = client.get(f"/api/restaurants/{rest_id}")
    assert rest_res.json()["rating"] == 5.0

    app.dependency_overrides.clear()
