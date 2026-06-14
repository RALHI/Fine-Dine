# Order Cancellation and Editing Grace Period

This plan outlines the addition of a 30-second grace period for newly created orders, allowing customers to either cancel their order completely or edit it (add/delete items) before the restaurant begins processing it.

## Proposed Changes

---

### Backend Service (Order Service)

#### [MODIFY] [order_service/main.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/order_service/main.py)
- **New Endpoint**: Create a `POST /api/orders/{id}/cancel` endpoint restricted to the `Customer` role.
- **Validation Rules**: 
  - The endpoint will verify that the user making the request owns the order.
  - It will ensure the order status is currently `"Created"`.
  - It will verify that the current time is within **30 seconds** of the order's `created_at` timestamp.
- **Action**: If validation passes, the status of the order will be updated to `"Cancelled"` and committed to the database.

---

### Frontend React Application

#### [MODIFY] [Dashboards.jsx](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/src/pages/Dashboards.jsx)
- **UI Grace Period Logic**: Add visual logic in the `CustomerDashboard` order history list. If an order's status is `"Created"` and the time elapsed since `created_at` is under 30 seconds, a "Grace Period" countdown timer will be displayed on the UI.
- **New Actions**:
  - **Cancel Order Button**: Triggers the new backend `POST /api/orders/{id}/cancel` endpoint. Upon success, refreshes the order list.
  - **Edit Order Button**: 
    1. Triggers the cancel endpoint.
    2. Uses the `order_items` returned from the API to dynamically fetch the restaurant's menu items.
    3. Seamlessly restores the `cart` in local storage with the exact quantities and prices of the previous order.
    4. Redirects the user directly back to the restaurant's menu page (`/restaurant/{id}`), allowing them to add or remove items with their pre-filled cart.

## User Review Required

> [!IMPORTANT]
> The "Edit Order" flow will automatically cancel the existing order and convert it back into an active cart session, redirecting the user to the restaurant page to make changes. This guarantees that stock and payment states remain consistent while giving the user full flexibility to modify the order. Does this behavior align with your expectations?

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
1. I will place a new order using the Checkout page.
2. I will instantly navigate to the Customer Dashboard.
3. I will verify that a countdown timer appears for 30 seconds.
4. I will click "Cancel Order" to ensure the order correctly updates its status to "Cancelled".
5. I will place another order, and within 30 seconds, click "Edit Order".
6. I will verify that the order is cancelled, my cart is restored, and I am redirected to the restaurant page.
