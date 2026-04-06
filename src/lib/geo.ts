/** 逆ジオコーディング（座標 → 地名） */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{
  area_name: string;
  area_code: string;
  area_keywords: string[];
}> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja&zoom=16`,
    { headers: { "User-Agent": "OsanpoQuest/1.0" } }
  );

  if (!res.ok) {
    console.error(`[reverseGeocode] Nominatim API error: ${res.status}`);
    return { area_name: "不明な場所", area_code: "unknown", area_keywords: [] };
  }

  const data = await res.json();
  const address = data.address;

  if (!address) {
    console.warn("[reverseGeocode] No address in response");
    return { area_name: "不明な場所", area_code: "unknown", area_keywords: [] };
  }

  const area_name =
    [
      address.state || address.province,
      address.city || address.town,
      address.suburb || address.neighbourhood,
    ]
      .filter(Boolean)
      .join("") || "不明な場所";

  const area_code = area_name.replace(/[都道府県市区町村]/g, "_").toLowerCase();

  const area_keywords = [
    address.suburb,
    address.neighbourhood,
    data.name,
  ].filter(Boolean);

  return { area_name, area_code, area_keywords };
}

/** 方角と距離からゴール座標を計算 */
export function calculateGoalPosition(
  startLat: number,
  startLng: number,
  bearingDegrees: number,
  distanceMeters: number
): { lat: number; lng: number } {
  const R = 6371000;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat1 = (startLat * Math.PI) / 180;
  const lng1 = (startLng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceMeters / R) +
      Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distanceMeters / R) * Math.cos(lat1),
      Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

/** Haversine距離計算（メートル） */
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** クリア判定 */
export function isQuestComplete(
  userLat: number,
  userLng: number,
  goalLat: number,
  goalLng: number,
  radiusMeters: number
): boolean {
  return getDistanceMeters(userLat, userLng, goalLat, goalLng) <= radiusMeters;
}
