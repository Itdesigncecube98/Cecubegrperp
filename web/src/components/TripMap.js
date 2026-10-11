'use client';
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/components/GoogleMapsView';
import { cleanTripTrack } from '@/lib/tripGps';
import LiveTripMap from '@/components/LiveTripMap';

export default function TripMap({ pings: initialPings = [], startLocation, endLocation, routePath: savedRoutePath = [], tripId, isActive, startCoords, endCoords }) {
  const [pings, setPings] = useState(initialPings || []);

  useEffect(() => { setPings(initialPings || []); }, [initialPings]);

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
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [isActive, tripId]);

  // Use Ola/Uber style live map for active trips
  if (isActive) {
    return (
      <LiveTripMap
        tripId={tripId}
        isActive={true}
        startLocation={startLocation}
        endLocation={endLocation}
        startCoords={startCoords}
        endCoords={endCoords}
        plannedPath={Array.isArray(savedRoutePath) ? savedRoutePath : []}
      />
    );
  }

  const track = cleanTripTrack(pings);
  const positions = track.accepted.map(p => ({ lat: p.latitude, lng: p.longitude }));
  const plannedPath = Array.isArray(savedRoutePath)
    ? savedRoutePath.map(p => ({ lat: +p.lat, lng: +p.lng })).filter(p => isFinite(p.lat) && isFinite(p.lng))
    : [];

  if (positions.length === 0 && plannedPath.length < 2) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', color: '#9ca3af' }}>
        No GPS data available for this trip.
      </div>
    );
  }

  const mapLocations = [];
  const src = positions.length > 0 ? positions : plannedPath;
  if (src.length > 0) mapLocations.push({ lat: src[0].lat, lng: src[0].lng, title: `Start: ${startLocation || ''}` });
  if (src.length > 1) mapLocations.push({ lat: src[src.length-1].lat, lng: src[src.length-1].lng, title: `End: ${endLocation || ''}` });

  const pathToShow = positions.length > 1 ? positions : plannedPath;

  return (
    <GoogleMapStatic
      locations={mapLocations}
      path={pathToShow}
      height={400}
    />
  );
}

function GoogleMapStatic({ locations, path, height }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(maps => {
      if (cancelled || !divRef.current || !maps) return;
      const center = locations[0] ? { lat: locations[0].lat, lng: locations[0].lng } : { lat: 28.6139, lng: 77.2090 };
      if (!mapRef.current) {
        mapRef.current = new maps.Map(divRef.current, { center, zoom: 13, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
      }
      const map = mapRef.current;
      locations.forEach(loc => {
        const m = new maps.Marker({ position: { lat: loc.lat, lng: loc.lng }, map, title: loc.title || '' });
        if (loc.title) { const info = new maps.InfoWindow({ content: `<b>${loc.title}</b>` }); m.addListener('click', () => info.open(map, m)); }
      });
      if (path.length > 1) {
        new maps.Polyline({ path: path.map(p => ({ lat: p.lat, lng: p.lng })), map, strokeColor: '#10b981', strokeWeight: 4, strokeOpacity: 0.85 });
        const bounds = new maps.LatLngBounds();
        path.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds);
      }
    }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [locations, path]);

  if (error) return <div style={{ padding: 16, color: '#b91c1c', background: '#fef2f2', borderRadius: 8 }}>Map error: {error}</div>;
  return <div ref={divRef} style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }} />;
}
