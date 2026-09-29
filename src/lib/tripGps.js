const EARTH_RADIUS_KM = 6371;
const MAX_PLAUSIBLE_SPEED_KMH = 160;
const MAX_DRAW_GAP_MS = 45 * 60 * 1000;

export function distanceBetweenGpsPoints(a, b) {
  const radians = degrees => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, h)));
}

/** Remove invalid/impossible GPS jumps and split the displayed line across long signal gaps. */
export function cleanTripTrack(pings = []) {
  const ordered = pings
    .map(ping => ({
      latitude: Number(ping.latitude),
      longitude: Number(ping.longitude),
      timestamp: new Date(ping.timestamp).getTime(),
    }))
    .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180
      && Number.isFinite(point.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  const accepted = [];
  for (const point of ordered) {
    const previous = accepted[accepted.length - 1];
    if (previous) {
      const elapsedHours = (point.timestamp - previous.timestamp) / 3_600_000;
      if (elapsedHours <= 0) continue;
      const distanceKm = distanceBetweenGpsPoints(previous, point);
      if (distanceKm / elapsedHours > MAX_PLAUSIBLE_SPEED_KMH) continue;
    }
    accepted.push(point);
  }

  const segments = [];
  for (const point of accepted) {
    const previousSegment = segments[segments.length - 1];
    const previous = previousSegment?.[previousSegment.length - 1];
    if (!previous || point.timestamp - previous.timestamp > MAX_DRAW_GAP_MS) {
      segments.push([point]);
    } else {
      previousSegment.push(point);
    }
  }

  const distanceKm = accepted.slice(1).reduce((sum, point, index) => {
    return sum + distanceBetweenGpsPoints(accepted[index], point);
  }, 0);

  return { accepted, segments, distanceKm };
}
