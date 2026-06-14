from fastapi.testclient import TestClient
from order_service.main import app
from common.database import get_db, Restaurant, MenuItem
from common.security import create_access_token

def test_place_order(override_db, db_session):
    # Setup FastAPI database overrides
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    # 1. Populate tables inside db session
    restaurant = Restaurant(id=10, owner_id=1, restaurant_name="Sushi Palace", location="90 Silk Road")
    menu_item = MenuItem(id=100, restaurant_id=10, name="Salmon Roll", price=12.00, is_available=True)
    db_session.add(restaurant)
    db_session.add(menu_item)
    db_session.commit()

    # 2. Place Order
    token = create_access_token({"sub": "2", "email": "customer@gmail.com", "role": "Customer", "name": "Jane"})
    headers = {"Authorization": f"Bearer {token}"}
    
    order_payload = {
        "restaurant_id": 10,
        "delivery_address": "45 Park Avenue, NYC",
        "items": [
            {"menu_item_id": 100, "quantity": 2}
        ]
    }
    
    response = client.post("/api/orders", headers=headers, json=order_payload)
    assert response.status_code == 201
    data = response.json()
    assert float(data["total_amount"]) == 24.00  # 12.00 * 2
    assert data["order_status"] == "Created"
    assert data["delivery_address"] == "45 Park Avenue, NYC"
    assert len(data["order_items"]) == 1
    assert data["order_items"][0]["menu_item_id"] == 100
    assert data["order_items"][0]["quantity"] == 2

    # 3. Fetch orders list
    list_res = client.get("/api/orders", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    app.dependency_overrides.clear()
