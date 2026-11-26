export type Coordinates = { latitude: number; longitude: number };

export function distanceInKm(from: Coordinates, to: Coordinates): number {
  const earthRadiusKm = 6371.0088;
  const radians = (value: number) => value * Math.PI / 180;
  const dLatitude = radians(to.latitude - from.latitude);
  const dLongitude = radians(to.longitude - from.longitude);
  const latitudeFrom = radians(from.latitude);
  const latitudeTo = radians(to.latitude);
  const a = Math.sin(dLatitude / 2) ** 2 + Math.cos(latitudeFrom) * Math.cos(latitudeTo) * Math.sin(dLongitude / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") return false;
  const coordinates = value as Partial<Coordinates>;
  return typeof coordinates.latitude === "number" && Number.isFinite(coordinates.latitude) && coordinates.latitude >= -90 && coordinates.latitude <= 90
    && typeof coordinates.longitude === "number" && Number.isFinite(coordinates.longitude) && coordinates.longitude >= -180 && coordinates.longitude <= 180;
}
