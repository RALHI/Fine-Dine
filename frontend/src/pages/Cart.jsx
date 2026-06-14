import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Pizza, ShoppingCart } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext.jsx';

export default function Cart() {
  const navigate = useNavigate();
  const { format, currency } = useCurrency();
  const [cart, setCart] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [discountRate, setDiscountRate] = useState(0);
  const [promoMsg, setPromoMsg] = useState({ text: '', isError: false });

  useEffect(() => {
    loadCart();
    // Pre-fill promo from storage if active
    if (localStorage.getItem('promo_code') === 'FEAST20') {
      setDiscountRate(0.20);
      setPromoCode('FEAST20');
      setPromoMsg({ text: 'Coupon FEAST20 applied! 20% discount added.', isError: false });
    }
  }, []);

  const loadCart = () => {
    const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(localCart);
  };

  const updateQty = (itemId, delta) => {
    let localCart = [...cart];
    let match = localCart.find(i => i.id === itemId);
    if (match) {
      match.quantity += delta;
      if (match.quantity <= 0) {
        localCart = localCart.filter(i => i.id !== itemId);
      }
    }
    localStorage.setItem('cart', JSON.stringify(localCart));
    setCart(localCart);
    window.dispatchEvent(new Event('cartUpdate'));
  };

  const removeItem = (itemId) => {
    const localCart = cart.filter(i => i.id !== itemId);
    localStorage.setItem('cart', JSON.stringify(localCart));
    setCart(localCart);
    window.dispatchEvent(new Event('cartUpdate'));
  };

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'FEAST20') {
      setDiscountRate(0.20);
      localStorage.setItem('promo_code', 'FEAST20');
      setPromoMsg({ text: 'Coupon FEAST20 applied! 20% discount added.', isError: false });
    } else {
      setDiscountRate(0);
      localStorage.removeItem('promo_code');
      setPromoMsg({ text: 'Invalid coupon code.', isError: true });
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * discountRate;
  const netSubtotal = subtotal - discountAmount;
  const deliveryFee = cart.length > 0 ? 3.99 : 0;
  const tax = netSubtotal * 0.05;
  const total = netSubtotal + deliveryFee + tax;

  const handleCheckout = () => {
    if (!localStorage.getItem('token')) {
      navigate('/auth?mode=login&redirect=checkout');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShoppingCart style={{ color: 'var(--primary)' }} /> Your Cart
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
        {/* Items Table */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Your cart is currently empty.</p>
          ) : (
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-muted)', paddingBottom: '12px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '80px 1fr 120px 120px 40px', gap: '16px' }}>
                <span>Dish</span>
                <span>Name</span>
                <span>Quantity</span>
                <span>Total</span>
                <span></span>
              </div>
              
              {cart.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 120px 40px', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)', gap: '16px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '8px', backgroundColor: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Pizza size={24} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '15px' }}>{item.name}</h4>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.restaurant_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>-</button>
                    <span style={{ fontWeight: 600, width: '16px', textAlign: 'center' }}>{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>+</button>
                  </div>
                  <span style={{ fontWeight: 600 }}>{format(item.price * item.quantity)}</span>
                  <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-outline btn-sm" onClick={() => navigate('/restaurants')} style={{ marginTop: '24px' }}>
            <ArrowLeft size={14} /> Continue Shopping
          </button>
        </div>

        {/* Order Pricing Breakdown */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Order Summary</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
            <span>Items Subtotal</span>
            <span>{format(subtotal)}</span>
          </div>

          {discountRate > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: 'var(--primary)' }}>
              <span>Discount (Promo)</span>
              <span>-{format(discountAmount)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
            <span>Delivery Fee</span>
            <span>{format(deliveryFee)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
            <span>Estimated Tax (5%)</span>
            <span>{format(tax)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px', color: 'var(--text)' }}>
            <span>Total Amount</span>
            <span>{format(total)}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '24px', marginBottom: '16px' }}>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="FEAST20"
              style={{ flexGrow: 1, border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', background: 'white' }}
            />
            <button className="btn btn-outline btn-sm" onClick={applyPromo}>Apply</button>
          </div>

          {promoMsg.text && (
            <div style={{ fontSize: '13px', marginTop: '-8px', marginBottom: '16px', color: promoMsg.isError ? '#DC2626' : '#047857' }}>
              {promoMsg.text}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            style={{ width: '100%' }}
          >
            Go to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
