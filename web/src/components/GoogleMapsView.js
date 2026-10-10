'use client';

import { useEffect, useRef } from 'react';

export function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window._googleMapsPromise) return window._googleMapsPromise;

  window._googleMapsPromise = new Promise((resolve, reject) => {
    window.__initGoogleMaps = () => resolve(window.google.maps);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&loading=async&libraries=marker&callback=__initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window._googleMapsPromise;
}

export default function GoogleMapsView({ locations = [], paths = [], historyMarkers = [], height = 400, onLocationSelect = null, defaultCenter = null }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const pickerMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    loadGoogleMaps().then((maps) => {
      if (!maps) return;
      
      const allPoints = [
        ...locations.map(l => ({ lat: l.latitude ?? l.lat, lng: l.longitude ?? l.lng })),
        ...paths.flat().map(p => ({ lat: p.lat, lng: p.lng }))
      ].filter(p => p.lat != null && p.lng != null);

      if (!instanceRef.current) {
        instanceRef.current = new maps.Map(mapRef.current, {
          center: defaultCenter || (allPoints.length > 0 ? allPoints[0] : { lat: 20.5937, lng: 78.9629 }),
          zoom: 13,
          mapId: 'DEMO_MAP_ID',
          mapTypeId: 'roadmap',
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });

        if (onLocationSelect) {
          instanceRef.current.addListener('click', (e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            onLocationSelect({ lat, lng });
          });
        }
      }

      const map = instanceRef.current;

      // Clear old markers/polylines
      markersRef.current.forEach(m => {
        if (m.setMap) m.setMap(null);
        else m.map = null;
      });
      polylinesRef.current.forEach(p => {
        if (p.setMap) p.setMap(null);
        else p.map = null;
      });
      markersRef.current = [];
      polylinesRef.current = [];

      // Add markers
      locations.forEach(loc => {
        const lat = loc.latitude ?? loc.lat;
        const lng = loc.longitude ?? loc.lng;
        if (lat == null || lng == null) return;
        
        const marker = new maps.marker.AdvancedMarkerElement({
          position: { lat, lng },
          map,
          title: loc.title || loc.label || loc.name || ''
        });
        
        if (loc.name || loc.title || loc.label) {
          const infoWindow = new maps.InfoWindow({ content: `<div style="padding:4px; font-weight:600; font-family:sans-serif;">${loc.name || loc.title || loc.label}</div>` });
          marker.addListener('click', () => infoWindow.open(map, marker));
        }
        markersRef.current.push(marker);
      });

      // (paths loop moved below)

      // Handle picker marker
      if (onLocationSelect && defaultCenter) {
        if (!pickerMarkerRef.current) {
          pickerMarkerRef.current = new maps.marker.AdvancedMarkerElement({
            position: defaultCenter,
            map,
            gmpDraggable: true
          });
          pickerMarkerRef.current.addListener('dragend', (e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            onLocationSelect({ lat, lng });
          });
        } else {
          pickerMarkerRef.current.position = defaultCenter;
        }
      }
      paths.forEach(path => {
        if (path.length < 2) return;
        const polyline = new maps.Polyline({
          path: path.map(p => ({ lat: p.lat, lng: p.lng })),
          geodesic: true,
          strokeColor: '#3b82f6',
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map
        });
        polylinesRef.current.push(polyline);
      });

      // Add history markers (small dots)
      historyMarkers.forEach(loc => {
        if (loc.lat == null || loc.lng == null) return;
        
        const div = document.createElement('div');
        div.style.width = '8px';
        div.style.height = '8px';
        div.style.backgroundColor = '#94a3b8';
        div.style.borderRadius = '50%';
        div.style.border = '1px solid #fff';
        div.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3)';
        
        const marker = new maps.marker.AdvancedMarkerElement({
          position: { lat: loc.lat, lng: loc.lng },
          map,
          content: div,
          title: loc.title || ''
        });
        
        if (loc.title) {
          const infoWindow = new maps.InfoWindow({ content: `<div style="padding:2px 4px; font-size:12px; font-weight:500; font-family:sans-serif; color:#475569">${loc.title}</div>` });
          marker.addListener('click', () => infoWindow.open(map, marker));
        }
        markersRef.current.push(marker);
      });

      if (allPoints.length > 1) {
        const bounds = new maps.LatLngBounds();
        allPoints.forEach(p => bounds.extend(p));
        map.fitBounds(bounds);
      } else if (allPoints.length === 1) {
        map.setCenter(allPoints[0]);
        map.setZoom(15);
      }
    });

    return () => {
      // Cleanup happens on next effect run or unmount
      markersRef.current.forEach(m => m.setMap(null));
      polylinesRef.current.forEach(p => p.setMap(null));
    };
  }, [locations, paths]);

  return (
    <div style={{ position: 'relative', height, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
