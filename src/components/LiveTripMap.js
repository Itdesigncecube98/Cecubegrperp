'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps } from '@/components/GoogleMapsView';
import { cleanTripTrack, distanceBetweenGpsPoints } from '@/lib/tripGps';

const STYLE = `
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.6); }
    70% { box-shadow: 0 0 0 14px rgba(37,99,235,0); }
    100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
  }
  .live-dot {
    width: 18px; height: 18px; border-radius: 50%;
    background: #2563eb; border: 3px solid #fff;
    box-shadow: 0 0 0 0 rgba(37,99,235,0.6);
    animation: pulse 1.8s infinite;
    cursor: pointer;
  }
`;

const ROUTE_DEVIATION_KM = 0.2;
const MIN_REROUTE_INTERVAL_MS = 75_000;
const TRAFFIC_REFRESH_INTERVAL_MS = 3 * 60_000;

function distanceToRouteKm(location, route) {
  if (!route.length) return Infinity;
  return route.reduce((nearest, point) => Math.min(nearest, distanceBetweenGpsPoints(location, point)), Infinity);
}

export default function LiveTripMap({ tripId, isActive, startLocation, endLocation, startCoords, endCoords, plannedPath = [], ratePerKm = 0, travelMode = 'DRIVING' }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const liveDotRef = useRef(null);       // AdvancedMarkerElement for live dot
  const pathLineRef = useRef(null);      // Grey travelled line
  const plannedLineRef = useRef(null);   // Blue planned route
  const startMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [pings, setPings] = useState([]);
  const [follow, setFollow] = useState(true);
  const [distLeft, setDistLeft] = useState(null);
  const [eta, setEta] = useState(null);
  const [distTravelled, setDistTravelled] = useState(0);
  const [routeStatus, setRouteStatus] = useState('');
  const [gpsStatus, setGpsStatus] = useState('Waiting for GPS…');
  const [clockNow, setClockNow] = useState(Date.now());
  const routeRef = useRef({ points: [], line: null });
  const routeMetricsRef = useRef({ distanceKm: null, durationMinutes: null });
  const lastRouteRequestAtRef = useRef(0);
  const routeRequestIdRef = useRef(0);

  useEffect(() => () => {
    routeRequestIdRef.current += 1;
  }, []);

  // Init map once
  useEffect(() => {
    if (!divRef.current) return;
    let cancelled = false;
    // Inject pulse CSS
    if (!document.getElementById('live-trip-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'live-trip-style';
      styleEl.textContent = STYLE;
      document.head.appendChild(styleEl);
    }

    loadGoogleMaps().then(async maps => {
      if (cancelled || !divRef.current) return;
      mapsRef.current = maps;

      const center = startCoords || { lat: 28.6139, lng: 77.2090 };
      const map = new maps.Map(divRef.current, {
        center, zoom: 14,
        mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, zoomControl: true,
        mapId: 'DEMO_MAP_ID',
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      });
      mapRef.current = map;

      // Planned route — dashed blue
      if (plannedPath.length > 1) {
        routeRef.current.points = plannedPath
          .map(point => ({ latitude: Number(point.lat), longitude: Number(point.lng) }))
          .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
        plannedLineRef.current = new maps.Polyline({
          path: plannedPath.map(p => ({ lat: +p.lat, lng: +p.lng })),
          map, strokeColor: '#93c5fd', strokeWeight: 4, strokeOpacity: 0.7,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '12px' }],
        });
      }

      // Start marker — green circle
      if (startCoords) {
        startMarkerRef.current = new maps.Marker({
          position: startCoords, map,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#16a34a', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
          title: startLocation || 'Start',
        });
        new maps.InfoWindow({ content: `<div style="font-size:12px;font-weight:600;color:#166534">📍 ${startLocation || 'Start'}</div>` })
          .open(map, startMarkerRef.current);
      }

      // Destination — red pin
      if (endCoords) {
        destMarkerRef.current = new maps.Marker({
          position: endCoords, map,
          icon: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new maps.Size(40, 40) },
          title: endLocation || 'Destination',
        });
      }

      // Live dot using AdvancedMarkerElement for CSS animation
      try {
        const { AdvancedMarkerElement } = await maps.importLibrary('marker');
        const dotEl = document.createElement('div');
        dotEl.className = 'live-dot';
        liveDotRef.current = new AdvancedMarkerElement({ map, content: dotEl, zIndex: 999 });
        liveDotRef.current.position = startCoords || { lat: 28.6139, lng: 77.2090 };
      } catch {
        // Fallback to regular marker
        liveDotRef.current = new maps.Marker({
          map,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#2563eb', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
          zIndex: 999,
        });
      }

      setMapReady(true);
    });
    return () => { cancelled = true; };
  }, []);  // run once

  // Fetch pings
  const fetchPings = useCallback(async () => {
    if (!tripId) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/pings`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setPings(data);
      }
    } catch {}
  }, [tripId]);

  useEffect(() => {
    fetchPings();
    if (!isActive) return;
    const interval = setInterval(fetchPings, 4000);
    return () => clearInterval(interval);
  }, [isActive, fetchPings]);

  useEffect(() => {
    if (!isActive) return undefined;
    const interval = window.setInterval(() => setClockNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    const acceptedPings = cleanTripTrack(pings).accepted;
    const lastPing = acceptedPings[acceptedPings.length - 1];
    if (!lastPing) {
      setGpsStatus('Waiting for GPS…');
      return;
    }
    const ageSeconds = Math.max(0, Math.floor((clockNow - lastPing.timestamp) / 1000));
    if (ageSeconds > 90) {
      const ageMinutes = Math.floor(ageSeconds / 60);
      setGpsStatus(`GPS signal delayed · updated ${ageMinutes} min ago`);
    } else {
      setGpsStatus(ageSeconds < 15 ? 'GPS live · updated just now' : `GPS live · updated ${ageSeconds}s ago`);
    }
  }, [pings, clockNow]);

  // Update map when pings arrive
  useEffect(() => {
    if (!mapReady || !mapsRef.current || pings.length === 0) return;
    const maps = mapsRef.current;
    const map = mapRef.current;

    const cleanedTrack = cleanTripTrack(pings);
    const path = cleanedTrack.accepted.map(p => ({ lat: p.latitude, lng: p.longitude }));
    if (path.length === 0) return;
    const livePos = path[path.length - 1];
    const liveGps = { latitude: livePos.lat, longitude: livePos.lng };
    const destinationGps = endCoords ? { latitude: Number(endCoords.lat), longitude: Number(endCoords.lng) } : null;

    // Move live dot
    if (liveDotRef.current) {
      if (liveDotRef.current.position !== undefined) {
        liveDotRef.current.position = livePos;  // AdvancedMarkerElement
      } else {
        liveDotRef.current.setPosition(livePos);  // Marker
      }
    }

    // Draw grey travelled path
    if (pathLineRef.current) pathLineRef.current.setMap(null);
    if (path.length > 1) {
      pathLineRef.current = new maps.Polyline({
        path, map, strokeColor: '#64748b', strokeWeight: 4, strokeOpacity: 0.55,
      });
    }

    // Auto-follow camera
    if (follow) map.panTo(livePos);

    // Distance travelled (sum of all ping segments)
    const totalKm = cleanedTrack.distanceKm;
    setDistTravelled(totalKm);

    // Follow the remaining planned route from the closest point to the vehicle.
    if (endCoords) {
      const route = routeRef.current.points.length > 1
        ? routeRef.current.points
        : plannedPath.map(point => ({ latitude: Number(point.lat), longitude: Number(point.lng) }))
          .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
      let km = distanceBetweenGpsPoints(liveGps, destinationGps);
      if (route.length > 1) {
        let closestIndex = 0;
        let closestDistance = Infinity;
        route.forEach((point, index) => {
          const distance = distanceBetweenGpsPoints(liveGps, point);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });
        km = route.slice(closestIndex).reduce((sum, point, index, remaining) => {
          if (index === 0) return sum + distanceBetweenGpsPoints(liveGps, point);
          return sum + distanceBetweenGpsPoints(remaining[index - 1], point);
        }, 0);
      }
      setDistLeft(km.toFixed(1));
      const routeMetrics = routeMetricsRef.current;
      const remainingMinutes = routeMetrics.distanceKm > 0 && Number.isFinite(routeMetrics.durationMinutes)
        ? Math.ceil(routeMetrics.durationMinutes * km / routeMetrics.distanceKm)
        : null;
      setEta(remainingMinutes);
    }
  }, [pings, mapReady, follow, endCoords, plannedPath]);

  // Recompute the route from the latest GPS position, using live traffic. Calls
  // are throttled; a driver who stays on route only gets a traffic refresh every
  // few minutes, while a clear deviation triggers the next eligible reroute.
  useEffect(() => {
    if (!mapReady || !isActive || !endCoords || pings.length === 0) return undefined;

    const cleanedTrack = cleanTripTrack(pings);
    const latest = cleanedTrack.accepted[cleanedTrack.accepted.length - 1];
    if (!latest) return undefined;

    const origin = { lat: latest.latitude, lng: latest.longitude };
    const destination = { lat: Number(endCoords.lat), lng: Number(endCoords.lng) };
    if (!Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) return undefined;

    const now = Date.now();
    const routePoints = routeRef.current.points;
    const offRoute = routePoints.length > 1 && distanceToRouteKm(latest, routePoints) > ROUTE_DEVIATION_KM;
    const elapsed = now - lastRouteRequestAtRef.current;
    const needsInitialRoute = lastRouteRequestAtRef.current === 0;
    const needsRouteRetry = !Number.isFinite(routeMetricsRef.current.distanceKm)
      && elapsed >= MIN_REROUTE_INTERVAL_MS;
    const shouldReroute = offRoute && elapsed >= MIN_REROUTE_INTERVAL_MS;
    const shouldRefreshTraffic = elapsed >= TRAFFIC_REFRESH_INTERVAL_MS;
    if (!needsInitialRoute && !needsRouteRetry && !shouldReroute && !shouldRefreshTraffic) return undefined;

    lastRouteRequestAtRef.current = now;
    const requestId = ++routeRequestIdRef.current;
    setRouteStatus(offRoute ? 'Finding a better route…' : 'Checking live traffic…');

    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const { Route } = await maps.importLibrary('routes');
        const { routes } = await Route.computeRoutes({
          origin,
          destination,
          travelMode,
          routingPreference: 'TRAFFIC_AWARE',
          fields: ['path', 'distanceMeters', 'durationMillis'],
        });
        if (requestId !== routeRequestIdRef.current) return;
        const route = routes?.[0];
        if (!route) throw new Error('No driving route was returned.');

        const polylines = route.createPolylines();
        const nextLine = polylines?.[0];
        if (nextLine && mapRef.current) {
          nextLine.setOptions({
            strokeColor: '#2563eb',
            strokeWeight: 5,
            strokeOpacity: 0.9,
            map: mapRef.current,
          });
          plannedLineRef.current?.setMap(null);
          plannedLineRef.current = nextLine;
          routeRef.current.line = nextLine;
          routeRef.current.points = nextLine.getPath().getArray().map(point => ({
            latitude: point.lat(),
            longitude: point.lng(),
          }));
        }

        if (Number.isFinite(route.distanceMeters)) {
          routeMetricsRef.current.distanceKm = route.distanceMeters / 1000;
          setDistLeft(routeMetricsRef.current.distanceKm.toFixed(1));
        }
        routeMetricsRef.current.durationMinutes = Number.isFinite(route.durationMillis)
          ? route.durationMillis / 60_000
          : null;
        setEta(routeMetricsRef.current.durationMinutes == null ? null : Math.max(1, Math.ceil(routeMetricsRef.current.durationMinutes)));
        setRouteStatus('Route and ETA updated with live traffic');
      } catch (error) {
        if (requestId !== routeRequestIdRef.current) return;
        console.warn('Live traffic route refresh failed:', error);
        if (!Number.isFinite(routeMetricsRef.current.durationMinutes)) setEta(null);
        setRouteStatus('Live route unavailable; showing the planned route');
      }
    })();
  }, [mapReady, isActive, endCoords, pings, travelMode]);

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>

      {/* Ola/Uber style top status bar */}
      {isActive && (
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1000, display: 'flex', gap: 8, pointerEvents: 'none' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 4px rgba(22,163,74,0.25)' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>LIVE</span>
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>📍 {distTravelled.toFixed(1)} km</span>
            <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700 }}>₹{(distTravelled * Number(ratePerKm || 0)).toFixed(2)} earned</span>
            {distLeft && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>· {distLeft} km left</span>}
            {eta != null && <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, marginLeft: 4 }}>Traffic ETA ~{eta} min</span>}
          </div>
          <button
            onClick={() => setFollow(f => !f)}
            style={{ background: follow ? '#2563eb' : '#fff', color: follow ? '#fff' : '#374151', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', pointerEvents: 'all' }}
          >
            {follow ? '📡 Following' : '🗺 Free'}
          </button>
        </div>
      )}
      {isActive && routeStatus && (
        <div style={{ position: 'absolute', top: 58, left: 12, zIndex: 1000, background: '#fff', borderRadius: 8, padding: '5px 9px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', color: '#475569', fontSize: 11, fontWeight: 600 }}>
          {routeStatus}
        </div>
      )}
      {isActive && (
        <div style={{ position: 'absolute', top: routeStatus ? 86 : 58, left: 12, zIndex: 1000, background: '#fff', borderRadius: 8, padding: '5px 9px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', color: gpsStatus.includes('delayed') ? '#b45309' : '#475569', fontSize: 11, fontWeight: 600 }}>
          {gpsStatus}
        </div>
      )}

      {/* Map */}
      <div ref={divRef} style={{ height: 420, width: '100%' }} />

      {/* Bottom From → To bar */}
      {(startLocation || endLocation) && (
        <div style={{ background: '#fff', padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{startLocation || '—'}</div>
          </div>
          <div style={{ color: '#2563eb', fontSize: 18, fontWeight: 700 }}>→</div>
          <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{endLocation || '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
