import os
from datetime import datetime
from typing import Generator
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Numeric, 
    Boolean, DateTime, ForeignKey, Text, CheckConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

# Database URL configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/food_delivery"
)

if "sqlite" in DATABASE_URL:
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Database Models ---

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # Customer, Restaurant Owner, Delivery Partner, Admin
    created_at = Column(DateTime, default=datetime.utcnow)

    addresses = relationship("UserAddress", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    delivery_partner = relationship("DeliveryPartner", back_populates="user", uselist=False)

class UserAddress(Base):
    __tablename__ = "user_addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    address_line = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_default = Column(Boolean, default=False)

    user = relationship("User", back_populates="addresses")

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    restaurant_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    rating = Column(Numeric(3, 2), default=0.0)
    location = Column(String(255), nullable=False)
    image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    menu_items = relationship("MenuItem", back_populates="restaurant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="restaurant")
    reviews = relationship("Review", back_populates="restaurant", cascade="all, delete-orphan")

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(String(255), nullable=True)
    is_available = Column(Boolean, default=True)

    restaurant = relationship("Restaurant", back_populates="menu_items")
    order_items = relationship("OrderItem", back_populates="menu_item")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="SET NULL"), nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    order_status = Column(String(50), default="Created", nullable=False)  # Created, Paid, Preparing, Assigned, OutForDelivery, Delivered, Cancelled
    delivery_address = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    restaurant = relationship("Restaurant", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")
    deliveries = relationship("OrderDelivery", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="order_items")
    menu_item = relationship("MenuItem", back_populates="order_items")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    payment_status = Column(String(50), default="Pending", nullable=False)  # Pending, Completed, Failed, Refunded
    transaction_id = Column(String(100), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payment")

class DeliveryPartner(Base):
    __tablename__ = "delivery_partners"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    vehicle_type = Column(String(50), nullable=True)
    is_available = Column(Boolean, default=True)

    user = relationship("User", back_populates="delivery_partner")
    deliveries = relationship("OrderDelivery", back_populates="delivery_partner")

class OrderDelivery(Base):
    __tablename__ = "order_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    delivery_partner_id = Column(Integer, ForeignKey("delivery_partners.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="Assigned", nullable=False)  # Assigned, PickedUp, OutForDelivery, Delivered, Cancelled
    assigned_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="deliveries")
    delivery_partner = relationship("DeliveryPartner", back_populates="deliveries")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, CheckConstraint("rating >= 1 AND rating <= 5"), nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reviews")
    restaurant = relationship("Restaurant", back_populates="reviews")

# Database initialization helper
def init_db():
    Base.metadata.create_all(bind=engine)
