import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isRegisterParam = searchParams.get('mode') === 'register';

  const [isRegister, setIsRegister] = useState(isRegisterParam);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Customer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setIsRegister(searchParams.get('mode') === 'register');
  }, [location.search]);

  // Redirect if token exists
  useEffect(() => {
    if (localStorage.getItem('token')) {
      redirectDashboard(localStorage.getItem('role'));
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('name', data.name);
        localStorage.setItem('email', email);
        
        redirectDashboard(data.role);
        window.location.reload(); // Hard reload to update header navigation
      } else {
        setError(data.detail || 'Incorrect credentials.');
      }
    } catch (err) {
      setError('Connection to auth service failed.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess('Account created! Redirecting to login...');
        setTimeout(() => {
          setIsRegister(false);
          setName('');
          setPassword('');
          setSuccess('');
        }, 1500);
      } else {
        setError(data.detail || 'Registration failed. Check your inputs.');
      }
    } catch (err) {
      setError('Connection to auth service failed.');
    }
  };

  const redirectDashboard = (userRole) => {
    if (userRole === 'Customer') navigate('/restaurants');
    else if (userRole === 'Restaurant Owner') navigate('/owner');
    else if (userRole === 'Delivery Partner') navigate('/delivery');
    else if (userRole === 'Admin') navigate('/admin');
    else navigate('/');
  };

  return (
    <div className="auth-container" style={{ maxWidth: '440px', margin: '40px auto', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px', boxShadow: 'var(--shadow)' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {isRegister ? 'Sign up to discover the best dishes.' : 'Sign in to check active delivery runs.'}
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '18px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '18px' }}>
          {success}
        </div>
      )}

      {isRegister ? (
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', fontSize: '14px' }}>Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', background: 'white' }} />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', fontSize: '14px' }}>Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', background: 'white' }} />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', fontSize: '14px' }}>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', background: 'white' }} />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', fontSize: '14px' }}>Register As</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', background: 'white' }}>
              <option value="Customer">Customer (Order Food)</option>
              <option value="Restaurant Owner">Restaurant Owner (List Menu)</option>
              <option value="Delivery Partner">Delivery Partner (Rider)</option>
              <option value="Admin">System Admin (Manage All)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Sign Up</button>
        </form>
      ) : (
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', fontSize: '14px' }}>Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', background: 'white' }} />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', fontSize: '14px' }}>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', background: 'white' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Sign In</button>

          {/* Demo credentials */}
          <div style={{ marginTop: '20px', padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '12px', color: '#166534' }}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>🔑 Demo Accounts (password: <code>Pass1234!</code>)</div>
            {[
              { label: 'Customer', email: 'alice@fooddash.com' },
              { label: 'Restaurant Owner', email: 'priya@fooddash.com' },
              { label: 'Delivery Partner', email: 'dev@fooddash.com' },
              { label: 'Admin', email: 'admin@fooddash.com', pw: 'Admin123!' },
            ].map(acc => (
              <div
                key={acc.email}
                onClick={() => { setEmail(acc.email); setPassword(acc.pw || 'Pass1234!'); }}
                style={{ cursor: 'pointer', padding: '3px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #A7F3D0' }}
                title="Click to auto-fill"
              >
                <span style={{ fontWeight: 600 }}>{acc.label}</span>
                <span style={{ opacity: 0.8 }}>{acc.email}</span>
              </div>
            ))}
            <div style={{ marginTop: '5px', opacity: 0.7 }}>Click any row to auto-fill credentials.</div>
          </div>
        </form>
      )}

      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
        {isRegister ? (
          <>Already have an account? <span onClick={() => navigate('/auth?mode=login')} style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Sign in</span></>
        ) : (
          <>Don't have an account? <span onClick={() => navigate('/auth?mode=register')} style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Sign up</span></>
        )}
      </div>
    </div>
  );
}
