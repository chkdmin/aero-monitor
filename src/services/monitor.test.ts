import { describe, it, expect } from "vitest";
import { determineRangeStatus, MonitorState } from "./monitor.js";

describe("determineRangeStatus", () => {
  // Common test range: tickLower=1000, tickUpper=2000, width=1000
  // With 10% threshold => thresholdTicks = 100
  // near_boundary lower zone: [1000, 1100)
  // in_range zone:            [1100, 1900)
  // near_boundary upper zone: [1900, 2000)

  it("returns 'in_range' when tick is well within range", () => {
    const status = determineRangeStatus(1500, 1000, 2000, 10);
    expect(status).toBe("in_range");
  });

  it("returns 'near_boundary' when tick is near lower boundary", () => {
    const status = determineRangeStatus(1050, 1000, 2000, 10);
    expect(status).toBe("near_boundary");
  });

  it("returns 'near_boundary' when tick is near upper boundary", () => {
    const status = determineRangeStatus(1950, 1000, 2000, 10);
    expect(status).toBe("near_boundary");
  });

  it("returns 'out_of_range' when tick is below range", () => {
    const status = determineRangeStatus(999, 1000, 2000, 10);
    expect(status).toBe("out_of_range");
  });

  it("returns 'out_of_range' when tick is at or above upper boundary", () => {
    // Exactly at tickUpper (exclusive upper bound)
    expect(determineRangeStatus(2000, 1000, 2000, 10)).toBe("out_of_range");
    // Above tickUpper
    expect(determineRangeStatus(2001, 1000, 2000, 10)).toBe("out_of_range");
  });

  it("edge case: tick exactly at tickLower is in range (near_boundary with threshold)", () => {
    // With 10% threshold, tickLower=1000 falls into [1000, 1100) => near_boundary
    const status = determineRangeStatus(1000, 1000, 2000, 10);
    expect(status).toBe("near_boundary");
  });

  it("edge case: tick exactly at tickLower with 0% threshold is in_range", () => {
    // With 0% threshold, there is no near_boundary zone, so tickLower is in_range
    const status = determineRangeStatus(1000, 1000, 2000, 0);
    expect(status).toBe("in_range");
  });

  it("edge case: tick exactly at tickUpper is out_of_range (exclusive upper bound)", () => {
    const status = determineRangeStatus(2000, 1000, 2000, 10);
    expect(status).toBe("out_of_range");
  });

  it("edge case: threshold 0% produces only in_range or out_of_range", () => {
    // thresholdTicks = 0, so near_boundary zones are empty
    expect(determineRangeStatus(1000, 1000, 2000, 0)).toBe("in_range");
    expect(determineRangeStatus(1500, 1000, 2000, 0)).toBe("in_range");
    expect(determineRangeStatus(1999, 1000, 2000, 0)).toBe("in_range");
    expect(determineRangeStatus(999, 1000, 2000, 0)).toBe("out_of_range");
    expect(determineRangeStatus(2000, 1000, 2000, 0)).toBe("out_of_range");
  });
});

describe("MonitorState", () => {
  it("first check with in_range returns state change (initial alert)", () => {
    const monitor = new MonitorState();
    const result = monitor.checkStateChange(1n, "in_range");
    expect(result).toEqual({ previousStatus: null, currentStatus: "in_range" });
  });

  it("first check with out_of_range returns state change", () => {
    const monitor = new MonitorState();
    const result = monitor.checkStateChange(1n, "out_of_range");
    expect(result).toEqual({
      previousStatus: null,
      currentStatus: "out_of_range",
    });
  });

  it("first check with near_boundary returns state change", () => {
    const monitor = new MonitorState();
    const result = monitor.checkStateChange(1n, "near_boundary");
    expect(result).toEqual({
      previousStatus: null,
      currentStatus: "near_boundary",
    });
  });

  it("same status on consecutive checks returns null", () => {
    const monitor = new MonitorState();

    // First check: in_range (returns null for initial in_range)
    monitor.checkStateChange(1n, "in_range");

    // Second check: still in_range (no change)
    const result = monitor.checkStateChange(1n, "in_range");
    expect(result).toBeNull();
  });

  it("status change returns previous and current", () => {
    const monitor = new MonitorState();

    // First check: in_range
    monitor.checkStateChange(1n, "in_range");

    // Second check: near_boundary
    const result = monitor.checkStateChange(1n, "near_boundary");
    expect(result).toEqual({
      previousStatus: "in_range",
      currentStatus: "near_boundary",
    });
  });

  it("tracks multiple positions independently", () => {
    const monitor = new MonitorState();

    // Position 1: in_range
    monitor.checkStateChange(1n, "in_range");
    // Position 2: out_of_range (first time, alerts)
    const result2 = monitor.checkStateChange(2n, "out_of_range");
    expect(result2).toEqual({
      previousStatus: null,
      currentStatus: "out_of_range",
    });

    // Position 1 changes to out_of_range
    const result1 = monitor.checkStateChange(1n, "out_of_range");
    expect(result1).toEqual({
      previousStatus: "in_range",
      currentStatus: "out_of_range",
    });

    // Position 2 stays out_of_range
    const result2again = monitor.checkStateChange(2n, "out_of_range");
    expect(result2again).toBeNull();
  });

  it("detects transition back to in_range", () => {
    const monitor = new MonitorState();

    // Start out_of_range
    monitor.checkStateChange(1n, "out_of_range");

    // Move to in_range
    const result = monitor.checkStateChange(1n, "in_range");
    expect(result).toEqual({
      previousStatus: "out_of_range",
      currentStatus: "in_range",
    });
  });
});
