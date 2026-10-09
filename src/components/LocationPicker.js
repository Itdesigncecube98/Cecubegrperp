'use client';
import { useEffect, useState } from 'react';
import GoogleMapsView from './GoogleMapsView';

export default function LocationPicker({ defaultPosition, onChange }) {
  const [position, setPosition] = useState(defaultPosition || { lat: 28.6139, lng: 77.2090 });

  useEffect(() => {
    if (position && onChange) {
      onChange(position);
    }
  }, [position]);

  useEffect(() => {
    if (defaultPosition && (!position || defaultPosition.lat !== position.lat || defaultPosition.lng !== position.lng)) {
      setPosition(defaultPosition);
    }
  }, [defaultPosition?.lat, defaultPosition?.lng]);

  const handleLatChange = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setPosition(prev => ({ ...prev, lat: val }));
  };

  const handleLngChange = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setPosition(prev => ({ ...prev, lng: val }));
  };

  const handleLocationSelect = (newPos) => {
    setPosition(newPos);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Latitude</label>
          <input 
            type="number" 
            step="any"
            value={position.lat}
            onChange={handleLatChange}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Longitude</label>
          <input 
            type="number" 
            step="any"
            value={position.lng}
            onChange={handleLngChange}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>
      <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <GoogleMapsView 
          defaultCenter={position} 
          onLocationSelect={handleLocationSelect} 
          height={300} 
        />
      </div>
    </div>
  );
}
