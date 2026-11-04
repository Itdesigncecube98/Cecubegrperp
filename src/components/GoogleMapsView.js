'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_MAPS_API_KEY;

let mapsLoadPromise = null;

export function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsLoadPromise) return mapsLoadPromise;
  if (!MAPS_KEY) return Promise.reject(new Error('Google Maps browser key is missing; showing the road map fallback.'));

  mapsLoadPromise = new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, maps) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(maps);
    };
    const timer = setTimeout(() => finish(new Error('Google Maps did not respond; showing the road map fallback.')), 12000);
    window.__gmCallback = () => {
      const maps = window.google?.maps;
      finish(maps ? null : new Error('Google Maps did not initialize; showing the road map fallback.'), maps);
    };
    window.gm_authFailure = () => {
      window.__gmAuthFailed = true;
      window.dispatchEvent(new CustomEvent('gm_auth_failure'));
      finish(new Error('Google Maps rejected its browser key; showing the road map fallback.'));
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&loading=async&libraries=marker&callback=__gmCallback`;
    s.async = true; s.defer = true;
    s.onerror = () => finish(new Error('Failed to load Google Maps; showing the road map fallback.'));
    document.head.appendChild(s);
  }).catch(error => { mapsLoadPromise = null; throw error; });
  return mapsLoadPromise;
}

export default function GoogleMapsView({
  locations = [],
  paths = [],
  historyMarkers = [],
  height = 400,
  onLocationSelect = null,
  defaultCenter = null,
}) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const layerGroupRef = useRef(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then(({ default: L }) => {
      if (cancelled || !divRef.current) return;

      const map = L.map(divRef.current, { zoomControl: true }).setView([28.6139, 77.2090], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      leafletRef.current = L;
      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
      map.on('click', event => {
        onLocationSelectRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
      setMapReady(true);
    }).catch(loadError => {
      if (!cancelled) setError(`Could not load the map: ${loadError.message}`);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !leafletRef.current || !mapRef.current || !layerGroupRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const allPoints = [
      ...locations.map(location => ({
        lat: Number(location.latitude ?? location.lat),
        lng: Number(location.longitude ?? location.lng),
      })),
      ...paths.flat().map(point => ({ lat: Number(point.lat), lng: Number(point.lng) })),
    ].filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng));

    locations.forEach(location => {
      const lat = Number(location.latitude ?? location.lat);
      const lng = Number(location.longitude ?? location.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const isLive = Boolean(location.path?.length && location.source !== 'Office / App User');
      const color = isLive ? '#2563eb' : '#059669';
      const name = location.employee?.name || location.name || 'Employee';
      const marker = L.circleMarker([lat, lng], {
        radius: isLive ? 9 : 8,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
        pane: 'markerPane',
      });
      const popup = document.createElement('div');
      const employeeName = document.createElement('strong');
      employeeName.textContent = name;
      popup.appendChild(employeeName);
      const details = document.createElement('div');
      details.textContent = `${location.employee?.empId || ''} · ${location.employee?.department || 'Staff'}`;
      popup.appendChild(details);
      const status = document.createElement('div');
      status.textContent = `${isLive ? 'Live GPS' : 'In Office'}${location.punchTime ? ` · ${location.punchTime}` : ''}`;
      popup.appendChild(status);
      const tooltip = document.createElement('span');
      tooltip.textContent = name;
      marker.bindTooltip(tooltip).bindPopup(popup).addTo(layerGroup);
    });

    paths.forEach(path => {
      const points = path
        .map(point => [Number(point.lat), Number(point.lng)])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
      if (points.length > 1) {
        L.polyline(points, { color: '#3b82f6', weight: 4, opacity: 0.85 }).addTo(layerGroup);
      }
    });

    historyMarkers.forEach(loc => {
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = L.circleMarker([lat, lng], {
        radius: 4,
        color: '#ffffff',
        weight: 1,
        fillColor: '#94a3b8',
        fillOpacity: 1,
      });
      if (loc.title) marker.bindPopup(document.createTextNode(String(loc.title)));
      marker.addTo(layerGroup);
    });

    if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints.map(point => [point.lat, point.lng])), { padding: [24, 24] });
    } else if (allPoints.length === 1) {
      map.setView([allPoints[0].lat, allPoints[0].lng], 15);
    } else if (defaultCenter) {
      map.setView([defaultCenter.lat, defaultCenter.lng], 13);
    }
  }, [mapReady, locations, paths, historyMarkers, defaultCenter]);

  if (error) return <div role="alert" style={{ height, display: 'grid', placeItems: 'center', color: '#b91c1c' }}>{error}</div>;

  return <div ref={divRef} style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }} />;
}
