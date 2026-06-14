import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { Compass, ShoppingCart } from 'lucide-react';

// Currency
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import CurrencySelector from './components/CurrencySelector.jsx';

// Import Pages
import Home from './pages/Home.jsx';
import Auth from './pages/Auth.jsx';
import Restaurants from './pages/Restaurants.jsx';
import RestaurantDetails from './pages/RestaurantDetails.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import { 
  CustomerDashboard, OwnerDashboard, 
  AdminDashboard, DeliveryDashboard 
} from './pages/Dashboards.jsx';

// Import Chatbot
import ChatbotWidget from './components/ChatbotWidget.jsx';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  const navigate = useNavigate();
  const [userToken, setUserToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));
  const [userName, setUserName] = useState(localStorage.getItem('name'));
  const [cartCount, setCartCount] = useState(0);

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(count);
  };

  useEffect(() => {
    updateCartCount();
    // Listen for cart changes
    window.addEventListener('cartUpdate', updateCartCount);
    return () => window.removeEventListener('cartUpdate', updateCartCount);
  }, []);

  const handleSignOut = () => {
    localStorage.clear();
    setUserToken(null);
    setUserRole(null);
    setUserName(null);
    navigate('/');
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <header>
        <div className="container navbar">
          <Link to="/" className="logo">
            <Compass /> FineDine
          </Link>

          <nav className="nav-links">
            <Link to="/restaurants" className="nav-link">Restaurants</Link>
            
            {userToken && userRole === 'Customer' && <Link to="/dashboard" className="nav-link">My Dashboard</Link>}
            {userToken && userRole === 'Restaurant Owner' && <Link to="/owner" className="nav-link">Owner Panel</Link>}
            {userToken && userRole === 'Delivery Partner' && <Link to="/delivery" className="nav-link">Rider Portal</Link>}
            {userToken && userRole === 'Admin' && <Link to="/admin" className="nav-link">Admin Dashboard</Link>}
          </nav>

          <div className="nav-actions">
            <CurrencySelector />

            <Link to="/cart" className="nav-link" style={{ position: 'relative' }}>
              <ShoppingCart />
              <span className="badge">{cartCount}</span>
            </Link>

            {userToken ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Hi, {userName}</span>
                <button onClick={handleSignOut} className="btn btn-outline btn-sm">Sign Out</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link to="/auth?mode=login" className="btn btn-outline btn-sm">Log In</Link>
                <Link to="/auth?mode=register" className="btn btn-primary btn-sm">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Pages router */}
      <main className="container" style={{ flexGrow: 1, paddingTop: '40px', paddingBottom: '60px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/restaurants/:id" element={<RestaurantDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['Customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/owner" element={
            <ProtectedRoute allowedRoles={['Restaurant Owner', 'Admin']}>
              <OwnerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/delivery" element={
            <ProtectedRoute allowedRoles={['Delivery Partner', 'Admin']}>
              <DeliveryDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </main>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="footer-logo">FineDine</div>
              <p>Experience local premium dining delivered directly to your doorstep. Powered by microservices and Qdrant similarity searches.</p>
            </div>
            <div className="footer-col">
              <h4>Discover</h4>
              <ul>
                <li><Link to="/restaurants">All Restaurants</Link></li>
                <li><Link to="/restaurants?cuisine=pizza">Italian Pizza</Link></li>
                <li><Link to="/restaurants?cuisine=salad">Healthy Food</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Support</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Partner</h4>
              <ul>
                <li><Link to="/auth?mode=register&role=Restaurant%20Owner">Restaurant Partner</Link></li>
                <li><Link to="/auth?mode=register&role=Delivery%20Partner">Ride With Us</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 FineDine. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Chatbot support */}
      <ChatbotWidget />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CurrencyProvider>
        <AppContent />
      </CurrencyProvider>
    </BrowserRouter>
  );
}
