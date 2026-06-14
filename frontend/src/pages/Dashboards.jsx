import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, Star, MapPin, ChefHat, Truck, CreditCard, 
  ShoppingCart, Check, Bike, Users, Store, Award,
  Trash2, Edit3, Save, Upload, X, Image, Plus,
  QrCode, Smartphone, CheckCircle, Clock
} from 'lucide-react';
import MenuImageScanner from '../components/MenuImageScanner.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

const OrderGracePeriod = ({ order, onCancel, onEdit }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const calcTime = () => {
      let dateStr = order.created_at;
      if (!dateStr.endsWith('Z')) dateStr += 'Z';
      const created = new Date(dateStr).getTime();
      const diff = Math.floor((Date.now() - created) / 1000);
      return Math.max(0, 30 - diff);
    };

    setTimeLeft(calcTime());
    const timer = setInterval(() => {
      const remaining = calcTime();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order.created_at]);

  if (timeLeft <= 0) return null;

  return (
    <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <span style={{ color: '#B91C1C', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} /> Grace Period: {timeLeft}s
        </span>
        <p style={{ color: '#991B1B', fontSize: '12px', margin: 0 }}>You can still cancel or edit your order before the restaurant prepares it.</p>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-outline btn-sm" onClick={() => onEdit(order)} style={{ background: 'white' }}>Edit Order</button>
        <button className="btn btn-outline btn-sm" onClick={() => onCancel(order)} style={{ background: 'white', color: '#B91C1C', borderColor: '#FCA5A5' }}>Cancel</button>
      </div>
    </div>
  );
};

// --- CUSTOMER DASHBOARD ---
export function CustomerDashboard() {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [cancelPromptOrder, setCancelPromptOrder] = useState(null);
  
  const [savedPayments, setSavedPayments] = useState([
    { id: 'credit', title: 'Credit Card', desc: 'Ending in 4242', icon: 'CreditCard' },
    { id: 'debit', title: 'Debit Card', desc: 'Ending in 8899', icon: 'CreditCard' },
    { id: 'upi', title: 'UPI ID', desc: 'customer@bank', icon: 'Smartphone' }
  ]);

  const iconMap = {
    CreditCard: CreditCard,
    QrCode: QrCode,
    Smartphone: Smartphone
  };

  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState('Credit Card');
  const [newPaymentDetails, setNewPaymentDetails] = useState({ number: '', expiry: '', cvv: '', upi_id: '' });
  const [savePaymentMethod, setSavePaymentMethod] = useState(true);

  const handleSavePaymentForm = (e) => {
    e.preventDefault();
    let desc = 'Linked';
    let iconStr = 'CreditCard';
    
    if (newPaymentType === 'Credit Card' || newPaymentType === 'Debit Card') {
      const last4 = newPaymentDetails.number.slice(-4) || 'XXXX';
      desc = `Ending in ${last4}`;
    } else if (newPaymentType === 'UPI') {
      desc = newPaymentDetails.upi_id || 'customer@upi';
      iconStr = 'Smartphone';
    }

    if (savePaymentMethod) {
      setSavedPayments([...savedPayments, {
        id: Date.now().toString(),
        title: newPaymentType,
        desc: desc,
        icon: iconStr
      }]);
    }

    setShowAddPaymentForm(false);
    setNewPaymentDetails({ number: '', expiry: '', cvv: '', upi_id: '' });
    setNewPaymentType('Credit Card');
    setSavePaymentMethod(true);
  };

  const handleRemovePayment = (id) => {
    if (window.confirm("Are you sure you want to remove this payment method?")) {
      setSavedPayments(savedPayments.filter(pm => pm.id !== id));
    }
  };

  useEffect(() => {
    setProfileName(localStorage.getItem('name') || 'Customer');
    setProfileEmail(localStorage.getItem('email') || 'customer@fooddash.com');
    fetchAddresses();
    fetchOrders();

    // Setup polling for order status tracking updates (every 5 seconds)
    const timer = setInterval(fetchOrders, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleCancelOrder = (order) => {
    setCancelPromptOrder(order);
  };

  const confirmCancelOrder = async () => {
    if (!cancelPromptOrder) return;
    const order = cancelPromptOrder;
    setCancelPromptOrder(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to cancel order");
        fetchOrders();
      }
    } catch (e) {
      alert("Error cancelling order");
    }
  };

  const handleEditOrder = async (order) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        const data = await res.json();
        alert("Cannot edit: " + (data.detail || "Failed to cancel order"));
        fetchOrders();
        return;
      }
      
      const menuRes = await fetch(`/api/restaurants/${order.restaurant_id}/menu`);
      if (menuRes.ok) {
        const menuItems = await menuRes.json();
        const newCart = order.order_items.map(oi => {
          const menuItem = menuItems.find(m => m.id === oi.menu_item_id);
          return {
            id: oi.menu_item_id,
            name: menuItem ? menuItem.name : 'Unknown Item',
            price: parseFloat(oi.price),
            quantity: oi.quantity,
            restaurant_id: order.restaurant_id,
            image_url: menuItem ? menuItem.image_url : ''
          };
        });
        
        localStorage.setItem('cart', JSON.stringify(newCart));
        window.dispatchEvent(new Event('cartUpdate'));
        navigate(`/restaurants/${order.restaurant_id}`);
      } else {
        alert("Order cancelled but failed to restore cart. Please rebuild it.");
        fetchOrders();
      }
    } catch (e) {
      alert("Error editing order");
    }
  };

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAddresses(data);
    } catch (err) { console.error(err); }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setOrders(data);
    } catch (err) { console.error(err); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Created': return '#3B82F6';
      case 'Paid': return '#10B981';
      case 'Preparing': return '#F59E0B';
      case 'Assigned': return '#8B5CF6';
      case 'OutForDelivery': return '#EC4899';
      case 'Delivered': return '#059669';
      case 'Cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderOrderTracking = (status) => {
    const steps = ['Created', 'Paid', 'Preparing', 'OutForDelivery', 'Delivered'];
    const stepLabels = {
      'Created': 'Order Placed',
      'Paid': 'Paid',
      'Preparing': 'Preparing',
      'OutForDelivery': 'Out For Delivery',
      'Delivered': 'Delivered'
    };
    const stepIcons = {
      'Created': ShoppingCart,
      'Paid': CreditCard,
      'Preparing': ChefHat,
      'OutForDelivery': Truck,
      'Delivered': Check
    };

    let activeIdx = steps.indexOf(status);
    if (activeIdx === -1 && status === 'Assigned') activeIdx = 2; // Rider assigned matches preparing state

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', position: 'relative' }}>
        <div style={{ content: '""', position: 'absolute', top: '15px', left: '20px', right: '20px', height: '4px', backgroundColor: 'var(--border)', zIndex: 1 }}></div>
        {steps.map((step, idx) => {
          const isComp = idx <= activeIdx;
          const IconComp = stepIcons[step];
          return (
            <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, fontSize: '11px', fontWeight: 600, color: isComp ? 'var(--primary)' : 'var(--text-muted)', width: '80px', textAlign: 'center' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: isComp ? 'var(--primary)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '8px' }}>
                <IconComp size={16} />
              </div>
              <span>{stepLabels[step]}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const NavButton = ({ id, label, icon: Icon }) => (
    <button 
      onClick={() => setActiveTab(id)} 
      style={{ 
        width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '8px', border: 'none', 
        background: activeTab === id ? 'var(--primary-light)' : 'transparent', 
        color: activeTab === id ? 'var(--primary)' : 'var(--text-muted)', 
        fontWeight: activeTab === id ? 700 : 500, 
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'var(--transition)' 
      }}>
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
      <aside style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', height: 'fit-content' }}>
        <div className="text-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontSize: '32px', fontWeight: 700, margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profileName.charAt(0).toUpperCase()}
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{profileName}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{profileEmail}</p>
          <span className="badge btn-primary btn-sm" style={{ textTransform: 'uppercase', fontSize: '10px', marginTop: '16px' }}>Customer</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <NavButton id="orders" label="Your Orders" icon={ShoppingBag} />
          <NavButton id="addresses" label="Your Addresses" icon={MapPin} />
          <NavButton id="payments" label="Your Cards" icon={CreditCard} />
          <NavButton id="rewards" label="Rewards" icon={Award} />
        </nav>
      </aside>

      <section>
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>Active Tracking & Order History</h2>
            {orders.length === 0 ? (
              <div className="card text-center" style={{ padding: '40px', background: 'white' }}>
                <ShoppingBag size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 16px auto' }} />
                <h3 style={{ fontWeight: 700 }}>No orders placed yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>Order food items to track delivery updates here.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/restaurants')} style={{ width: 'fit-content', margin: '0 auto' }}>Explore Restaurants</button>
              </div>
            ) : (
              [...orders].sort((a,b) => b.id - a.id).map(order => {
                const isFin = order.order_status === 'Delivered' || order.order_status === 'Cancelled';
                return (
                  <div key={order.id} className="order-item-box" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', background: 'white', marginBottom: '20px' }}>
                    <div className="flex-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Order #{order.id}</h3>
                        <small style={{ color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleString()}</small>
                      </div>
                      <span className="badge" style={{ backgroundColor: getStatusColor(order.order_status), fontSize: '12px' }}>
                        {order.order_status}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '16px' }}>
                      <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Delivery Destination:</span>
                      <span style={{ color: 'var(--text-muted)' }}>{order.delivery_address}</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: '14px', fontWeight: 700 }}>
                      <span>Paid Total:</span>
                      <span style={{ color: 'var(--primary)', fontSize: '16px' }}>{format(order.total_amount)}</span>
                    </div>
                    {order.order_status === 'Created' && (
                      <OrderGracePeriod order={order} onCancel={handleCancelOrder} onEdit={handleEditOrder} />
                    )}
                    {!isFin && renderOrderTracking(order.order_status)}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Saved Addresses</h2>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/checkout')}><Plus size={16} /> Add New</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {addresses.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: 'white', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', gridColumn: '1 / -1' }}>
                  <MapPin size={40} style={{ color: 'var(--border)', margin: '0 auto 16px auto' }} />
                  <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No saved addresses</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>Add a delivery location when you checkout your next order.</p>
                </div>
              ) : (
                addresses.map(addr => (
                  <div key={addr.id} style={{ padding: '24px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', position: 'relative' }}>
                    {addr.is_default && <span className="badge btn-primary btn-sm" style={{ position: 'absolute', top: '24px', right: '24px', fontSize: '10px' }}>DEFAULT</span>}
                    <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', paddingRight: '70px' }}>{addr.address_line}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>{addr.city}</p>
                    <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1 }}><Edit3 size={14} /> Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }}><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Payment Methods</h2>
              {!showAddPaymentForm && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddPaymentForm(true)}><Plus size={16} /> Add New</button>
              )}
            </div>

            {showAddPaymentForm && (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Add New Payment Method</h3>
                <form onSubmit={handleSavePaymentForm}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Method Type</label>
                    <select 
                      className="form-control" 
                      value={newPaymentType} 
                      onChange={(e) => setNewPaymentType(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                    >
                      <option>Credit Card</option>
                      <option>Debit Card</option>
                      <option>UPI</option>
                    </select>
                  </div>

                  {(newPaymentType === 'Credit Card' || newPaymentType === 'Debit Card') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Card Number</label>
                        <input type="text" className="form-control" placeholder="0000 0000 0000 0000" maxLength="16" value={newPaymentDetails.number} onChange={e => setNewPaymentDetails({...newPaymentDetails, number: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Expiry (MM/YY)</label>
                        <input type="text" className="form-control" placeholder="MM/YY" maxLength="5" value={newPaymentDetails.expiry} onChange={e => setNewPaymentDetails({...newPaymentDetails, expiry: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>CVV</label>
                        <input type="password" className="form-control" placeholder="123" maxLength="3" value={newPaymentDetails.cvv} onChange={e => setNewPaymentDetails({...newPaymentDetails, cvv: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                      </div>
                    </div>
                  )}

                  {newPaymentType === 'UPI' && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>UPI ID</label>
                      <input type="text" className="form-control" placeholder="username@bank" value={newPaymentDetails.upi_id} onChange={e => setNewPaymentDetails({...newPaymentDetails, upi_id: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <input type="checkbox" id="saveMethod" checked={savePaymentMethod} onChange={e => setSavePaymentMethod(e.target.checked)} style={{ cursor: 'pointer' }} />
                    <label htmlFor="saveMethod" style={{ fontSize: '14px', cursor: 'pointer' }}>Save this payment detail securely for future checkouts</label>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Method</button>
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddPaymentForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {savedPayments.map(pm => {
                const IconComponent = iconMap[pm.icon] || CreditCard;
                return (
                  <div key={pm.id} style={{ padding: '24px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <IconComponent size={24} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{pm.title}</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{pm.desc}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1, color: 'var(--primary)', borderColor: 'var(--primary)' }} disabled><CheckCircle size={14} /> Linked</button>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRemovePayment(pm.id)}><Trash2 size={14} /> Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>Rewards & Loyalty</h2>
            <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)', borderRadius: 'var(--radius)', padding: '32px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>FineDine Platinum</h3>
                <p style={{ opacity: 0.9 }}>You have exactly <strong style={{ fontSize: '24px' }}>1,240</strong> points</p>
              </div>
              <Award size={64} style={{ opacity: 0.2 }} />
            </div>
            
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Available Offers</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div style={{ padding: '24px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>Free Delivery</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>Redeem for 500 points on your next food order.</p>
                  <button className="btn btn-outline btn-sm" style={{ width: '100%' }}>Redeem</button>
                </div>
                <div style={{ padding: '24px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>20% Off Order</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>Redeem for 1,000 points. Maximum discount $15.</p>
                  <button className="btn btn-outline btn-sm" style={{ width: '100%' }}>Redeem</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Cancel Confirmation Modal */}
      {cancelPromptOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-color)' }}>Cancel Order #{cancelPromptOrder.id}?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to cancel this order? This action cannot be undone and your order will not be prepared.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setCancelPromptOrder(null)}>Keep Order</button>
              <button className="btn btn-primary" style={{ backgroundColor: '#EF4444', borderColor: '#EF4444' }} onClick={confirmCancelOrder}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- RESTAURANT OWNER panel ---
export function OwnerDashboard() {
  const { rates, currency, format, convert, currencyMeta } = useCurrency();
  const [restaurant, setRestaurant] = useState(null);
  const [menuList, setMenuList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [setupName, setSetupName] = useState('');
  const [setupDesc, setSetupDesc] = useState('');
  const [setupLoc, setSetupLoc] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemAvail, setItemAvail] = useState('true');
  const [isLoading, setIsLoading] = useState(true);

  // States for editing menu items and image upload
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvail, setEditAvail] = useState('true');
  const [uploadingItemId, setUploadingItemId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfileAndData();
    const interval = setInterval(loadIncomingOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadProfileAndData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = parseInt(payload.sub);

      const restsRes = await fetch('/api/restaurants');
      const rests = await restsRes.json();
      
      const mine = rests.find(r => r.owner_id === userId);
      setIsLoading(false);

      if (mine) {
        setRestaurant(mine);
        fetchMenu(mine.id);
        fetchOrders(mine.id);
      }
    } catch (err) { console.error(err); }
  };

  const fetchMenu = async (restId) => {
    try {
      const res = await fetch(`/api/restaurants/${restId}/menu`);
      const data = await res.json();
      setMenuList(data);
    } catch (e) { console.error(e); }
  };

  const fetchOrders = async (restId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setOrders(data.filter(o => o.restaurant_id === restId));
    } catch (e) { console.error(e); }
  };

  const loadIncomingOrders = () => {
    if (restaurant) fetchOrders(restaurant.id);
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          restaurant_name: setupName,
          description: setupDesc,
          location: setupLoc
        })
      });

      if (response.ok) {
        loadProfileAndData();
      }
    } catch (err) { console.error(err); }
  };

  const handlePublishItem = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/restaurants/${restaurant.id}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: itemName,
          description: itemDesc,
          price: parseFloat(itemPrice) / (rates[currency] ?? 1),
          is_available: itemAvail === 'true'
        })
      });

      if (response.ok) {
        setItemName('');
        setItemPrice('');
        setItemDesc('');
        fetchMenu(restaurant.id);
      }
    } catch (err) { console.error(err); }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchOrders(restaurant.id);
      }
    } catch (err) { console.error(err); }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    const convertedPrice = parseFloat(item.price) * (rates[currency] ?? 1);
    const decimals = ['JPY'].includes(currency) ? 0 : 2;
    setEditPrice(convertedPrice.toFixed(decimals));
    setEditDesc(item.description || '');
    setEditAvail(item.is_available ? 'true' : 'false');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateItem = async (e, itemId) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/restaurants/${restaurant.id}/menu/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          price: parseFloat(editPrice) / (rates[currency] ?? 1),
          is_available: editAvail === 'true'
        })
      });

      if (response.ok) {
        setEditingId(null);
        fetchMenu(restaurant.id);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/restaurants/${restaurant.id}/menu/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchMenu(restaurant.id);
      }
    } catch (err) { console.error(err); }
  };

  const handleUploadImage = async (itemId, file) => {
    if (!file) return;
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/restaurants/${restaurant.id}/menu/${itemId}/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        fetchMenu(restaurant.id);
      } else {
        const errData = await response.json();
        alert(errData.detail || "Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image.");
    }
  };

  if (isLoading) return <div className="text-center" style={{ padding: '40px' }}>Checking owner credentials...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
      {/* Profile & Menus */}
      <div>
        <div className="owner-section-card" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>My Restaurant Profile</h3>
          
          {!restaurant ? (
            <form onSubmit={handleCreateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>You haven't listed a restaurant profile yet. Create one to start selling food!</p>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Restaurant Name</label>
                <input type="text" required value={setupName} onChange={(e) => setSetupName(e.target.value)} placeholder="Bella Italia" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Cuisine Description</label>
                <input type="text" required value={setupDesc} onChange={(e) => setSetupDesc(e.target.value)} placeholder="Italian Neapolitan Pizza & Pastas" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Physical Location</label>
                <input type="text" required value={setupLoc} onChange={(e) => setSetupLoc(e.target.value)} placeholder="12 Broadway Ave" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'fit-content' }}>Register Store</button>
            </form>
          ) : (
            <div>
              <h4 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>{restaurant.restaurant_name}</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>{restaurant.description}</p>
              <div style={{ fontSize: '13px', display: 'flex', gap: '16px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} fill="#FBBF24" color="#FBBF24" /> {restaurant.rating || '0.0'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {restaurant.location}</span>
              </div>
            </div>
          )}
        </div>

        {restaurant && (
          <div className="owner-section-card" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '24px' }}>
            {/* AI Scanner */}
            <MenuImageScanner
              restaurantId={restaurant.id}
              onItemsAdded={() => fetchMenu(restaurant.id)}
            />

            <div style={{ borderTop: '2px dashed var(--border)', margin: '20px 0' }} />

            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Publish Dish Manually</h3>
            <form onSubmit={handlePublishItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Dish Name</label>
                <input type="text" required value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Margherita Pizza" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Price ({currencyMeta.symbol})</label>
                  <input type="number" step="0.01" required value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder={(14.99 * (rates[currency] ?? 1)).toFixed(['JPY'].includes(currency) ? 0 : 2)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Status</label>
                  <select value={itemAvail} onChange={(e) => setItemAvail(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }}>
                    <option value="true">Available</option>
                    <option value="false">Out of Stock</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Description</label>
                <input type="text" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Fresh mozzarella, tomatoes, basil" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'fit-content' }}>Add to Menu</button>
            </form>

            <h4 style={{ fontSize: '16px', fontWeight: 700, marginTop: '24px', marginBottom: '12px' }}>Active Menu</h4>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadImage(uploadingItemId, e.target.files[0]);
                }
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {menuList.length === 0 ? (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No items added yet.</span>
              ) : (
                menuList.map(item => {
                  const isEditing = editingId === item.id;
                  return (
                    <div key={item.id} style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px', 
                      padding: '16px', 
                      background: 'var(--surface)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                    }}>
                      {isEditing ? (
                        <form onSubmit={(e) => handleUpdateItem(e, item.id)} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Item Name</label>
                              <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', background: 'white' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Price ({currencyMeta.symbol})</label>
                              <input type="number" step="0.01" required value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', background: 'white' }} />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Description</label>
                            <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', background: 'white' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</label>
                            <select value={editAvail} onChange={(e) => setEditAvail(e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                              <option value="true">Available</option>
                              <option value="false">Out of Stock</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Save size={12} /> Save
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEdit} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <X size={12} /> Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {/* Dish Image */}
                          <div style={{ 
                            width: '64px', 
                            height: '64px', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            backgroundColor: 'white', 
                            border: '1px solid var(--border)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0,
                            position: 'relative',
                            cursor: 'pointer',
                          }}
                            title="Click to change image"
                            onClick={() => {
                              setUploadingItemId(item.id);
                              fileInputRef.current?.click();
                            }}
                          >
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Image size={24} style={{ color: 'var(--text-muted)' }} />
                            )}
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              backgroundColor: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              fontSize: '8px',
                              textAlign: 'center',
                              padding: '2px 0',
                              opacity: 0,
                              transition: 'opacity 0.2s',
                            }}
                            className="image-overlay"
                            >
                              Upload
                            </div>
                            <style>{`
                              div:hover > .image-overlay {
                                opacity: 1 !important;
                              }
                            `}</style>
                          </div>

                          {/* Details */}
                          <div style={{ flexGrow: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.name}</span>
                              <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>
                                {format(item.price)}
                              </span>
                            </div>
                            {item.description && (
                              <p style={{ margin: '2px 0 6px 0', fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {item.description}
                              </p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                fontSize: '12px', 
                                fontWeight: 500, 
                                color: item.is_available ? 'var(--primary)' : '#EF4444' 
                              }}>
                                <span style={{ 
                                  width: '6px', 
                                  height: '6px', 
                                  borderRadius: '50%', 
                                  backgroundColor: item.is_available ? 'var(--primary)' : '#EF4444' 
                                }} />
                                {item.is_available ? 'Available' : 'Out of Stock'}
                              </span>

                              {/* Actions */}
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  onClick={() => {
                                    setUploadingItemId(item.id);
                                    fileInputRef.current?.click();
                                  }}
                                  title="Upload Image"
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Upload size={14} />
                                </button>
                                <button 
                                  onClick={() => handleEditClick(item)}
                                  title="Edit Item"
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteItem(item.id)}
                                  title="Delete Item"
                                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', height: 'fit-content' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Incoming Orders</h3>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No active customer orders.</p>
        ) : (
          [...orders].sort((a,b) => b.id - a.id).map(o => (
            <div key={o.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '12px', backgroundColor: 'var(--surface)' }}>
              <div className="flex-between" style={{ fontWeight: 700, marginBottom: '8px' }}>
                <span>Order #{o.id}</span>
                <span style={{ color: 'var(--primary)' }}>{format(o.total_amount)}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Destination: {o.delivery_address}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Status:</span>
                <select 
                  value={o.order_status} 
                  onChange={(e) => updateOrderStatus(o.id, e.target.value)} 
                  style={{ padding: '6px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', background: 'white' }}
                >
                  <option value="Created">Created</option>
                  <option value="Paid">Paid (Received)</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Assigned">Assigned (Rider)</option>
                  <option value="OutForDelivery">Out For Delivery</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- DELIVERY PARTNER PORTAL ---
export function DeliveryDashboard() {
  const { format } = useCurrency();
  const [partner, setPartner] = useState(null);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('E-Bike');
  const [completedCount, setCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPartnerProfile();
    const timer = setInterval(loadActiveDeliveries, 5000);
    return () => clearInterval(timer);
  }, []);

  const loadPartnerProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = parseInt(payload.sub);

      const res = await fetch('/api/delivery/partners', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      const match = data.find(p => p.user_id === userId);
      setIsLoading(false);

      if (match) {
        setPartner(match);
        fetchActiveDeliveries(token);
      }
    } catch (err) { console.error(err); }
  };

  const fetchActiveDeliveries = async (token) => {
    try {
      const res = await fetch('/api/delivery/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setActiveDeliveries(data);
    } catch (e) { console.error(e); }
  };

  const loadActiveDeliveries = () => {
    const token = localStorage.getItem('token');
    if (partner && token) fetchActiveDeliveries(token);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/delivery/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone, vehicle_type: vehicle })
      });

      if (response.ok) {
        loadPartnerProfile();
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/delivery/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        if (newStatus === 'Delivered') {
          setCompletedCount(prev => prev + 1);
        }
        fetchActiveDeliveries(token);
      }
    } catch (err) { console.error(err); }
  };

  if (isLoading) return <div className="text-center" style={{ padding: '40px' }}>Loading Rider Profile...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
      <aside style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', height: 'fit-content', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontSize: '32px', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bike size={36} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{localStorage.getItem('name')}</h3>
        <span className="badge btn-primary btn-sm" style={{ marginTop: '8px' }}>Rider Agent</span>

        {!partner ? (
          <form onSubmit={handleRegister} style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Rider Sign Up</h4>
            <div>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Phone Number</label>
              <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0199" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Vehicle Type</label>
              <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }}>
                <option value="E-Bike">Electric Bicycle</option>
                <option value="Scooter">Motor Scooter</option>
                <option value="Car">Sedan / Car</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Complete Registration</button>
          </form>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', textAlign: 'left' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block' }}>Completed Deliveries</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{completedCount}</span>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block' }}>Total Earnings ({format(5)}/order)</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{format(completedCount * 5.0)}</span>
            </div>
          </div>
        )}
      </aside>

      <section>
        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Active Assignments Queue</h3>
        {activeDeliveries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No orders currently assigned to you. Drive safely!</p>
        ) : (
          activeDeliveries.map(delivery => (
            <div key={delivery.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '20px' }}>
              <div className="flex-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px', fontWeight: 700 }}>
                <span>Delivery for Order #{delivery.order_id}</span>
                <span className="badge" style={{ backgroundColor: '#EEF2F6', color: 'var(--text)' }}>{delivery.status}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Update Status:</span>
                <select
                  value={delivery.status}
                  onChange={(e) => handleUpdateStatus(delivery.order_id, e.target.value)}
                  style={{ padding: '6px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', background: 'white' }}
                >
                  <option value="Assigned">Rider Assigned</option>
                  <option value="PickedUp">Picked Up (Store)</option>
                  <option value="OutForDelivery">Out For Delivery</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

// --- ADMIN PANELS ---
export function AdminDashboard() {
  const { format } = useCurrency();
  const [stats, setStats] = useState({ revenue: 0, orders: 0, rests: 0, users: 5 });
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const restsRes = await fetch('/api/restaurants');
      const restsData = await restsRes.json();
      setRestaurants(restsData);

      const ordersRes = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ordersData = await ordersRes.json();
      setOrders(ordersData);

      const sumRev = ordersData.reduce((sum, o) => sum + (o.order_status !== 'Cancelled' ? parseFloat(o.total_amount) : 0), 0);
      setStats({
        revenue: sumRev,
        orders: ordersData.length,
        rests: restsData.length,
        users: 5
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Total Sales</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>{format(stats.revenue)}</span>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Platform Orders</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>{stats.orders}</span>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Restaurants</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>{stats.rests}</span>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Active Users</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>{stats.users}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <div>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '24px', maxHeight: '400px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Store size={18} /> Active Restaurants</h3>
            {restaurants.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                <span><b>{r.restaurant_name}</b> ({r.location})</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{r.rating || '0.0'} ★</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} /> Registered Users</h3>
            {[
              { n: 'Admin Dash', e: 'admin@fooddash.com', r: 'Admin' },
              { n: 'Luigi Owner', e: 'luigi@pizza.com', r: 'Owner' },
              { n: 'Rider Express', e: 'rider@fooddash.com', r: 'Rider' },
              { n: 'John Doe', e: 'john@gmail.com', r: 'Customer' }
            ].map((u, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                <span>{u.n} ({u.e})</span>
                <span style={{ color: u.r === 'Admin' ? 'var(--primary)' : 'var(--text-muted)' }}>{u.r}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', maxHeight: '830px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingBag size={18} /> System Order Logs</h3>
          {[...orders].sort((a,b) => b.id - a.id).map(o => (
            <div key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
              <div className="flex-between" style={{ fontWeight: 600 }}>
                <span>Order #{o.id} - Customer {o.user_id}</span>
                <span>{format(o.total_amount)}</span>
              </div>
              <div className="flex-between" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Address: {o.delivery_address}</span>
                <span className="badge" style={{ backgroundColor: '#E5E7EB', color: 'var(--text)' }}>{o.order_status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
