import rawConfig from "./config.json";
import { clonePotState, createPotState } from "./state";
import type {
  BonusResult,
  CellSymbol,
  CoinSymbol,
  FeatureRound,
  GameConfig,
  GameState,
  Grid,
  JackpotId,
  PotState,
  RandomSource,
  SpinResult,
  SymbolId,
  WayWin,
} from "./types";
import { SeededRng } from "./rng";

export const gameConfig = rawConfig as GameConfig;

export interface WaysEvaluation {
  multiplier: number;
  wins: WayWin[];
  winningCells: Set<string>;
}

export function evaluateWays(grid: Grid, config: GameConfig = gameConfig): WaysEvaluation {
  const wins: WayWin[] = [];
  const winningCells = new Set<string>();
  let multiplier = 0;
  const payingSymbols = Object.keys(config.paytable) as SymbolId[];

  for (const target of payingSymbols) {
    let reelsMatched = 0;
    let ways = 1;
    const reelRows: number[][] = [];

    for (let reel = 0; reel < config.game.reels; reel += 1) {
      const matches: number[] = [];
      for (let row = 0; row < config.game.rows; row += 1) {
        const cell = grid[reel]?.[row];
        const matchesTarget = cell === target || (target !== "WILD" && cell === "WILD");
        if (matchesTarget) matches.push(row);
      }
      if (matches.length === 0) break;
      ways *= matches.length;
      reelsMatched += 1;
      reelRows.push(matches);
    }

    if (reelsMatched < 3) continue;
    const pay = config.paytable[target]?.[String(reelsMatched)] ?? 0;
    if (pay <= 0) continue;
    multiplier += ways * pay;
    wins.push({ symbol: target, reelsMatched, ways, multiplier: ways * pay, reelRows });
    for (let reel = 0; reel < reelsMatched; reel += 1) {
      for (const row of reelRows[reel] ?? []) winningCells.add(`${reel}:${row}`);
    }
  }

  return { multiplier, wins, winningCells };
}

function emptyGrid(): Grid {
  return Array.from({ length: gameConfig.game.reels }, () => Array<CellSymbol>(gameConfig.game.rows).fill("EMPTY"));
}

function cloneCoins(coins: CoinSymbol[]): CoinSymbol[] {
  return coins.map((coin) => ({ ...coin }));
}

function totalCoinValue(coins: CoinSymbol[]): number {
  return coins.reduce((total, coin) => total + coin.value, 0);
}

function roundCredits(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class SlotEngine {
  readonly rng: RandomSource;
  readonly config: GameConfig;

  constructor(seed = gameConfig.math.defaultSeed, config: GameConfig = gameConfig, rng?: RandomSource) {
    this.config = config;
    this.rng = rng ?? new SeededRng(seed);
  }

  spin(bet: number, state: GameState): SpinResult {
    this.validateBet(bet);
    const potBefore = clonePotState(state.pot);
    const grid = this.makeGrid();
    const coins = this.materializeGridCoins(grid, state.pot);
    const ways = evaluateWays(grid, this.config);
    const waysWin = roundCredits(ways.multiplier * this.config.math.payoutScale * bet);
    let bonus: BonusResult | null = null;

    if (coins.length >= this.config.bonus.triggerCoins) {
      bonus = this.playFeature(coins, state.pot, bet, false);
      state.bonusCount += 1;
    }

    state.spinsPlayed += 1;
    return {
      grid,
      coins,
      ways: ways.wins,
      waysMultiplier: ways.multiplier,
      waysWin,
      bonus,
      win: roundCredits(waysWin + (bonus?.payout ?? 0)),
      potBefore,
      potAfter: clonePotState(state.pot),
      purchased: false,
    };
  }

  /** Buy Feature uses a separate, fresh meter; it cannot cash out progress funded by normal play. */
  buyFeature(bet: number, state: GameState): SpinResult {
    this.validateBet(bet);
    const preservedPot = clonePotState(state.pot);
    state.pot = createPotState();
    const grid = emptyGrid();
    const positions = Array.from({ length: this.config.game.reels * this.config.game.rows }, (_, index) => index);
    for (let index = positions.length - 1; index > 0; index -= 1) {
      const swapIndex = this.rng.int(index + 1);
      [positions[index], positions[swapIndex]] = [positions[swapIndex]!, positions[index]!];
    }

    const coins: CoinSymbol[] = [];
    for (const position of positions.slice(0, this.config.bonus.triggerCoins)) {
      const reel = Math.floor(position / this.config.game.rows);
      const row = position % this.config.game.rows;
      const coin = this.makeCoin(reel, row, state.pot);
      grid[reel]![row] = "COIN";
      coins.push(coin);
    }

    const bonus = this.playFeature(coins, state.pot, bet, true);
    state.pot = preservedPot;
    state.spinsPlayed += 1;
    state.bonusCount += 1;
    return {
      grid,
      coins,
      ways: [],
      waysMultiplier: 0,
      waysWin: 0,
      bonus,
      win: bonus.payout,
      potBefore: preservedPot,
      potAfter: clonePotState(preservedPot),
      purchased: true,
    };
  }

  private validateBet(bet: number): void {
    if (!Number.isFinite(bet) || bet <= 0) throw new RangeError("Bet must be a positive finite number");
  }

  private makeGrid(): Grid {
    return this.config.reelStrips.map((strip) => {
      const stop = this.rng.int(strip.length);
      return Array.from({ length: this.config.game.rows }, (_, row) => strip[(stop + row) % strip.length]!);
    });
  }

  private materializeGridCoins(grid: Grid, pot: PotState): CoinSymbol[] {
    const coins: CoinSymbol[] = [];
    for (let reel = 0; reel < grid.length; reel += 1) {
      for (let row = 0; row < (grid[reel]?.length ?? 0); row += 1) {
        if (grid[reel]?.[row] === "COIN") coins.push(this.makeCoin(reel, row, pot));
      }
    }
    return coins;
  }

  private makeCoin(reel: number, row: number, pot: PotState): CoinSymbol {
    const totalWeight = this.config.coinValues.reduce((sum, entry) => sum + entry.weight, 0);
    let pick = this.rng.next() * totalWeight;
    let value = this.config.coinValues[0]?.value ?? 1;
    for (const entry of this.config.coinValues) {
      pick -= entry.weight;
      if (pick < 0) {
        value = entry.value;
        break;
      }
    }

    const upgraded = this.rng.next() < this.config.pot.chanceUpgradeProbability;
    if (upgraded) value += this.config.pot.chanceUpgradeExtra;
    const vesselIndex = this.rng.int(this.config.pot.vessels.length);
    pot.meter += value;
    pot.vesselTotals[vesselIndex] = (pot.vesselTotals[vesselIndex] ?? 0) + value;
    while (
      pot.tierIndex < this.config.pot.levels.length - 1 &&
      pot.meter >= (this.config.pot.meterThresholds[pot.tierIndex + 1] ?? Number.POSITIVE_INFINITY)
    ) {
      pot.tierIndex += 1;
    }

    return { reel, row, value, vesselIndex, upgraded };
  }

  private playFeature(initialCoins: CoinSymbol[], pot: PotState, bet: number, purchased: boolean): BonusResult {
    const locked = new Map<number, CoinSymbol>();
    for (const coin of initialCoins) locked.set(coin.reel * this.config.game.rows + coin.row, { ...coin });
    let respinsLeft = this.config.bonus.startingRespins;
    const rounds: FeatureRound[] = [];

    while (respinsLeft > 0 && locked.size < this.config.game.reels * this.config.game.rows) {
      respinsLeft -= 1;
      const newCoins: CoinSymbol[] = [];
      for (let position = 0; position < this.config.game.reels * this.config.game.rows; position += 1) {
        if (locked.has(position) || this.rng.next() >= this.config.bonus.featureCoinProbability) continue;
        const reel = Math.floor(position / this.config.game.rows);
        const row = position % this.config.game.rows;
        const coin = this.makeCoin(reel, row, pot);
        locked.set(position, coin);
        newCoins.push(coin);
      }

      if (newCoins.length > 0) respinsLeft = this.config.bonus.startingRespins;
      const featureGrid = emptyGrid();
      for (const position of locked.keys()) {
        const reel = Math.floor(position / this.config.game.rows);
        const row = position % this.config.game.rows;
        featureGrid[reel]![row] = "COIN";
      }
      rounds.push({
        grid: featureGrid,
        newCoins: cloneCoins(newCoins),
        coinsLocked: locked.size,
        respinsLeft,
      });
    }

    const coins = [...locked.values()].sort((a, b) => a.reel - b.reel || a.row - b.row);
    const fullGrid = locked.size === this.config.game.reels * this.config.game.rows;
    const awardTierIndex = fullGrid ? this.config.pot.levels.length - 1 : pot.tierIndex;
    const jackpot = this.config.pot.levels[awardTierIndex]!;
    const coinMultiplier = totalCoinValue(coins);
    const jackpotMultiplier = fullGrid ? this.config.bonus.fullGridPayoutMultiplier : jackpot.multiplier;
    const jackpotTier: JackpotId = fullGrid ? "grand" : jackpot.id;
    const jackpotValue = roundCredits(jackpotMultiplier * bet);

    // The collection and the awarded pot are both denominated in bet multipliers.
    const payout = roundCredits((coinMultiplier + jackpotMultiplier) * bet);
    const result: BonusResult = {
      rounds,
      coins,
      coinMultiplier,
      jackpotMultiplier,
      jackpotValue,
      jackpotTier,
      fullGrid,
      payout,
      purchased,
    };

    pot.meter = 0;
    pot.tierIndex = 0;
    pot.vesselTotals = this.config.pot.vessels.map(() => 0);
    return result;
  }
}
