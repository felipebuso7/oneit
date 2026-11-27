import { describe, expect, it } from "vitest";
import { distanceInKm, validCoordinates } from "@/lib/geo/distance";

describe("geolocalização operacional", () => {
  it("calcula somente distância geográfica identificada como linha reta", () => {
    const value = distanceInKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    expect(value).toBeGreaterThan(111);
    expect(value).toBeLessThan(112);
  });

  it("rejeita coordenadas fora do intervalo", () => {
    expect(validCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(validCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
    expect(validCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
  });
});
