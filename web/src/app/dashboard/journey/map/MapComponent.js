'use client';
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/components/GoogleMapsView';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];

export default function MapComponent({ trips: initialTrips = [], selectedTripId }) {
  const [trips, setTrips] = useState(initialTrips || []);
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const linesRef = useRef([]);
  const markersRef = useRef([]);
  const liveMarkerRef = useRef(null);
  const liveIntervalRef = useRef(null);

  useEffect(() => { setTrips(initialTrips || []); }, [initialTrips]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(maps => {
      if (cancelled || !divRef.current) return;
      if (!mapRef.current) {
        mapRef.current = new maps.Map(divRef.current, {
          center: { lat: 28.6139, lng: 77.2090 }, zoom: 5,
          mapTypeControl: false, streetViewControl: false,
        });
      }
      const map = mapRef.current;
      linesRef.current.forEach(l => l.setMap(null));
      markersRef.current.forEach(m => m.setMap(null));
      linesRef.current = []; markersRef.current = [];

      let allPoints = [];
      trips.forEach((trip, idx) => {
        const pings = trip.pings || [];
        if (pings.length < 2) return;
        const color = COLORS[idx % COLORS.length];
        const path = pings.map(p => ({ lat: p.latitude, lng: p.longitude }));
        allPoints = allPoints.concat(path);
        const line = new maps.Polyline({ path, map, strokeColor: color, strokeWeight: 3, strokeOpacity: 0.8 });
        linesRef.current.push(line);
        const sm = new maps.Marker({ position: path[0], map,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#16a34a', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          title: `Start: ${trip.startLocation || ''}`
        });
        markersRef.current.push(sm);
        const em = new maps.Marker({ position: path[path.length-1], map,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          title: `End: ${trip.endLocation || ''}`
        });
        markersRef.current.push(em);
      });

      if (allPoints.length > 1) {
        const bounds = new maps.LatLngBounds();
        allPoints.forEach(p => bounds.extend(p));
        map.fitBounds(bounds);
      }

      clearInterval(liveIntervalRef.current);
      if (liveMarkerRef.current) { liveMarkerRef.current.setMap(null); liveMarkerRef.current = null; }
      const activeTrip = trips.find(t => t.status === 'ACTIVE' && (selectedTripId ? String(t.id) === String(selectedTripId) : true));
      if (activeTrip) {
        const poll = async () => {
          try {
            const res = await fetch(`/api/trips/${activeTrip.id}/pings`);
            if (!res.ok) return;
            const data = await res.json();
            if (!Array.isArray(data) || !data.length) return;
            const last = data[data.length - 1];
            const pos = { lat: last.latitude, lng: last.longitude };
            if (liveMarkerRef.current) { liveMarkerRef.current.setPosition(pos); }
            else {
              liveMarkerRef.current = new maps.Marker({ position: pos, map,
                icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#2563eb', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
                title: 'Live Position', zIndex: 999,
              });
            }
            if (!cancelled) map.panTo(pos);
          } catch {}
        };
        poll();
        liveIntervalRef.current = setInterval(poll, 5000);
      }
    });
    return () => { cancelled = true; clearInterval(liveIntervalRef.current); };
  }, [trips, selectedTripId]);

  return <div ref={divRef} style={{ height: '100%', width: '100%', minHeight: '400px' }} />;
}
