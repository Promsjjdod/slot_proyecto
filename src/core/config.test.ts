import { describe, expect, it } from "vitest";
import { CONFIG } from "./config";

describe("editable game configuration", () => {
  it("keeps the intended target and jackpot ladder", () => {
    expect(CONFIG.math.targetRtp).toBe(0.96);
    expect(CONFIG.pot.levels.map((level) => level.multiplier)).toEqual([20, 50, 250, 2000]);
    expect(CONFIG.pot.chanceUpgradeProbability).toBe(0.18);
    expect(CONFIG.bonus.buyCostBetMultiplier).toBe(535);
  });

  it("uses strips with enough coin clusters to make Hold & Spin reachable", () => {
    expect(CONFIG.reelStrips.every((strip) => strip.length === 160)).toBe(true);
    expect(CONFIG.reelStrips.every((strip) => strip.filter((symbol) => symbol === "COIN").length === 7)).toBe(true);
  });
});
