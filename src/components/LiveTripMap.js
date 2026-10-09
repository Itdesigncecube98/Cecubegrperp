'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps } from './GoogleMapsView';

// Smoothly follow the live position
export default function LiveTripMap({ tripId, isActive, startLocation, endLocation, startCoords, endCoords, plannedPath = [] }) {
  const [pings, setPings] = useState([]);
  const [follow, setFollow] = useState(true);
  const [eta, setEta] = useState(null);
  const [distLeft, setDistLeft] = useState(null);
  const intervalRef = useRef(null);

  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const completedPathRef = useRef(null);
  const remainingPathRef = useRef(null);
  const plannedPathRef = useRef(null);

  const fetchPings = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}/pings`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPings(data);
          // Calculate approx remaining distance to destination
          if (endCoords && data.length > 0) {
            const last = data[data.length - 1];
            const R = 6371;
            const dLat = (endCoords.lat - last.latitude) * Math.PI / 180;
            const dLng = (endCoords.lng - last.longitude) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(last.latitude*Math.PI/180)*Math.cos(endCoords.lat*Math.PI/180)*Math.sin(dLng/2)**2;
            const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            setDistLeft(km.toFixed(1));
            setEta(Math.round(km / 25 * 60)); // assume 25 km/h avg
          }
        }
      }
    } catch { /* silent */ }
  }, [tripId, endCoords]);

  useEffect(() => {
    fetchPings();
    if (isActive) {
      intervalRef.current = setInterval(fetchPings, 4000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, fetchPings]);

  const positions = pings.map(p => ({ lat: p.latitude, lng: p.longitude }));
  const livePos = positions.length > 0 ? positions[positions.length - 1] : null;
  const startPos = startCoords ? { lat: startCoords.lat, lng: startCoords.lng } : (positions[0] || null);
  const destPos = endCoords ? { lat: endCoords.lat, lng: endCoords.lng } : null;
  const center = livePos || startPos || { lat: 28.6139, lng: 77.2090 };

  const remainingPath = (() => {
    if (!livePos || plannedPath.length < 2) return [];
    let minDist = Infinity, minIdx = 0;
    plannedPath.forEach((p, i) => {
      const d = Math.hypot(p.lat - livePos.lat, p.lng - livePos.lng);
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    return plannedPath.slice(minIdx).map(p => ({ lat: p.lat, lng: p.lng }));
  })();

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;
    loadGoogleMaps().then(maps => {
      if (!maps) return;
      if (!instanceRef.current) {
        instanceRef.current = new maps.Map(mapRef.current, {
          center,
          zoom: 14,
          mapId: 'LIVE_TRIP_MAP_ID',
          mapTypeId: 'roadmap',
          zoomControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
          ]
        });
      }
      
      const map = instanceRef.current;

      // Update follow
      if (follow && livePos) {
        map.panTo(livePos);
      }

      // Start Marker
      if (startPos && !startMarkerRef.current) {
        startMarkerRef.current = new maps.marker.AdvancedMarkerElement({ position: startPos, map, title: 'Start' });
      }

      // Dest Marker
      if (destPos && !destMarkerRef.current) {
        destMarkerRef.current = new maps.marker.AdvancedMarkerElement({ position: destPos, map, title: 'Destination' });
      }

      // Live Vehicle Marker
      if (livePos) {
        if (!vehicleMarkerRef.current) {
          // create a pulsing div for the marker
          const pulseDiv = document.createElement('div');
          pulseDiv.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.35);"></div>`;
          vehicleMarkerRef.current = new maps.marker.AdvancedMarkerElement({
            position: livePos,
            map,
            content: pulseDiv,
            title: 'Live Position'
          });
        } else {
          vehicleMarkerRef.current.position = livePos;
        }
      }

      // Completed Path
      if (positions.length > 1) {
        if (!completedPathRef.current) {
          completedPathRef.current = new maps.Polyline({ path: positions, map, strokeColor: '#94a3b8', strokeOpacity: 0.6, strokeWeight: 4 });
        } else {
          completedPathRef.current.setPath(positions);
        }
      }

      // Remaining Path
      if (remainingPath.length > 1) {
        if (!remainingPathRef.current) {
          remainingPathRef.current = new maps.Polyline({ path: remainingPath, map, strokeColor: '#2563eb', strokeOpacity: 0.8, strokeWeight: 4 });
        } else {
          remainingPathRef.current.setPath(remainingPath);
        }
      }

      // Planned Path
      if (plannedPath.length > 1 && positions.length === 0) {
        if (!plannedPathRef.current) {
          plannedPathRef.current = new maps.Polyline({ path: plannedPath, map, strokeColor: '#3b82f6', strokeOpacity: 0.7, strokeWeight: 4 });
        } else {
          plannedPathRef.current.setPath(plannedPath);
        }
      }
    });
  }, [pings, follow, center, startPos, destPos, livePos, positions, remainingPath, plannedPath]);

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
      {isActive && (
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1000, display: 'flex', gap: 8 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 3px rgba(22,163,74,0.3)', animation: 'none' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>LIVE</span>
            {distLeft && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>{distLeft} km remaining</span>}
            {eta && <span style={{ fontSize: 12, color: '#2563eb', marginLeft: 4, fontWeight: 600 }}>~{eta} min ETA</span>}
          </div>
          <button
            onClick={() => setFollow(f => !f)}
            style={{ background: follow ? '#2563eb' : '#fff', color: follow ? '#fff' : '#374151', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          >
            {follow ? '📡 Following' : '🗺 Free'}
          </button>
        </div>
      )}

      <div ref={mapRef} style={{ height: 420, width: '100%' }}></div>

      {(startLocation || endLocation) && (
        <div style={{ background: '#fff', padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>From</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{startLocation || '—'}</div>
          </div>
          <div style={{ color: '#2563eb', fontSize: 18 }}>→</div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>To</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{endLocation || '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
