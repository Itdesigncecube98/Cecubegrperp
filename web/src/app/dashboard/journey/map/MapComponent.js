'use client';
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const liveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// Fit map to bounds whenever they change
function MapBounds({ bounds }) {
  const map = useMap();
  const prevBounds = useRef(null);
  useEffect(() => {
    if (!bounds || bounds.length === 0) return;
    // Only refit if bounds changed meaningfully
    const key = bounds.map(b => b.join(',')).join('|');
    if (prevBounds.current === key) return;
    prevBounds.current = key;
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
  }, [bounds, map]);
  return null;
}

// Smoothly pan to follow live position of selected/active trip
function LiveFollow({ position, follow }) {
  const map = useMap();
  const prevPos = useRef(null);
  useEffect(() => {
    if (!follow || !position) return;
    const key = position.join(',');
    if (prevPos.current === key) return;
    prevPos.current = key;
    map.panTo(position, { animate: true, duration: 1 });
  }, [position, follow, map]);
  return null;
}

export default function MapComponent({ trips: initialTrips, selectedTripId }) {
  const [trips, setTrips] = useState(initialTrips || []);

  // Sync when parent updates trips (e.g. date change)
  useEffect(() => {
    setTrips(initialTrips || []);
  }, [initialTrips]);

  // Poll pings for ACTIVE trips every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const activeTrips = trips.filter(t => t.status === 'ACTIVE');
      if (activeTrips.length === 0) return;

      try {
        // Re-fetch pings for each active trip via location-requests API
        const updated = await Promise.all(
          activeTrips.map(t =>
            fetch(`/api/location-requests/${t.id}`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );

        setTrips(prev => prev.map(trip => {
          const fresh = updated.find(u => u && u.id === trip.id);
          return fresh ? { ...trip, pings: fresh.pings || trip.pings } : trip;
        }));
      } catch (e) { /* silent — next tick will retry */ }
    }, 5000);

    return () => clearInterval(interval);
  }, [trips]);

  const displayTrips = selectedTripId
    ? trips.filter(t => t.id == selectedTripId)
    : trips;

  const allCoords = [];
  displayTrips.forEach(trip => {
    if (trip.pings) {
      trip.pings.forEach(p => allCoords.push([p.latitude, p.longitude]));
    }
  });

  const defaultCenter = [20.5937, 78.9629];

  // For live follow: the latest position of the selected/active trip
  const liveTrip = displayTrips.find(t => t.status === 'ACTIVE');
  const livePos = liveTrip?.pings?.length > 0
    ? [liveTrip.pings[liveTrip.pings.length - 1].latitude, liveTrip.pings[liveTrip.pings.length - 1].longitude]
    : null;

  return (
    <MapContainer
      center={allCoords.length > 0 ? allCoords[0] : defaultCenter}
      zoom={5}
      style={{ height: '100%', width: '100%', borderRadius: '16px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {displayTrips.map(trip => {
        if (!trip.pings || trip.pings.length === 0) return null;

        const positions = trip.pings.map(p => [p.latitude, p.longitude]);
        const start = positions[0];
        const end = positions[positions.length - 1];
        const isFinished = trip.status === 'COMPLETED' || trip.status === 'STOPPED';
        const isActive = trip.status === 'ACTIVE';

        return (
          <React.Fragment key={trip.id}>
            {/* Route polyline — all recorded GPS points */}
            <Polyline
              positions={positions}
              color={isActive ? '#3b82f6' : isFinished ? '#10b981' : '#f59e0b'}
              weight={4}
              opacity={0.85}
            />

            {/* Start marker */}
            <Marker position={start} icon={startIcon}>
              <Popup>
                <b>Start:</b> {trip.employee?.name}<br />
                {new Date(trip.pings[0].timestamp).toLocaleTimeString()}
              </Popup>
            </Marker>

            {/* End / live position marker */}
            {positions.length > 1 && (
              <Marker position={end} icon={isFinished ? endIcon : liveIcon}>
                <Popup>
                  <b>{isFinished ? 'End' : '🔴 Live'}:</b> {trip.employee?.name}<br />
                  {new Date(trip.pings[trip.pings.length - 1].timestamp).toLocaleTimeString()}
                  {isActive && <><br /><span style={{ color: '#3b82f6', fontWeight: 600 }}>Updating every 5s</span></>}
                </Popup>
              </Marker>
            )}

            {/* Accuracy pulse circle for live trips */}
            {isActive && (
              <Circle
                center={end}
                radius={30}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 1 }}
              />
            )}
          </React.Fragment>
        );
      })}

      {allCoords.length > 0 && <MapBounds bounds={allCoords} />}
      {livePos && <LiveFollow position={livePos} follow={!!selectedTripId} />}
    </MapContainer>
  );
}
