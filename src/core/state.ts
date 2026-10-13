import type { GameState, PotState } from "./types";

export function createPotState(): PotState {
  return { meter: 0, tierIndex: 0, vesselTotals: [0, 0, 0] };
}

export function clonePotState(pot: PotState): PotState {
  return { meter: pot.meter, tierIndex: pot.tierIndex, vesselTotals: [...pot.vesselTotals] };
}

export function createGameState(): GameState {
  return { pot: createPotState(), spinsPlayed: 0, bonusCount: 0 };
}
