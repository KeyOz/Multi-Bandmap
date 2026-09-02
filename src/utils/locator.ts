export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Converts a Maidenhead locator (4 or 6 chars) to Latitude & Longitude (center of square/subsquare).
 */
export function locatorToLatLng(locator?: string): LatLng | null {
  if (!locator || typeof locator !== "string") return null;
  const loc = locator.trim().toUpperCase();
  if (loc.length < 4) return null;

  const A = "A".charCodeAt(0);
  const f1 = loc.charCodeAt(0) - A;
  const f2 = loc.charCodeAt(1) - A;

  if (f1 < 0 || f1 > 17 || f2 < 0 || f2 > 17) return null;

  let lng = f1 * 20 - 180;
  let lat = f2 * 10 - 90;

  const d1 = parseInt(loc[2], 10);
  const d2 = parseInt(loc[3], 10);
  if (isNaN(d1) || isNaN(d2) || d1 < 0 || d1 > 9 || d2 < 0 || d2 > 9) return null;

  lng += d1 * 2;
  lat += d2 * 1;

  if (loc.length >= 6) {
    const s1 = loc.charCodeAt(4) - A;
    const s2 = loc.charCodeAt(5) - A;
    if (s1 >= 0 && s1 < 24 && s2 >= 0 && s2 < 24) {
      lng += s1 * (2 / 24) + (1 / 24);
      lat += s2 * (1 / 24) + (0.5 / 24);
    } else {
      lng += 1.0;
      lat += 0.5;
    }
  } else {
    lng += 1.0;
    lat += 0.5;
  }

  return { lat, lng };
}

/**
 * Generates intermediate points along the spherical great circle arc between two points.
 */
export function getGreatCirclePoints(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  numPoints: number = 40
): [number, number][] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const lambda1 = toRad(lon1);
  const phi2 = toRad(lat2);
  const lambda2 = toRad(lon2);

  // Angular distance between points
  const sinDLat2 = Math.sin((phi2 - phi1) / 2);
  const sinDLon2 = Math.sin((lambda2 - lambda1) / 2);
  const a = sinDLat2 * sinDLat2 + Math.cos(phi1) * Math.cos(phi2) * sinDLon2 * sinDLon2;
  const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (d < 0.0001) {
    return [[lat1, lon1], [lat2, lon2]];
  }

  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
    const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);

    const phi = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lambda = Math.atan2(y, x);

    points.push([toDeg(phi), toDeg(lambda)]);
  }

  return points;
}
