'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cleanTripTrack } from '@/lib/tripGps';
import GoogleMapsView from '@/components/GoogleMapsView';
import LiveTripMap from '@/components/LiveTripMap';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function FitBounds({ positions }) {
  const map = useMap();
  const prev = useRef('');
  useEffect(() => {
    if (!positions || positions.length < 2) return;
    const key = positions.map(p => p.join(',')).join('|');
    if (prev.current === key) return;
    prev.current = key;
    map.fitBounds(positions, { padding: [40, 40], maxZoom: 17 });
  }, [positions, map]);
  return null;
}

function LiveFollow({ position }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!position) return;
    const key = position.join(',');
    if (prev.current === key) return;
    prev.current = key;
    map.panTo(position, { animate: true, duration: 1 });
  }, [position, map]);
  return null;
}

/**
 * TripMap
 * Props:
 *   pings          - array of {latitude, longitude, timestamp}
 *   startLocation  - label string
 *   endLocation    - label string
 *   tripId         - (optional) if provided AND trip is ACTIVE, polls for fresh pings every 5s
 *   isActive       - boolean, enables live polling when true
 */
export default function TripMap({ pings: initialPings, startLocation, endLocation, routePath: savedRoutePath = [], tripId, isActive, startCoords, endCoords }) {
  // Ola/Uber style live tracking for active trips
  if (isActive) {
    return (
      <LiveTripMap
        tripId={tripId}
        isActive={isActive}
        startLocation={startLocation}
        endLocation={endLocation}
        startCoords={startCoords}
        endCoords={endCoords}
        plannedPath={Array.isArray(savedRoutePath) ? savedRoutePath : []}
      />
    );
  }
  const [pings, setPings] = useState(initialPings || []);
  const track = useMemo(() => cleanTripTrack(pings), [pings]);
  const positions = track.accepted.map(point => [point.latitude, point.longitude]);
  const routeSegments = track.segments.map(segment => segment.map(point => [point.latitude, point.longitude]));
  const plannedPath = Array.isArray(savedRoutePath)
    ? savedRoutePath
      .map(point => ({ lat: Number(point?.lat), lng: Number(point?.lng) }))
      .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    : [];

  // Sync when parent passes new pings (e.g. completed trip modal)
  useEffect(() => {
    setPings(initialPings || []);
  }, [initialPings]);

  // Live polling for ACTIVE trips
  useEffect(() => {
    if (!isActive || !tripId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}/pings`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setPings(data);
        }
      } catch (e) { /* silent */ }
    }, 5000);

    return () => clearInterval(interval);
  }, [isActive, tripId]);

  if (positions.length === 0 && plannedPath.length > 1) {
    return (
      <div>
        <GoogleMapsView
          locations={[
            { latitude: plannedPath[0].lat, longitude: plannedPath[0].lng, title: `Pickup: ${startLocation || 'Start'}` },
            { latitude: plannedPath[plannedPath.length - 1].lat, longitude: plannedPath[plannedPath.length - 1].lng, title: `Destination: ${endLocation || 'End'}` },
          ]}
          paths={[plannedPath]}
          active={false}
        />
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13 }}>
          Estimated Google Maps route; live GPS tracking was not recorded for this trip.
        </p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', color: '#9ca3af' }}>
        No GPS data available for this trip.
      </div>
    );
  }

  if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    const routeLocations = [
      {
        latitude: track.accepted[0].latitude,
        longitude: track.accepted[0].longitude,
        title: `Start: ${startLocation || 'Unknown'}`,
      },
      ...(positions.length > 1 ? [{
        latitude: track.accepted[track.accepted.length - 1].latitude,
        longitude: track.accepted[track.accepted.length - 1].longitude,
        title: isActive ? 'Live position' : `End: ${endLocation || 'Unknown'}`,
      }] : []),
    ];

    return (
      <GoogleMapsView
        locations={routeLocations}
        paths={track.segments.map(segment => segment.map(point => ({ lat: point.latitude, lng: point.longitude })))}
        active={isActive}
      />
    );
  }

  const livePos = isActive ? positions[positions.length - 1] : null;

  return (
    <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer center={positions[0]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Draw only cleaned GPS segments. Never join separate trips or GPS gaps. */}
        {routeSegments.filter(segment => segment.length > 1).map((segment, index) => (
          <Polyline
            key={`route-${index}`}
            positions={segment}
            color={isActive ? '#3b82f6' : '#10b981'}
            weight={5}
            opacity={0.85}
          />
        ))}

        {/* Start marker */}
        <Marker position={positions[0]} icon={greenIcon}>
          <Popup><strong>Start</strong><br />{startLocation || 'Unknown'}</Popup>
        </Marker>

        {/* End / live marker */}
        {positions.length > 1 && (
          <Marker position={positions[positions.length - 1]} icon={blueIcon}>
            <Popup>
              <strong>{isActive ? '🔴 Live Position' : 'End'}</strong><br />
              {isActive ? 'Updating every 5s' : (endLocation || 'Unknown')}
            </Popup>
          </Marker>
        )}

        {/* Live pulse circle */}
        {isActive && livePos && (
          <Circle
            center={livePos}
            radius={25}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.25, weight: 1 }}
          />
        )}

        <FitBounds positions={positions} />
        {isActive && livePos && <LiveFollow position={livePos} />}
      </MapContainer>
    </div>
  );
}
