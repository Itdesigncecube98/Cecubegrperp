'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  const markerRef = useRef(null);
  const map = useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setPosition({ lat: newPos.lat, lng: newPos.lng });
        }
      },
    }),
    [setPosition]
  );

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

export default function LocationPicker({ defaultPosition, onChange }) {
  const [position, setPosition] = useState(defaultPosition || { lat: 28.6139, lng: 77.2090 });
  const [mapId, setMapId] = useState(null);

  useEffect(() => {
    // This prevents the "Map container is being reused" and "Cannot read properties of undefined (reading 'appendChild')" 
    // errors in React Strict Mode by delaying render until client side and giving a unique key.
    setMapId(Math.random().toString(36).substring(7));
  }, []);

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

  if (!mapId) return null;

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
        <MapContainer key={mapId} center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
    </div>
  );
}
