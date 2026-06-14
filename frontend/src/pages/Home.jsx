import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Store, Award, Star, MapPin, Pizza, Soup, ArrowRight, Salad } from 'lucide-react';

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants');
      const data = await response.json();
      setRestaurants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchVal.trim()) {
      navigate(`/restaurants?search=${encodeURIComponent(searchVal)}`);
    }
  };

  const filterCuisine = (cuisine) => {
    navigate(`/restaurants?cuisine=${cuisine}`);
  };

  return (
    <div>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '60px 0', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>
          Hungry? <br />
          Order delicious food to your door
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '32px' }}>
          Discover top-tier local eateries, freshly made to order, and delivered straight to your door with real-time tracking.
        </p>
        <div className="search-box" style={{ display: 'flex', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px', maxWidth: '600px', margin: '0 auto', boxShadow: 'var(--shadow)' }}>
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Enter cuisine, restaurant name, or location..."
            style={{ flexGrow: 1, border: 'none', padding: '12px 16px', fontSize: '16px' }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-primary" onClick={handleSearch} style={{ borderRadius: '8px' }}>Search</button>
        </div>
      </section>

      {/* Promos */}
      <section style={{ margin: '40px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="promo-card" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: '180px' }}>
            <h3 style={{ fontSize: '22px', marginBottom: '8px', zIndex: 2 }}>Weekend Feast!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '60%', zIndex: 2 }}>Get flat discounts on order amounts above $30. Use code <b>FEAST20</b>.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/restaurants')} style={{ width: 'fit-content', zIndex: 2 }}>Order Now</button>
            <div style={{ position: 'absolute', right: '20px', top: '20px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '12px', borderRadius: '50%', fontWeight: 700, fontSize: '18px', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>20%</div>
          </div>
          <div className="promo-card" style={{ backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderRadius: 'var(--radius)', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: '180px' }}>
            <h3 style={{ fontSize: '22px', marginBottom: '8px', zIndex: 2 }}>Free Delivery</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '60%', zIndex: 2 }}>First order from any green healthy food outlet features free shipping.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/restaurants?cuisine=salad')} style={{ width: 'fit-content', zIndex: 2 }}>Explore Green</button>
            <div style={{ position: 'absolute', right: '20px', top: '20px', backgroundColor: '#DCFCE7', color: 'var(--primary)', padding: '12px', borderRadius: '50%', fontWeight: 700, fontSize: '18px', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>$0</div>
          </div>
        </div>
      </section>

      {/* Cuisines */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag style={{ color: 'var(--primary)' }} /> Cuisines
        </h2>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
          <div className="category-item" onClick={() => filterCuisine('pizza')} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 28px', minWidth: '140px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
            <Pizza size={24} />
            <span>Pizza</span>
          </div>
          <div className="category-item" onClick={() => filterCuisine('salad')} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 28px', minWidth: '140px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
            <Salad size={24} />
            <span>Healthy Salads</span>
          </div>
          <div className="category-item" onClick={() => filterCuisine('sushi')} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 28px', minWidth: '140px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
            <Soup size={24} />
            <span>Sushi</span>
          </div>
        </div>
      </section>

      {/* Featured list */}
      <section style={{ marginBottom: '40px' }}>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store style={{ color: 'var(--primary)' }} /> Featured Restaurants
          </h2>
          <button onClick={() => navigate('/restaurants')} style={{ background: 'none', border: 'none', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All <ArrowRight size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            Loading active restaurants...
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            No restaurants available yet. Register a restaurant profile as an Owner in your Dashboard!
          </div>
        ) : (
          <div className="rest-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {restaurants.slice(0, 3).map(rest => (
              <div key={rest.id} className="rest-card" onClick={() => navigate(`/restaurants/${rest.id}`)} style={{ cursor: 'pointer', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <div className="rest-img" style={{ width: '100%', height: '200px', backgroundColor: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  {rest.image_url ? (
                    <img src={rest.image_url} alt={rest.restaurant_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Store size={40} />
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{rest.restaurant_name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>{rest.description || 'Gourmet dining specialties.'}</p>
                  <div className="flex-between" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {rest.location}</span>
                    <span className="rating-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      <Star size={12} fill="var(--primary)" /> {rest.rating || '0.0'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
