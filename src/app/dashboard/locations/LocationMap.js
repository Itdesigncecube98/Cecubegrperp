'use client';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Flies map to new center when `center` prop changes
function FlyTo({ center }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!center) return;
    if (prev.current?.lat === center.lat && prev.current?.lng === center.lng) return;
    prev.current = center;
    map.flyTo([center.lat, center.lng], 15, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

// Handles map click → sets marker
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

export default function LocationMap({ marker, radiusMeters, onMapClick, flyTo }) {
  const defaultCenter = [20.5937, 78.9629]; // India center

  return (
    <MapContainer
      center={marker ? [marker.lat, marker.lng] : defaultCenter}
      zoom={marker ? 15 : 5}
      style={{ width: '100%', height: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickHandler onMapClick={onMapClick} />
      {flyTo && <FlyTo center={flyTo} />}
      {marker && (
        <>
          <Marker position={[marker.lat, marker.lng]} />
          <Circle
            center={[marker.lat, marker.lng]}
            radius={radiusMeters || 100}
            pathOptions={{ color: '#007bff', fillColor: '#007bff', fillOpacity: 0.15 }}
          />
        </>
      )}
    </MapContainer>
  );
}
