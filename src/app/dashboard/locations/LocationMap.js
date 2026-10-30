import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/components/GoogleMapsView';

export default function LocationMap({ marker, radiusMeters, onMapClick, flyTo }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [authError, setAuthError] = useState(typeof window !== 'undefined' && Boolean(window.__gmAuthFailed));

  useEffect(() => {
    const onAuthFail = () => setAuthError(true);
    window.addEventListener('gm_auth_failure', onAuthFail);
    return () => window.removeEventListener('gm_auth_failure', onAuthFail);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(maps => {
      if (cancelled || !divRef.current) return;
      const center = marker ? { lat: marker.lat, lng: marker.lng } : { lat: 20.5937, lng: 78.9629 };
      if (!mapRef.current) {
        mapRef.current = new maps.Map(divRef.current, {
          center, zoom: marker ? 15 : 5,
          mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        });
        if (onMapClick) {
          mapRef.current.addListener('click', e => {
            onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          });
        }
      }
      const map = mapRef.current;
      if (markerRef.current) markerRef.current.setMap(null);
      if (circleRef.current) circleRef.current.setMap(null);
      if (marker) {
        markerRef.current = new maps.Marker({ position: { lat: marker.lat, lng: marker.lng }, map, draggable: true });
        markerRef.current.addListener('dragend', e => {
          if (onMapClick) onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        if (radiusMeters > 0) {
          circleRef.current = new maps.Circle({
            center: { lat: marker.lat, lng: marker.lng }, radius: radiusMeters, map,
            strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 2,
            fillColor: '#3b82f6', fillOpacity: 0.15,
          });
        }
        map.setCenter({ lat: marker.lat, lng: marker.lng });
      }
      if (flyTo) map.panTo({ lat: flyTo.lat, lng: flyTo.lng });
    });
    return () => { cancelled = true; };
  }, [marker, radiusMeters, onMapClick, flyTo]);

  return <div ref={divRef} style={{ width: '100%', height: '380px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }} />;
}
