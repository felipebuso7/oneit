import { describe, expect, it } from "vitest";

import { distanceInKm, validCoordinates } from "@/lib/geo/distance";

describe("distanceInKm", () => {
  it("calculates a real geodesic distance", () => {
    expect(distanceInKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2);
  });

  it("rejects invalid coordinates", () => {
    expect(validCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(validCoordinates({ latitude: -23.5, longitude: -46.6 })).toBe(true);
  });
});
