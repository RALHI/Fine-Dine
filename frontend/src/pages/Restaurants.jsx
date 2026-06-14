import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, MapPin, Store, X } from 'lucide-react';

export default function Restaurants() {
  const navigate = useNavigate();
  const location = useLocation();

  const [restaurants, setRestaurants] = useState([]);
  const [filteredRest, setFilteredRest] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('rating-desc');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Parse URL search parameters on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cuisineParam = params.get('cuisine');
    const searchParam = params.get('search');

    if (cuisineParam) setSelectedCuisines([cuisineParam]);
    if (searchParam) setSearchVal(searchParam);
  }, [location.search]);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [restaurants, searchVal, selectedCuisines, minRating, sortBy]);

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

  const applyFiltersAndSorting = () => {
    let result = [...restaurants];

    // Location/Name search filter
    if (searchVal.trim()) {
      const q = searchVal.toLowerCase();
      result = result.filter(r => 
        r.restaurant_name.toLowerCase().includes(q) || 
        r.location.toLowerCase().includes(q)
      );
    }

    // Cuisine filter
    if (selectedCuisines.length > 0) {
      result = result.filter(r => 
        selectedCuisines.some(cuisine => 
          r.restaurant_name.toLowerCase().includes(cuisine) ||
          (r.description && r.description.toLowerCase().includes(cuisine))
        )
      );
    }

    // Minimum rating filter
    if (minRating > 0) {
      result = result.filter(r => r.rating >= minRating);
    }

    // Sorting
    if (sortBy === 'rating-desc') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.restaurant_name.localeCompare(b.restaurant_name));
    }

    setFilteredRest(result);
  };

  const handleCuisineToggle = (cuisine) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
    } else {
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px' }}>
      {/* Sidebar Filters */}
      <aside style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', height: 'fit-content' }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Search Location</h3>
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="e.g. Broadway"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', background: 'white' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Cuisines</h3>
          {['pizza', 'salad', 'sushi', 'burger', 'asian'].map(c => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                id={`c-${c}`}
                checked={selectedCuisines.includes(c)}
                onChange={() => handleCuisineToggle(c)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor={`c-${c}`} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>
                {c === 'asian' ? 'Asian Wok' : c === 'salad' ? 'Healthy Salads' : c}
              </label>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Minimum Rating</h3>
          {[4.5, 4.0, 3.5].map(val => (
            <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="rating_val"
                id={`r-${val}`}
                checked={minRating === val}
                onChange={() => setMinRating(val)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor={`r-${val}`} style={{ cursor: 'pointer' }}>{val}+ Stars</label>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="rating_val"
              id="r-all"
              checked={minRating === 0}
              onChange={() => setMinRating(0)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="r-all" style={{ cursor: 'pointer' }}>Show All</label>
          </div>
        </div>
      </aside>

      {/* Main Results Listing */}
      <section>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Restaurants</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {filteredRest.length} restaurants found
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', background: 'white' }}
            >
              <option value="rating-desc">Rating (High to Low)</option>
              <option value="name-asc">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          {searchVal && (
            <span className="filter-tag" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Search: "{searchVal}"
              <button onClick={() => setSearchVal('')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {selectedCuisines.map(c => (
            <span key={c} className="filter-tag" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {c}
              <button onClick={() => handleCuisineToggle(c)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
            </span>
          ))}
          {minRating > 0 && (
            <span className="filter-tag" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {minRating}+ Stars
              <button onClick={() => setMinRating(0)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
            </span>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            Loading restaurants...
          </div>
        ) : filteredRest.length === 0 ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            No restaurants match your filters.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            {filteredRest.map(rest => (
              <div key={rest.id} className="card" onClick={() => navigate(`/restaurants/${rest.id}`)} style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', background: 'white' }}>
                <div style={{ width: '100%', height: '160px', backgroundColor: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyItems: 'center', overflow: 'hidden' }}>
                  {rest.image_url ? (
                    <img src={rest.image_url} alt={rest.restaurant_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Store size={40} style={{ margin: 'auto', color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{rest.restaurant_name}</h3>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}>
                      <Star size={12} fill="var(--primary)" /> {rest.rating || '0.0'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>{rest.description || 'Delectable dishes made daily.'}</p>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> {rest.location}
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
