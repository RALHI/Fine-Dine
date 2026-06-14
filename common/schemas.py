from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from datetime import datetime
from decimal import Decimal

# --- User Service Schemas ---

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field("Customer", pattern="^(Customer|Restaurant Owner|Delivery Partner|Admin)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str

class UserAddressCreate(BaseModel):
    address_line: str = Field(..., max_length=255)
    city: str = Field(..., max_length=100)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool = False

class UserAddressResponse(BaseModel):
    id: int
    user_id: int
    address_line: str
    city: str
    latitude: Optional[float]
    longitude: Optional[float]
    is_default: bool

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Restaurant Service Schemas ---

class MenuItemCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    image_url: Optional[str] = None
    is_available: bool = True

class MenuItemResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    description: Optional[str]
    price: Decimal
    image_url: Optional[str]
    is_available: bool

    class Config:
        from_attributes = True

class RestaurantCreate(BaseModel):
    restaurant_name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    location: str = Field(..., max_length=255)
    image_url: Optional[str] = None

class RestaurantResponse(BaseModel):
    id: int
    owner_id: Optional[int]
    restaurant_name: str
    description: Optional[str]
    rating: float
    location: str
    image_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    user_id: Optional[int]
    restaurant_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Order Service Schemas ---

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = Field(..., gt=0)

class OrderCreateRequest(BaseModel):
    restaurant_id: int
    delivery_address: str = Field(..., min_length=5)
    items: List[OrderItemCreate]

class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: Optional[int]
    quantity: int
    price: Decimal

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    user_id: Optional[int]
    restaurant_id: Optional[int]
    total_amount: Decimal
    order_status: str
    delivery_address: str
    created_at: datetime
    order_items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True

class OrderUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(Created|Paid|Preparing|Assigned|OutForDelivery|Delivered|Cancelled)$")

# --- Payment Service Schemas ---

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    payment_status: str
    transaction_id: Optional[str]
    amount: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

# --- Delivery Service Schemas ---

class DeliveryPartnerCreate(BaseModel):
    phone: str = Field(..., max_length=20)
    vehicle_type: Optional[str] = None

class DeliveryPartnerResponse(BaseModel):
    id: int
    user_id: int
    name: str
    phone: str
    vehicle_type: Optional[str]
    is_available: bool

    class Config:
        from_attributes = True

class OrderDeliveryResponse(BaseModel):
    id: int
    order_id: int
    delivery_partner_id: Optional[int]
    status: str
    assigned_at: datetime
    delivered_at: Optional[datetime]

    class Config:
        from_attributes = True

# --- Chatbot Service Schemas ---

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class ChatResponse(BaseModel):
    response: str
    citations: List[str] = []
    session_id: str
