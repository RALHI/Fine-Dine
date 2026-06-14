"""
Seed script: populates FoodDash with realistic dummy data via the live API.
Run:  python seed_data.py
"""
import requests, json, time, sys

BASE = "http://localhost:8000"

# ─────────────────────────── helpers ────────────────────────────────────────

def post(path, payload, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.post(f"{BASE}{path}", json=payload, headers=headers)
    if r.status_code not in (200, 201):
        print(f"  ✗ POST {path} → {r.status_code}: {r.text[:200]}")
        return None
    return r.json()

def login(email, password):
    data = post("/api/auth/login", {"email": email, "password": password})
    return data["access_token"] if data else None

# ─────────────────────────── users ──────────────────────────────────────────

USERS = [
    {"name": "Alice Chen",      "email": "alice@fooddash.com",    "password": "Pass1234!", "role": "Customer"},
    {"name": "Bob Sharma",      "email": "bob@fooddash.com",      "password": "Pass1234!", "role": "Customer"},
    {"name": "Charlie Roy",     "email": "charlie@fooddash.com",  "password": "Pass1234!", "role": "Customer"},
    {"name": "Priya Patel",     "email": "priya@fooddash.com",    "password": "Pass1234!", "role": "Restaurant Owner"},
    {"name": "Marco Rossi",     "email": "marco@fooddash.com",    "password": "Pass1234!", "role": "Restaurant Owner"},
    {"name": "Aisha Khan",      "email": "aisha@fooddash.com",    "password": "Pass1234!", "role": "Restaurant Owner"},
    {"name": "Ravi Kumar",      "email": "ravi@fooddash.com",     "password": "Pass1234!", "role": "Restaurant Owner"},
    {"name": "Sara Williams",   "email": "sara@fooddash.com",     "password": "Pass1234!", "role": "Restaurant Owner"},
    {"name": "Dev Rider",       "email": "dev@fooddash.com",      "password": "Pass1234!", "role": "Delivery Partner"},
    {"name": "Admin Boss",      "email": "admin@fooddash.com",    "password": "Admin123!", "role": "Admin"},
]

print("\n🌱 Seeding users...")
for u in USERS:
    result = post("/api/auth/register", u)
    status = "✓" if result else "skip (exists)"
    print(f"  {status}  {u['role']}: {u['name']} <{u['email']}>")
    time.sleep(0.1)

# ─────────────────────────── restaurant owners login ────────────────────────

owners = {
    "priya": login("priya@fooddash.com",  "Pass1234!"),
    "marco": login("marco@fooddash.com",  "Pass1234!"),
    "aisha": login("aisha@fooddash.com",  "Pass1234!"),
    "ravi":  login("ravi@fooddash.com",   "Pass1234!"),
    "sara":  login("sara@fooddash.com",   "Pass1234!"),
}

# ─────────────────────────── restaurants + menus ────────────────────────────

RESTAURANTS = [
    {
        "owner": "priya",
        "data": {
            "restaurant_name": "Spice Garden",
            "description": "Authentic North Indian cuisine with rich curries, tandoori delights and fresh naan. A celebration of spices from the heart of Punjab.",
            "location": "Connaught Place, New Delhi",
            "image_url": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800"
        },
        "menu": [
            {"name": "Butter Chicken",        "description": "Tender chicken in a rich, creamy tomato-based sauce with aromatic spices", "price": 12.99, "image_url": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400"},
            {"name": "Dal Makhani",           "description": "Slow-cooked black lentils in a buttery tomato gravy, simmered overnight", "price": 9.99,  "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400"},
            {"name": "Garlic Naan",           "description": "Soft, pillowy flatbread brushed with garlic butter, baked in a tandoor oven", "price": 3.49,  "image_url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400"},
            {"name": "Paneer Tikka",          "description": "Marinated cottage cheese cubes grilled to perfection in a clay oven", "price": 11.49, "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400"},
            {"name": "Chicken Biryani",       "description": "Fragrant basmati rice layered with spiced chicken, fried onions and saffron", "price": 14.99, "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400"},
            {"name": "Mango Lassi",           "description": "Creamy yoghurt smoothie blended with ripe Alphonso mangoes and a hint of cardamom", "price": 4.49,  "image_url": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400"},
            {"name": "Palak Paneer",          "description": "Creamy spinach gravy with fresh cottage cheese, seasoned with whole spices", "price": 10.49, "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400"},
            {"name": "Samosa Chaat",          "description": "Crispy pastry filled with spiced potatoes, topped with chutneys and yoghurt", "price": 6.99,  "image_url": "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400"},
        ]
    },
    {
        "owner": "marco",
        "data": {
            "restaurant_name": "La Bella Napoli",
            "description": "Wood-fired Neapolitan pizza and handmade pasta made with 00 flour, San Marzano tomatoes and fresh mozzarella di bufala. Straight from Naples to your door.",
            "location": "Bandra West, Mumbai",
            "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800"
        },
        "menu": [
            {"name": "Margherita Pizza",      "description": "Classic tomato base, fresh mozzarella di bufala and fragrant basil leaves on a 12\" thin crust", "price": 13.99, "image_url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400"},
            {"name": "Pepperoni Pizza",       "description": "Generous layer of Italian pepperoni over tomato sauce and stretchy mozzarella", "price": 15.99, "image_url": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400"},
            {"name": "Truffle Mushroom Pizza","description": "Wild mushrooms, truffle oil, parmesan shavings and fresh rocket on a crispy base", "price": 18.49, "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400"},
            {"name": "Spaghetti Carbonara",   "description": "Al dente spaghetti in a silky egg and pecorino sauce with guanciale and black pepper", "price": 14.49, "image_url": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400"},
            {"name": "Penne Arrabbiata",      "description": "Penne in a spicy tomato and garlic sauce, finished with fresh parsley and chilli flakes", "price": 12.49, "image_url": "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400"},
            {"name": "Tiramisu",              "description": "Classic Italian dessert of espresso-soaked ladyfingers layered with mascarpone cream", "price": 7.49,  "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400"},
            {"name": "Garlic Bread",          "description": "Toasted sourdough rubbed with fresh garlic, olive oil and chopped parsley", "price": 5.49,  "image_url": "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=400"},
            {"name": "Caprese Salad",         "description": "Buffalo mozzarella with vine tomatoes, fresh basil and aged balsamic glaze", "price": 10.49, "image_url": "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400"},
        ]
    },
    {
        "owner": "aisha",
        "data": {
            "restaurant_name": "Sushi Zen",
            "description": "Omakase-style Japanese cuisine with premium nigiri, maki rolls and hot ramen. Fresh fish flown in twice weekly, crafted by a Tokyo-trained itamae.",
            "location": "Koramangala, Bengaluru",
            "image_url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800"
        },
        "menu": [
            {"name": "Dragon Roll",           "description": "Prawn tempura and cucumber topped with avocado slices and spicy mayo", "price": 16.99, "image_url": "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400"},
            {"name": "Salmon Nigiri (6 pc)",  "description": "Hand-pressed sushi rice topped with premium Atlantic salmon and wasabi", "price": 14.49, "image_url": "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400"},
            {"name": "Tuna Sashimi (8 pc)",   "description": "Slices of bluefin tuna served with pickled ginger, wasabi and soy sauce", "price": 18.99, "image_url": "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400"},
            {"name": "Tonkotsu Ramen",        "description": "Rich pork bone broth with chashu pork, soft-boiled egg, nori and bamboo shoots", "price": 15.49, "image_url": "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400"},
            {"name": "Edamame",               "description": "Steamed young soybeans lightly salted with sea salt — the perfect starter", "price": 5.49,  "image_url": "https://images.unsplash.com/photo-1563699938-f0dd8ab1ef40?w=400"},
            {"name": "Gyoza (6 pc)",          "description": "Pan-fried pork and cabbage dumplings served with a soy-ginger dipping sauce", "price": 8.99,  "image_url": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400"},
            {"name": "Miso Soup",             "description": "Traditional white miso broth with silken tofu, wakame seaweed and spring onions", "price": 4.49,  "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400"},
            {"name": "Matcha Ice Cream",      "description": "House-made green tea ice cream with red bean paste and mochi topping", "price": 6.49,  "image_url": "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=400"},
        ]
    },
    {
        "owner": "ravi",
        "data": {
            "restaurant_name": "Burger Republic",
            "description": "Gourmet smash burgers crafted from 100% grass-fed beef with house-made sauces, brioche buns and loaded toppings. American diner vibes with a premium twist.",
            "location": "Indiranagar, Bengaluru",
            "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800"
        },
        "menu": [
            {"name": "Classic Smash Burger",  "description": "Double smash patty, American cheese, pickles, onions and signature republic sauce on a toasted brioche bun", "price": 12.99, "image_url": "https://images.unsplash.com/photo-1550317138-10000687a72b?w=400"},
            {"name": "BBQ Bacon Burger",      "description": "Smoked bacon, cheddar, crispy onion rings and smoky BBQ sauce with a double patty", "price": 14.99, "image_url": "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400"},
            {"name": "Mushroom Swiss Burger", "description": "Sautéed portobello mushrooms, Swiss cheese and truffle aioli on a pretzel bun", "price": 13.49, "image_url": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400"},
            {"name": "Crispy Chicken Burger", "description": "Buttermilk-brined fried chicken thigh with coleslaw, pickles and honey mustard", "price": 12.49, "image_url": "https://images.unsplash.com/photo-1562967914-608f82629710?w=400"},
            {"name": "Loaded Fries",          "description": "Thick-cut fries topped with cheese sauce, jalapeños, bacon bits and sour cream", "price": 7.99,  "image_url": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400"},
            {"name": "Onion Rings",           "description": "Beer-battered sweet onion rings served with chipotle ranch dipping sauce", "price": 5.99,  "image_url": "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400"},
            {"name": "Vanilla Milkshake",     "description": "Hand-spun thick shake made with premium vanilla ice cream and whole milk", "price": 6.49,  "image_url": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400"},
            {"name": "Chocolate Lava Cake",   "description": "Warm dark chocolate cake with a molten centre, served with vanilla bean ice cream", "price": 7.99,  "image_url": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400"},
        ]
    },
    {
        "owner": "sara",
        "data": {
            "restaurant_name": "Green Bowl",
            "description": "Vibrant plant-based bowls, cold-pressed juices and nourishing superfood salads. Healthy food that tastes extraordinary — no compromise on flavour.",
            "location": "Juhu, Mumbai",
            "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800"
        },
        "menu": [
            {"name": "Açaí Power Bowl",       "description": "Organic açaí blended with banana and almond milk, topped with granola, berries and honey", "price": 12.99, "image_url": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400"},
            {"name": "Buddha Bowl",           "description": "Brown rice, roasted chickpeas, avocado, edamame, cucumber and tahini dressing", "price": 13.49, "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"},
            {"name": "Avocado Toast",         "description": "Smashed avocado with cherry tomatoes, microgreens and everything bagel seasoning on sourdough", "price": 10.99, "image_url": "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400"},
            {"name": "Quinoa Salad",          "description": "Tri-colour quinoa with roasted vegetables, dried cranberries, almonds and lemon vinaigrette", "price": 11.49, "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400"},
            {"name": "Green Goddess Smoothie","description": "Spinach, mango, coconut water, ginger and chia seeds — your daily greens made delicious", "price": 7.49,  "image_url": "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400"},
            {"name": "Chia Seed Pudding",     "description": "Coconut milk chia pudding topped with passion fruit, mango slices and toasted coconut", "price": 8.99,  "image_url": "https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=400"},
            {"name": "Falafel Wrap",          "description": "Crispy herbed falafels, hummus, tabouleh and pickled vegetables in a whole-wheat tortilla", "price": 10.49, "image_url": "https://images.unsplash.com/photo-1592415499556-74fcb9f18667?w=400"},
            {"name": "Turmeric Latte",        "description": "Golden milk with steamed oat milk, turmeric, cinnamon, ginger and black pepper", "price": 5.49,  "image_url": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400"},
        ]
    },
]

print("\n🍽️  Seeding restaurants and menus...")
for r in RESTAURANTS:
    token = owners[r["owner"]]
    if not token:
        print(f"  ✗ Cannot create restaurant — owner login failed")
        continue
    rest = post("/api/restaurants", r["data"], token=token)
    if not rest:
        continue
    rid = rest["id"]
    print(f"  ✓  Restaurant #{rid}: {r['data']['restaurant_name']}")
    for item in r["menu"]:
        mi = post(f"/api/restaurants/{rid}/menu", {**item, "is_available": True}, token=token)
        if mi:
            print(f"       + {item['name']}  ${item['price']}")
        time.sleep(0.05)

print("\n✅  Seeding complete!")
print("   Visit http://localhost:8000 to explore the populated app.\n")
