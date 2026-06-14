import React, { useState, useEffect } from 'react';
import { useNavigate as useReactNav } from 'react-router-dom';
import { MapPin, CreditCard, Wallet, Plus, QrCode, Smartphone, Banknote } from 'lucide-react';
import AddressMapSelector from '../components/AddressMapSelector.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

export default function Checkout() {
  const navigate = useReactNav();
  const { format, rates } = useCurrency();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [line, setLine] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [cart, setCart] = useState([]);
  const [error, setError] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/auth');
      return;
    }
    fetchAddresses();
    loadCart();
  }, []);

  const loadCart = () => {
    const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (localCart.length === 0) {
      navigate('/cart');
      return;
    }
    setCart(localCart);
  };

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAddresses(data);

      if (data.length > 0) {
        const defaultAddr = data.find(a => a.is_default) || data[0];
        setSelectedAddrId(defaultAddr.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!line.trim() || !city.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          address_line: line,
          city: city,
          latitude: lat,
          longitude: lng,
          is_default: true
        })
      });

      if (response.ok) {
        setLine('');
        setCity('');
        setLat(null);
        setLng(null);
        setShowNewForm(false);
        fetchAddresses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddrId) {
      setError('Please add or select a delivery address.');
      return;
    }

    const addrObj = addresses.find(a => a.id === selectedAddrId);
    const fullAddress = `${addrObj.address_line}, ${addrObj.city}`;

    const itemsPayload = cart.map(i => ({
      menu_item_id: i.id,
      quantity: i.quantity
    }));

    setIsPlacing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          restaurant_id: cart[0].restaurant_id,
          delivery_address: fullAddress,
          items: itemsPayload
        })
      });

      const data = await response.json();
      setIsPlacing(false);

      if (response.ok) {
        localStorage.removeItem('cart');
        localStorage.removeItem('promo_code');
        window.dispatchEvent(new Event('cartUpdate'));
        navigate(`/dashboard?order_id=${data.id}`);
      } else {
        setError(data.detail || 'Error checkout order.');
      }
    } catch (err) {
      setIsPlacing(false);
      setError('Failed to connect to Order Service.');
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  if (localStorage.getItem('promo_code') === 'FEAST20') {
    discount = subtotal * 0.20;
  }
  const codFeeUsd = paymentMethod === 'cod' ? (20 / (rates['INR'] || 83.5)) : 0;
  const total = (subtotal - discount) + ((subtotal - discount) * 0.05) + codFeeUsd;

  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '24px' }}>Checkout</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
        {/* Main Columns */}
        <div>
          {/* Address Step */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <MapPin size={20} style={{ color: 'var(--primary)' }} /> 1. Delivery Address
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {addresses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No addresses saved yet. Please add a destination.</p>
              ) : (
                addresses.map(addr => {
                  const isSel = addr.id === selectedAddrId;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddrId(addr.id)}
                      style={{
                        border: '1px solid var(--border)',
                        borderColor: isSel ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: isSel ? 'var(--primary-light)' : 'white',
                        borderRadius: '8px',
                        padding: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, display: 'block' }}>{addr.address_line}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{addr.city}</span>
                      </div>
                      <input
                        type="radio"
                        name="addr_r"
                        checked={isSel}
                        onChange={() => setSelectedAddrId(addr.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  );
                })
              )}
            </div>

            <button className="btn btn-outline btn-sm" onClick={() => setShowNewForm(!showNewForm)} style={{ marginTop: '16px' }}>
              <Plus size={14} /> Add New Address
            </button>

            {showNewForm && (
              <form onSubmit={handleSaveAddress} style={{ marginTop: '16px', backgroundColor: 'var(--surface)', padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>New Address Details</h4>
                <AddressMapSelector
                  addressLine={line}
                  setAddressLine={setLine}
                  city={city}
                  setCity={setCity}
                  latitude={lat}
                  setLatitude={setLat}
                  longitude={lng}
                  setLongitude={setLng}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Address Line</label>
                    <input id="address-line-input" type="text" required value={line} onChange={(e) => setLine(e.target.value)} placeholder="123 Main St, Apt 4B" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>City</label>
                    <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'fit-content' }}>Save Address</button>
                </div>
              </form>
            )}
          </div>

          {/* Payment step */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <CreditCard size={20} style={{ color: 'var(--primary)' }} /> 2. Payment Method
            </h3>

            {[
              { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
              { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
              { id: 'cod', label: 'Cash on Delivery (COD)', icon: Banknote },
              { id: 'upi', label: 'UPI', icon: Smartphone }
            ].map(pm => (
              <div
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  border: '1px solid var(--border)',
                  borderColor: paymentMethod === pm.id ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: paymentMethod === pm.id ? 'var(--primary-light)' : 'white',
                  borderRadius: '8px', padding: '14px', cursor: 'pointer',
                  fontWeight: 500, transition: 'var(--transition)', marginBottom: '12px'
                }}
              >
                <input type="radio" checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id)} style={{ cursor: 'pointer' }} />
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <pm.icon size={18} /> {pm.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Side summary card */}
        <aside>
          <div className="card" style={{ background: 'white', borderColor: 'var(--border)', position: 'sticky', top: '96px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Order Summary</h3>

            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '16px' }}>
              {cart.map(item => (
                <div key={item.id} className="flex-between" style={{ fontSize: '14px', marginBottom: '12px' }}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>{format(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex-between" style={{ fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span>{format(subtotal)}</span>
              </div>
              {paymentMethod === 'cod' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>COD Fee</span>
                  <span>{format(codFeeUsd)}</span>
                </div>
              )}
              <div className="flex-between" style={{ fontWeight: 700, fontSize: '18px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>{format(total)}</span>
              </div>

              {error && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
                  {error}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handlePlaceOrder}
                disabled={isPlacing || cart.length === 0}
                style={{ width: '100%', marginTop: '24px', padding: '14px' }}
              >
                {isPlacing ? 'Placing Order...' : `Place Order (${format(total)})`}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
