import React, { useEffect, useRef, useState } from 'react';

/**
 * AddressMapSelector component
 * Renders an interactive map selector.
 * Uses Google Maps if VITE_GOOGLE_MAPS_API_KEY is defined in the environment,
 * otherwise falls back gracefully to a fully functional interactive OpenStreetMap (Leaflet)
 * with free reverse-geocoding (Nominatim).
 */
export default function AddressMapSelector({ 
  addressLine, setAddressLine, 
  city, setCity, 
  latitude, setLatitude, 
  longitude, setLongitude 
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const [mapType, setMapType] = useState('none'); // 'google' | 'leaflet' | 'none'

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (apiKey) {
      loadGoogleMaps();
    } else {
      loadLeaflet();
    }

    return () => {
      // Map cleanup is handled by Leaflet/Google garbage collection
    };
  }, [apiKey]);

  // ── Google Maps Loader ─────────────────────────────────────────────────────
  const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      initGoogleMap();
      return;
    }

    let script = document.getElementById('google-maps-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleMap();
      script.onerror = () => {
        console.error('Failed to load Google Maps script. Falling back to Leaflet.');
        loadLeaflet();
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', initGoogleMap);
    }
  };

  const initGoogleMap = () => {
    if (!mapRef.current) return;
    setMapType('google');

    const defaultLat = latitude || 40.7128;
    const defaultLng = longitude || -74.0060;
    const center = { lat: defaultLat, lng: defaultLng };

    const map = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
    });
    mapInstance.current = map;

    const marker = new window.google.maps.Marker({
      position: center,
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });
    markerInstance.current = marker;

    if (!latitude || !longitude) {
      setLatitude(defaultLat);
      setLongitude(defaultLng);
    }

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      const lat = pos.lat();
      const lng = pos.lng();
      setLatitude(lat);
      setLongitude(lng);
      reverseGeocodeGoogle(lat, lng);
    });

    map.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition(e.latLng);
      setLatitude(lat);
      setLongitude(lng);
      reverseGeocodeGoogle(lat, lng);
    });

    // Autocomplete on address line input
    const autocompleteInput = document.getElementById('address-line-input');
    if (autocompleteInput) {
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInput, {
        types: ['address'],
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        const loc = place.geometry.location;
        map.setCenter(loc);
        marker.setPosition(loc);
        setLatitude(loc.lat());
        setLongitude(loc.lng());
        setAddressLine(place.formatted_address || autocompleteInput.value);

        let cityVal = '';
        if (place.address_components) {
          for (const component of place.address_components) {
            if (component.types.includes('locality')) {
              cityVal = component.long_name;
              break;
            } else if (component.types.includes('administrative_area_level_2')) {
              cityVal = component.long_name;
            }
          }
        }
        if (cityVal) setCity(cityVal);
      });
    }
  };

  const reverseGeocodeGoogle = (lat, lng) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setAddressLine(results[0].formatted_address);
        let cityVal = '';
        for (const component of results[0].address_components) {
          if (component.types.includes('locality')) {
            cityVal = component.long_name;
            break;
          } else if (component.types.includes('administrative_area_level_2')) {
            cityVal = component.long_name;
          }
        }
        if (cityVal) setCity(cityVal);
      }
    });
  };

  // ── Leaflet Maps Loader ────────────────────────────────────────────────────
  const loadLeaflet = () => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (window.L) {
      initLeafletMap();
      return;
    }

    let script = document.getElementById('leaflet-js');
    if (!script) {
      script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => initLeafletMap();
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', initLeafletMap);
    }
  };

  const initLeafletMap = () => {
    if (!mapRef.current || !window.L) return;
    setMapType('leaflet');

    const defaultLat = latitude || 40.7128;
    const defaultLng = longitude || -74.0060;

    if (mapRef.current._leaflet_id) {
      return;
    }

    const L = window.L;
    const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);
    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const marker = L.marker([defaultLat, defaultLng], {
      draggable: true
    }).addTo(map);
    markerInstance.current = marker;

    if (!latitude || !longitude) {
      setLatitude(defaultLat);
      setLongitude(defaultLng);
    }

    marker.on('dragend', () => {
      const latlng = marker.getLatLng();
      setLatitude(latlng.lat);
      setLongitude(latlng.lng);
      reverseGeocodeLeaflet(latlng.lat, latlng.lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setLatitude(e.latlng.lat);
      setLongitude(e.latlng.lng);
      reverseGeocodeLeaflet(e.latlng.lat, e.latlng.lng);
    });
  };

  const reverseGeocodeLeaflet = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.display_name) {
        setAddressLine(data.display_name);
        const addr = data.address;
        const cityVal = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || '';
        if (cityVal) setCity(cityVal);
      }
    } catch (err) {
      console.error('Nominatim reverse geocoding error:', err);
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
          📍 Drag the Pin to Your Delivery Location {mapType === 'google' ? '(Google Maps)' : '(OpenStreetMap fallback)'}
        </label>
        {latitude && longitude && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
          </span>
        )}
      </div>

      {!apiKey && (
        <div style={{
          fontSize: '11px', 
          color: '#0369A1', 
          backgroundColor: '#F0F9FF', 
          border: '1px solid #BAE6FD', 
          borderRadius: '8px', 
          padding: '8px 12px', 
          marginBottom: '10px',
          lineHeight: '1.4'
        }}>
          💡 Provide a Google Maps API Key in your <code>.env</code> (as <code>VITE_GOOGLE_MAPS_API_KEY</code>) to enable Google Autocomplete. Falls back to free interactive OpenStreetMap automatically.
        </div>
      )}

      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '220px', 
          borderRadius: '10px', 
          border: '1px solid var(--border)',
          background: '#F3F4F6',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
          zIndex: 1
        }} 
      />
    </div>
  );
}
