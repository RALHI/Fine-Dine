import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Store, ShoppingBag, Pizza } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext.jsx';

export default function RestaurantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { format } = useCurrency();
  const restaurantId = parseInt(id);

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRestaurantDetails();
    fetchMenu();
    fetchReviews();
    loadCart();
  }, [id]);

  const loadCart = () => {
    const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(localCart);
  };

  const fetchRestaurantDetails = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}`);
      const data = await response.json();
      setRestaurant(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/menu`);
      const data = await response.json();
      setMenuItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/reviews`);
      const data = await response.json();
      if (response.ok) {
        setReviews(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to submit a review.');
      return;
    }

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });

      if (response.ok) {
        setComment('');
        fetchReviews();
        fetchRestaurantDetails(); // Reload average rating
      } else {
        alert('Could not submit review.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateCartQty = (item, delta) => {
    let localCart = JSON.parse(localStorage.getItem('cart') || '[]');

    // Block cross-restaurant orders
    const crossOrder = localCart.find(i => i.restaurant_id !== restaurantId);
    if (crossOrder) {
      if (window.confirm("You can only order from one restaurant at a time. Clear your cart to order from this restaurant?")) {
        localCart = [];
      } else {
        return;
      }
    }

    let existing = localCart.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += delta;
      if (existing.quantity <= 0) {
        localCart = localCart.filter(i => i.id !== item.id);
      }
    } else if (delta > 0) {
      localCart.push({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        image_url: item.image_url || '',
        quantity: delta,
        restaurant_id: restaurantId,
        restaurant_name: restaurant?.restaurant_name || ''
      });
    }

    localStorage.setItem('cart', JSON.stringify(localCart));
    setCart(localCart);
    
    // Custom event to update header badge
    window.dispatchEvent(new Event('cartUpdate'));
  };

  const getItemQty = (itemId) => {
    const match = cart.find(i => i.id === itemId);
    return match ? match.quantity : 0;
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const goToCheckout = () => {
    if (!localStorage.getItem('token')) {
      navigate('/auth?mode=login&redirect=checkout');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div>
      {/* Banner */}
      {restaurant && (
        <div className="restaurant-banner" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="restaurant-banner-img" style={{ width: '120px', height: '120px', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', overflow: 'hidden' }}>
            {restaurant.image_url ? (
              <img src={restaurant.image_url} alt={restaurant.restaurant_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Store size={36} />
            )}
          </div>
          <div style={{ flexGrow: 1 }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>{restaurant.restaurant_name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '8px' }}>{restaurant.description || 'Gourmet items prepared fresh daily.'}</p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {restaurant.location}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={14} fill="#FBBF24" color="#FBBF24" /> {restaurant.rating || '0.0'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px' }}>
        {/* Menu & Reviews */}
        <div>
          <div className="menu-section">
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Our Menu</h2>
            
            {isLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>Fetching dishes...</p>
            ) : menuItems.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No items listed on menu yet.</p>
            ) : (
              <div>
                {menuItems.map(item => (
                  <div key={item.id} className="menu-item-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '16px', transition: 'var(--transition)' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '8px', backgroundColor: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Pizza size={24} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600 }}>{item.name}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.description || ''}</p>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '15px', display: 'block', marginTop: '4px' }}>
                          {format(parseFloat(item.price))}
                        </span>
                      </div>
                    </div>

                    <div className="qty-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {item.is_available ? (
                        <>
                          <button className="qty-btn" onClick={() => updateCartQty(item, -1)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 600 }}>-</button>
                          <span style={{ fontWeight: 600, width: '16px', textAlign: 'center' }}>{getItemQty(item.id)}</span>
                          <button className="qty-btn" onClick={() => updateCartQty(item, 1)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 600 }}>+</button>
                        </>
                      ) : (
                        <span style={{ color: '#EF4444', fontSize: '13px', fontWeight: 600 }}>Sold Out</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews List */}
          <div style={{ marginTop: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Customer Reviews</h2>

            {/* Review form if Customer role */}
            {localStorage.getItem('token') && localStorage.getItem('role') === 'Customer' && (
              <div className="card" style={{ marginBottom: '24px', backgroundColor: 'var(--surface)', padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Write a Review</h3>
                <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Rating</label>
                    <select value={rating} onChange={(e) => setRating(parseInt(e.target.value))} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white' }}>
                      <option value="5">5 Stars (Excellent)</option>
                      <option value="4">4 Stars (Good)</option>
                      <option value="3">3 Stars (Average)</option>
                      <option value="2">2 Stars (Poor)</option>
                      <option value="1">1 Star (Terrible)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Comment</label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="3" required placeholder="Share your experience..." style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }}></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'fit-content' }}>Submit Review</button>
                </form>
              </div>
            )}

            {/* Render reviews */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.length === 0 ? (
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                  <div style={{ color: '#FBBF24', display: 'flex', gap: '2px', marginBottom: '6px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={14} fill="#FBBF24" color="#FBBF24" />
                    ))}
                  </div>
                  <p style={{ fontSize: '14px' }}>Absolutely delicious! Pasta was fresh and packaging kept it very warm. Recommend highly.</p>
                  <small style={{ color: 'var(--text-muted)' }}>Posted on 2026-06-12</small>
                </div>
              ) : (
                reviews.map(rev => (
                  <div key={rev.id} style={{ padding: '16px', borderBottom: '1px solid var(--border)', marginBottom: '12px' }}>
                    <div style={{ color: '#FBBF24', display: 'flex', gap: '2px', marginBottom: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={14} fill={star <= rev.rating ? '#FBBF24' : 'none'} color="#FBBF24" />
                      ))}
                    </div>
                    <p style={{ fontSize: '14px' }}>{rev.comment || 'No comment left.'}</p>
                    <small style={{ color: 'var(--text-muted)' }}>Posted on {new Date(rev.created_at).toLocaleDateString()}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar cart summary */}
        <aside style={{ position: 'sticky', top: '96px', height: 'fit-content' }}>
          <div className="card" style={{ background: 'white', borderColor: 'var(--border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag style={{ color: 'var(--primary)' }} /> Cart Summary
            </h3>

            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
              {cart.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>Cart is empty.</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
                    <span>{item.quantity}x {item.name}</span>
                    <span style={{ fontWeight: 600 }}>{format(item.price * item.quantity)}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div className="flex-between" style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>
                <span>Subtotal</span>
                <span>{format(subtotal)}</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={goToCheckout}
                style={{ width: '100%' }}
                disabled={cart.length === 0}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
