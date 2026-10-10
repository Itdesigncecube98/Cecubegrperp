export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// GET /api/maps?action=geocode&address=...
// GET /api/maps?action=directions&origin=lat,lng&destination=lat,lng
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'geocode') {
    const address = searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

    // Try Google Geocoding first (if key+API enabled)
    if (API_KEY) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', India')}&key=${API_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]) {
          const loc = data.results[0].geometry.location;
          return NextResponse.json({ lat: loc.lat, lng: loc.lng, formattedAddress: data.results[0].formatted_address });
        }
      } catch { /* fall through to Nominatim */ }
    }

    // Fallback: Nominatim with progressively simpler address variants
    const words = address.trim().split(/\s+/);
    const variants = [
      address + ', India',
      words.slice(1).join(' ') + ', India',
      words.slice(-3).join(' ') + ', India',
      words.slice(-2).join(' ') + ', India',
    ].filter((v, i, arr) => v.trim().length > 5 && arr.indexOf(v) === i);

    for (const variant of variants) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(variant)}&format=json&limit=1&countrycodes=in`;
        const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'CeCubeERP/1.0' }, signal: AbortSignal.timeout(8000) });
        const nomData = await nomRes.json();
        if (nomData?.[0]) {
          return NextResponse.json({
            lat: parseFloat(nomData[0].lat),
            lng: parseFloat(nomData[0].lon),
            formattedAddress: nomData[0].display_name
          });
        }
      } catch { /* try next */ }
    }

    return NextResponse.json({ error: `Could not locate "${address}". Try a shorter address like "Sector 92, Gurugram".` }, { status: 404 });
  }

  if (action === 'directions') {
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    if (!origin || !destination) return NextResponse.json({ error: 'origin and destination required' }, { status: 400 });

    // Try Google Directions first
    if (API_KEY) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${API_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.status === 'OK' && data.routes?.[0]) {
          const leg = data.routes[0].legs[0];
          return NextResponse.json({
            distanceMeters: leg.distance.value,
            distanceText: leg.distance.text,
            durationText: leg.duration.text,
            polyline: data.routes[0].overview_polyline.points
          });
        }
      } catch { /* fall through to OSRM */ }
    }

    // Fallback: OSRM free routing
    const [oLat, oLng] = origin.split(',');
    const [dLat, dLng] = destination.split(',');
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=polyline`;
    const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(10000) });
    const osrmData = await osrmRes.json();
    if (osrmData.code !== 'Ok' || !osrmData.routes?.[0]) {
      return NextResponse.json({ error: 'No driving route found. Check pickup and destination.' }, { status: 404 });
    }
    const route = osrmData.routes[0];
    const distanceMeters = Math.round(route.distance);
    const mins = Math.round(route.duration / 60);
    return NextResponse.json({
      distanceMeters,
      distanceText: `${(distanceMeters / 1000).toFixed(1)} km`,
      durationText: mins < 60 ? `${mins} mins` : `${Math.floor(mins/60)} hr ${mins%60} mins`,
      polyline: route.geometry
    });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
