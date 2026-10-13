import { Application } from "pixi.js";
import { gsap } from "gsap";
import { createGameState } from "../core/state";
import { gameConfig, SlotEngine } from "../core/engine";
import type { BonusResult, CoinSymbol, Grid, JackpotId, PotState, SpinResult } from "../core/types";
import { AudioManager } from "../audio/audio-manager";
import { SlotBoardView } from "../game/slot-board";
import { renderDialogPanel, type HistoryEntry, type UiSettings } from "./dialog-panels";
import { mountGameShell } from "./game-shell";
import { formatMessage, translate, type Language, type MessageKey } from "./i18n";

const SETTINGS_KEY = "bruma-de-jade-settings-v1";
const BALANCE_KEY = "bruma-de-jade-demo-balance-v1";
const HISTORY_KEY = "bruma-de-jade-history-v1";
const SPEEDS: Record<Language, readonly string[]> = {
  es: ["Normal", "Rápida", "Turbo"],
  en: ["Normal", "Fast", "Turbo"],
};
const GUARDIAN_TITLE_KEYS: Record<JackpotId, MessageKey> = {
  mini: "guardianNeri",
  minor: "guardianTovo",
  major: "guardianYuna",
  grand: "guardianAureo",
};
const INITIAL_GRID: Grid = [
  ["LOTUS", "K", "BONUS"],
  ["J", "DRAGON", "Q"],
  ["WILD", "TEN", "PAGODA"],
  ["COIN", "A", "KOI"],
  ["LANTERN", "MOON_GATE", "JADE_KNOT"],
];

function randomSeed(): number {
  const seed = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(seed);
  else seed[0] = Math.floor(Math.random() * 0xffffffff);
  return seed[0] ?? gameConfig.math.defaultSeed;
}

function readSettings(): UiSettings {
  const defaults: UiSettings = {
    sound: true,
    music: true,
    muted: false,
    vibration: true,
    quality: "high",
    language: "es",
    volume: 0.72,
  };
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored) as Partial<UiSettings>;
    return {
      ...defaults,
      ...parsed,
      sound: typeof parsed.sound === "boolean" ? parsed.sound : defaults.sound,
      music: typeof parsed.music === "boolean" ? parsed.music : defaults.music,
      muted: typeof parsed.muted === "boolean" ? parsed.muted : defaults.muted,
      vibration: typeof parsed.vibration === "boolean" ? parsed.vibration : defaults.vibration,
      quality: parsed.quality === "balanced" || parsed.quality === "battery" ? parsed.quality : "high",
      language: parsed.language === "en" ? "en" : "es",
      volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : defaults.volume,
    };
  } catch {
    return defaults;
  }
}

function readBalance(): number {
  try {
    const stored = localStorage.getItem(BALANCE_KEY);
    if (stored === null) return gameConfig.ui.startingBalance;
    const saved = Number(stored);
    return Number.isFinite(saved) && saved >= 0 ? saved : gameConfig.ui.startingBalance;
  } catch {
    return gameConfig.ui.startingBalance;
  }
}

function readHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? (JSON.parse(stored) as HistoryEntry[]).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function formatCredits(value: number, language: Language): string {
  return new Intl.NumberFormat(language === "es" ? "es-AR" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function emptyFeatureGrid(): Grid {
  return Array.from({ length: gameConfig.game.reels }, () => Array(3).fill("EMPTY")) as Grid;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function mountGame(host: HTMLElement): Promise<void> {
  mountGameShell(host);
  const root = host.querySelector<HTMLElement>(".game-shell");
  if (!root) throw new Error("Game shell was not mounted");

  const find = <T extends HTMLElement>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing game UI element: ${selector}`);
    return element;
  };

  const settings = readSettings();
  const audio = new AudioManager(settings);
  const state = createGameState();
  const engine = new SlotEngine(randomSeed());
  const history = readHistory();
  let balance = readBalance();
  let betIndex = Math.max(0, gameConfig.ui.betOptions.indexOf(gameConfig.ui.defaultBet));
  let bet = gameConfig.ui.betOptions[betIndex] ?? gameConfig.ui.defaultBet;
  let speedIndex = 0;
  let spinBusy = false;
  let autoplayOn = false;
  let autoplayTimer = 0;
  let pointerHeld = false;
  let holdTurbo = false;
  let skipClickAfterHold = false;
  let holdTimer = 0;
  let toastTimer = 0;
  let currentDialogPanel: "paytable" | "rules" | "history" | "settings" = "paytable";
  let pendingBuy = false;

  const stageHost = find<HTMLElement>("#pixi-stage");
  const loadingScreen = find<HTMLElement>("#loading-screen");
  const languageToggle = find<HTMLButtonElement>("#language-toggle");
  const balanceValue = find<HTMLElement>("#balance-value");
  const betValue = find<HTMLElement>("#bet-value");
  const featureCostLabel = find<HTMLElement>("#feature-cost-label");
  const gameMessage = find<HTMLElement>("#game-message");
  const winCopy = find<HTMLElement>("#win-copy");
  const winAmount = find<HTMLElement>("#win-amount");
  const potLevelLabel = find<HTMLElement>("#pot-level-label");
  const potProgressFill = find<HTMLElement>("#pot-progress-fill");
  const potProgressTrack = find<HTMLElement>(".pot-progress-track");
  const potProgressCaption = find<HTMLElement>("#pot-progress-caption");
  const mainDialog = find<HTMLDialogElement>("#main-dialog");
  const dialogBody = find<HTMLElement>("#dialog-body");
  const dialogTitle = find<HTMLElement>("#dialog-title");
  const buyDialog = find<HTMLDialogElement>("#buy-dialog");
  const buyConfirmCopy = find<HTMLElement>("#buy-confirm-copy");
  const buyButton = find<HTMLButtonElement>("#buy-feature-button");
  const spinButton = find<HTMLButtonElement>("#spin-button");
  const autoplayButton = find<HTMLButtonElement>("#autoplay-button");
  const speedButton = find<HTMLButtonElement>("#speed-button");
  const shellBg = `${import.meta.env.BASE_URL}assets/img/jade-mist-mountain-background.webp`;
  root.style.setProperty("--mountain-bg", `url("${shellBg}")`);
  root.dataset.quality = settings.quality;

  const bigWinOverlay = document.createElement("div");
  bigWinOverlay.className = "big-win-overlay";
  bigWinOverlay.innerHTML = '<span class="big-win-title"></span><span class="big-win-count"></span>';
  find<HTMLElement>(".board-shell").appendChild(bigWinOverlay);

  const pixi = new Application();
  const deviceScale = window.devicePixelRatio || 1;
  const renderScale =
    settings.quality === "high"
      ? Math.min(deviceScale, 2)
      : settings.quality === "balanced"
        ? Math.min(deviceScale, 1.5)
        : 1;
  await pixi.init({
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: renderScale,
    resizeTo: stageHost,
    powerPreference: "high-performance",
  });
  pixi.canvas.setAttribute("aria-hidden", "true");
  pixi.canvas.style.pointerEvents = "none";
  stageHost.appendChild(pixi.canvas);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || settings.quality === "battery";
  const board = new SlotBoardView(pixi, stageHost, INITIAL_GRID, reducedMotion);

  const persistSettings = (): void => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* Private browsing may disable storage. */
    }
  };
  const persistBalance = (): void => {
    try {
      localStorage.setItem(BALANCE_KEY, String(balance));
    } catch {
      /* The demo still works without persistence. */
    }
  };
  const updateBalance = (): void => {
    balanceValue.textContent = formatCredits(balance, settings.language);
    persistBalance();
    updateButtons();
    gsap.fromTo(
      balanceValue,
      { scale: 1.06, color: "#fff6c4" },
      { scale: 1, color: "#fff2c8", duration: 0.35, ease: "back.out(2)" },
    );
  };
  const updateBet = (): void => {
    betValue.textContent = formatCredits(bet, settings.language);
    featureCostLabel.textContent = `${gameConfig.bonus.buyCostBetMultiplier}× ${translate(settings.language, "bet")}`;
    updateButtons();
  };
  const updateButtons = (): void => {
    const cost = bet * gameConfig.bonus.buyCostBetMultiplier;
    spinButton.disabled = spinBusy || balance < bet;
    buyButton.disabled = spinBusy || balance < cost;
    for (const selector of ["#bet-down", "#bet-up", "#speed-button", "#menu-button"]) {
      const button = root.querySelector<HTMLButtonElement>(selector);
      if (button) button.disabled = spinBusy;
    }
  };
  const saveHistory = (): void => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
    } catch {
      /* History is optional. */
    }
  };
  const setMessage = (value: MessageKey | string, isKey = true): void => {
    if (isKey) {
      const key = value as MessageKey;
      gameMessage.dataset.i18n = key;
      gameMessage.textContent = translate(settings.language, key);
    } else {
      delete gameMessage.dataset.i18n;
      gameMessage.textContent = value;
    }
  };
  const showToast = (message: string): void => {
    const toast = find<HTMLElement>("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2300);
  };
  const clearWinLabel = (): void => {
    winAmount.hidden = true;
    winCopy.hidden = false;
  };

  const updatePotUI = (pot: PotState): void => {
    const levelIndex = Math.max(0, Math.min(gameConfig.pot.levels.length - 1, pot.tierIndex));
    const level = gameConfig.pot.levels[levelIndex]!;
    const previousThreshold = gameConfig.pot.meterThresholds[levelIndex] ?? 0;
    const nextThreshold = gameConfig.pot.meterThresholds[levelIndex + 1];
    const ratio =
      nextThreshold === undefined
        ? 1
        : Math.max(0, Math.min(1, (pot.meter - previousThreshold) / Math.max(1, nextThreshold - previousThreshold)));
    potLevelLabel.textContent = `${level.label} ×${level.multiplier.toLocaleString(settings.language === "es" ? "es-AR" : "en-US")}`;
    potProgressFill.style.width = `${Math.max(0.025, ratio * 100)}%`;
    potProgressTrack.setAttribute("aria-valuenow", String(Math.round(pot.meter)));
    potProgressTrack.setAttribute("aria-valuemax", String(nextThreshold ?? previousThreshold));
    potProgressCaption.textContent =
      nextThreshold === undefined ? `${Math.floor(pot.meter)} / GRAND` : `${Math.floor(pot.meter)} / ${nextThreshold}`;
    for (let index = 0; index < gameConfig.pot.vessels.length; index += 1) {
      const vesselValue = root.querySelector<HTMLElement>(`[data-vessel-value="${index}"]`);
      if (vesselValue) vesselValue.textContent = `×${formatCredits(pot.vesselTotals[index] ?? 0, settings.language)}`;
    }
  };

  const estimatedPot = (before: PotState, coins: CoinSymbol[]): PotState => {
    const next: PotState = { meter: before.meter, tierIndex: before.tierIndex, vesselTotals: [...before.vesselTotals] };
    for (const coin of coins) {
      next.meter += coin.value;
      next.vesselTotals[coin.vesselIndex] = (next.vesselTotals[coin.vesselIndex] ?? 0) + coin.value;
    }
    while (
      next.tierIndex < gameConfig.pot.levels.length - 1 &&
      next.meter >= (gameConfig.pot.meterThresholds[next.tierIndex + 1] ?? Number.POSITIVE_INFINITY)
    )
      next.tierIndex += 1;
    return next;
  };

  const clearVesselGlow = (): void => {
    for (const vessel of root.querySelectorAll<HTMLElement>(".pot-vessel")) vessel.classList.remove("is-active");
  };
  const activateVessels = (coins: CoinSymbol[]): void => {
    clearVesselGlow();
    const touched = new Set(coins.map((coin) => coin.vesselIndex));
    for (const index of touched) {
      const vessel = root.querySelector<HTMLElement>(`[data-vessel="${index}"]`);
      if (!vessel) continue;
      vessel.classList.add("is-active");
      if (settings.vibration && "vibrate" in navigator) navigator.vibrate(16);
      window.setTimeout(() => vessel.classList.remove("is-active"), 900);
    }
  };

  const lightJackpot = (tier: JackpotId): void => {
    const card = root.querySelector<HTMLElement>(`[data-jackpot="${tier}"]`);
    if (!card) return;
    card.classList.remove("is-lit");
    void card.offsetWidth;
    card.classList.add("is-lit");
    window.setTimeout(() => card.classList.remove("is-lit"), 2100);
  };

  const applyLanguage = (): void => {
    document.documentElement.lang = settings.language;
    languageToggle.textContent = settings.language.toUpperCase();
    for (const element of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
      const key = element.dataset.i18n as MessageKey;
      element.textContent = translate(settings.language, key);
    }
    for (const element of root.querySelectorAll<HTMLElement>("[data-i18n-aria]")) {
      const key = element.dataset.i18nAria as MessageKey;
      element.setAttribute("aria-label", translate(settings.language, key));
    }
    for (const card of root.querySelectorAll<HTMLElement>("[data-jackpot]")) {
      const tier = card.dataset.jackpot as JackpotId;
      const level = gameConfig.pot.levels.find((entry) => entry.id === tier);
      if (!level) continue;
      card.setAttribute("aria-label", `${level.label}: ${level.multiplier}× ${translate(settings.language, "bet")}`);
      card.title = translate(settings.language, GUARDIAN_TITLE_KEYS[tier]);
    }
    dialogTitle.textContent = translate(settings.language, "menuTitle");
    const soundButton = find<HTMLButtonElement>("#sound-toggle");
    soundButton.classList.toggle("sound-muted", settings.muted);
    const soundLabel = settings.muted
      ? translate(settings.language, "soundsOff")
      : translate(settings.language, "soundsOn");
    soundButton.setAttribute("aria-label", soundLabel);
    soundButton.title = soundLabel;
    featureCostLabel.textContent = `${gameConfig.bonus.buyCostBetMultiplier}× ${translate(settings.language, "bet")}`;
    updateBalance();
    updateBet();
    updatePotUI(state.pot);
    if (mainDialog.open) renderCurrentDialog();
  };

  const renderCurrentDialog = (): void => {
    dialogTitle.textContent = translate(settings.language, "menuTitle");
    dialogBody.innerHTML = renderDialogPanel(currentDialogPanel, settings.language, settings, history, (value) =>
      formatCredits(value, settings.language),
    );
    for (const tab of root.querySelectorAll<HTMLElement>(".dialog-tab"))
      tab.classList.toggle("is-active", tab.dataset.panel === currentDialogPanel);
  };

  const updateSpeedButton = (): void => {
    const label = speedButton.querySelector<HTMLElement>("[data-i18n]");
    const speedName = SPEEDS[settings.language][speedIndex] ?? "Normal";
    if (label) label.textContent = `${translate(settings.language, "speed")}: ${speedName}`;
    speedButton.setAttribute("aria-label", `${translate(settings.language, "speed")}: ${speedName}`);
  };

  const updateAutoplayButton = (): void => {
    autoplayButton.classList.toggle("is-active", autoplayOn);
    autoplayButton.setAttribute(
      "aria-label",
      autoplayOn ? translate(settings.language, "autoplayStop") : translate(settings.language, "autoplayStart"),
    );
    const label = autoplayButton.querySelector<HTMLElement>("[data-i18n]");
    if (label)
      label.textContent = autoplayOn
        ? translate(settings.language, "autoplayStop")
        : translate(settings.language, "autoplayStart");
  };

  const showWinOverlay = async (amount: number, multiplier: number, bonus: BonusResult | null): Promise<void> => {
    if (amount <= 0 || (multiplier < 20 && !bonus)) return;
    const title = bigWinOverlay.querySelector<HTMLElement>(".big-win-title");
    const counter = bigWinOverlay.querySelector<HTMLElement>(".big-win-count");
    if (!title || !counter) return;
    if (bonus?.jackpotTier === "grand")
      title.textContent = settings.language === "es" ? "¡GRAND JACKPOT!" : "GRAND JACKPOT";
    else if (multiplier >= 100) title.textContent = settings.language === "es" ? "¡PREMIO ÉPICO!" : "EPIC WIN";
    else if (multiplier >= 50) title.textContent = settings.language === "es" ? "¡MEGA PREMIO!" : "MEGA WIN";
    else title.textContent = settings.language === "es" ? "¡GRAN PREMIO!" : "BIG WIN";
    counter.textContent = formatCredits(0, settings.language);
    bigWinOverlay.classList.remove("is-fading");
    bigWinOverlay.classList.add("is-visible");
    audio.duckMusic(true);
    const progress = { value: 0 };
    gsap.to(progress, {
      value: amount,
      duration: settings.quality === "battery" ? 0.5 : 1.2,
      ease: "power2.out",
      onUpdate: () => {
        counter.textContent = formatCredits(progress.value, settings.language);
      },
    });
    await sleep(1600);
    bigWinOverlay.classList.remove("is-visible");
    bigWinOverlay.classList.add("is-fading");
    audio.duckMusic(false);
    await sleep(400);
    bigWinOverlay.classList.remove("is-fading");
  };

  const updatePotAfterSpin = (result: SpinResult): void => {
    if (result.purchased) {
      updatePotUI(result.potBefore);
      return;
    }
    const potForPreview = estimatedPot(result.potBefore, result.coins);
    if (result.bonus) updatePotUI(potForPreview);
    else updatePotUI(result.potAfter);
    if (potForPreview.tierIndex > result.potBefore.tierIndex) {
      audio.play("pot-up");
      const tier = gameConfig.pot.levels[potForPreview.tierIndex];
      if (tier) lightJackpot(tier.id);
      const vessel = root.querySelector<HTMLElement>(`[data-vessel="${result.coins.at(-1)?.vesselIndex ?? 0}"]`);
      vessel?.classList.add("is-level-up");
      window.setTimeout(() => vessel?.classList.remove("is-level-up"), 700);
    }
  };

  const showBonus = async (result: SpinResult, bonus: BonusResult, turbo: boolean): Promise<void> => {
    audio.enterFeature();
    audio.play("bonus");
    setMessage(settings.language === "es" ? "¡HOLD & SPIN!" : "HOLD & SPIN", false);
    lightJackpot(bonus.jackpotTier);
    const initialGrid = emptyFeatureGrid();
    for (const coin of result.coins) initialGrid[coin.reel]![coin.row] = "COIN";
    board.showFeatureRound(initialGrid, result.coins);
    await sleep(turbo ? 100 : 280);

    for (const round of bonus.rounds) {
      const locked = bonus.coins.filter((coin) => round.grid[coin.reel]?.[coin.row] === "COIN");
      board.showFeatureRound(round.grid, locked);
      if (round.newCoins.length > 0) {
        audio.play("coin");
        activateVessels(round.newCoins);
        if (settings.vibration && "vibrate" in navigator) navigator.vibrate(12);
      } else {
        audio.play("reel-stop");
      }
      const label = settings.language === "es" ? "RESPINS" : "RESPINS";
      setMessage(`${label} · ${round.respinsLeft}`, false);
      await sleep(turbo ? 105 : speedIndex === 0 ? 390 : 235);
    }

    if (bonus.rounds.length > 0) {
      const finalRound = bonus.rounds[bonus.rounds.length - 1]!;
      board.showFeatureRound(finalRound.grid, bonus.coins, true);
    }
    audio.exitFeature();
    updatePotUI(result.potAfter);
    lightJackpot(bonus.jackpotTier);
    const message = settings.language === "es" ? "BONUS COMPLETADO" : "FEATURE COMPLETE";
    setMessage(message, false);
    await sleep(turbo ? 100 : 280);
  };

  const runSpin = async (turbo = false, purchased = false): Promise<void> => {
    if (spinBusy) return;
    const debit = purchased ? bet * gameConfig.bonus.buyCostBetMultiplier : bet;
    const balanceBeforeSpin = balance;
    if (balance < debit) {
      showToast(translate(settings.language, "noCredits"));
      autoplayOn = false;
      updateAutoplayButton();
      updateButtons();
      return;
    }

    spinBusy = true;
    clearWinLabel();
    updateButtons();
    if (purchased) {
      balance -= debit;
      pendingBuy = false;
      if (buyDialog.open) buyDialog.close();
    } else {
      balance -= bet;
    }
    updateBalance();
    setMessage(settings.language === "es" ? "¡BUENA SUERTE!" : "GOOD LUCK!", false);
    const speedDuration = turbo ? 260 : speedIndex === 0 ? 790 : speedIndex === 1 ? 500 : 260;

    try {
      await audio.unlock();
      audio.play(purchased ? "bonus" : "spin");
      const result = purchased ? engine.buyFeature(bet, state) : engine.spin(bet, state);
      if (!result.bonus && result.coins.length >= 4) audio.play("anticipation");
      await board.animateSpin(result, speedDuration, () => audio.play("reel-stop"));
      updatePotAfterSpin(result);

      if (result.coins.length > 0 && !purchased) {
        audio.play("coin");
        activateVessels(result.coins);
        await board.flyCoins(result.coins, turbo);
      }

      if (result.bonus) await showBonus(result, result.bonus, turbo);
      else updatePotUI(result.potAfter);
      if (result.bonus) board.burstCenter(0xffdf83, result.bonus.fullGrid ? 68 : 38);

      if (result.waysWin > 0) audio.play("win");
      if (result.bonus?.jackpotTier === "grand") audio.play("jackpot");
      const winMultiplier = result.win / bet;
      const bonusNote = result.bonus ? result.bonus.jackpotTier.toUpperCase() : null;
      const spinNumber = Math.max(state.spinsPlayed, (history[0]?.spin ?? 0) + 1);
      history.unshift({ spin: spinNumber, bet, win: result.win, bonus: bonusNote, at: Date.now() });
      history.splice(12);
      saveHistory();
      if (result.win > 0) {
        balance += result.win;
        winCopy.hidden = true;
        winAmount.hidden = false;
        winAmount.textContent = `+${formatCredits(result.win, settings.language)} ${settings.language === "es" ? "CRÉDITOS" : "CREDITS"}`;
        setMessage(
          result.bonus
            ? settings.language === "es"
              ? "¡PREMIO DEL POT!"
              : "POT WIN!"
            : settings.language === "es"
              ? "¡PREMIO!"
              : "WIN!",
          false,
        );
        if (settings.vibration && "vibrate" in navigator) navigator.vibrate(result.bonus ? [30, 35, 70] : 22);
        updateBalance();
        await showWinOverlay(result.win, winMultiplier, result.bonus);
      } else {
        setMessage(settings.language === "es" ? "SIGUE LA BRUMA…" : "THE MIST ROLLS ON…", false);
        updateBalance();
      }
    } catch (error) {
      console.error("Spin failed", error);
      balance = balanceBeforeSpin;
      updateBalance();
      setMessage(settings.language === "es" ? "INTÉNTALO DE NUEVO" : "PLEASE TRY AGAIN", false);
      showToast(settings.language === "es" ? "No se pudo completar el giro." : "The spin could not be completed.");
    } finally {
      spinBusy = false;
      updateButtons();
      if (holdTurbo && pointerHeld) {
        window.setTimeout(() => void runSpin(true), 60);
      }
    }
  };

  const startAutoplay = (): void => {
    if (autoplayOn) return;
    autoplayOn = true;
    updateAutoplayButton();
    const runNext = (): void => {
      if (!autoplayOn || spinBusy) return;
      if (balance < bet) {
        autoplayOn = false;
        updateAutoplayButton();
        showToast(translate(settings.language, "noCredits"));
        return;
      }
      void runSpin(speedIndex === 2).then(() => {
        if (autoplayOn) autoplayTimer = window.setTimeout(runNext, speedIndex === 2 ? 90 : 260);
      });
    };
    runNext();
  };

  const stopAutoplay = (): void => {
    autoplayOn = false;
    window.clearTimeout(autoplayTimer);
    updateAutoplayButton();
  };

  const openMainDialog = (panel: typeof currentDialogPanel = "paytable"): void => {
    if (autoplayOn) stopAutoplay();
    currentDialogPanel = panel;
    renderCurrentDialog();
    if (!mainDialog.open) mainDialog.showModal();
  };

  const requestBuyFeature = async (): Promise<void> => {
    if (spinBusy) return;
    const cost = bet * gameConfig.bonus.buyCostBetMultiplier;
    if (balance < cost) {
      showToast(translate(settings.language, "noCredits"));
      return;
    }
    pendingBuy = true;
    buyConfirmCopy.textContent = formatMessage(settings.language, "confirmBuyText", {
      cost: formatCredits(cost, settings.language),
      multiplier: gameConfig.bonus.buyCostBetMultiplier,
    });
    if (!buyDialog.open) buyDialog.showModal();
  };

  const resetDemoBalance = (): void => {
    balance = gameConfig.ui.startingBalance;
    updateBalance();
    showToast(translate(settings.language, "balanceReset"));
  };

  const updateLocalization = (): void => {
    applyLanguage();
    updateSpeedButton();
    updateAutoplayButton();
    if (buyDialog.open) {
      buyConfirmCopy.textContent = formatMessage(settings.language, "confirmBuyText", {
        cost: formatCredits(bet * gameConfig.bonus.buyCostBetMultiplier, settings.language),
        multiplier: gameConfig.bonus.buyCostBetMultiplier,
      });
    }
    persistSettings();
  };

  updatePotUI(state.pot);
  updateBalance();
  updateBet();
  updateLocalization();

  find<HTMLButtonElement>("#bet-down").addEventListener("click", () => {
    if (spinBusy) return;
    betIndex = Math.max(0, betIndex - 1);
    bet = gameConfig.ui.betOptions[betIndex] ?? bet;
    audio.play("click");
    updateBet();
  });
  find<HTMLButtonElement>("#bet-up").addEventListener("click", () => {
    if (spinBusy) return;
    betIndex = Math.min(gameConfig.ui.betOptions.length - 1, betIndex + 1);
    bet = gameConfig.ui.betOptions[betIndex] ?? bet;
    audio.play("click");
    updateBet();
  });

  spinButton.addEventListener("pointerdown", () => {
    pointerHeld = true;
    window.clearTimeout(holdTimer);
    holdTimer = window.setTimeout(() => {
      if (!pointerHeld) return;
      holdTurbo = true;
      skipClickAfterHold = true;
      spinButton.classList.add("is-pressed", "is-spinning");
      if (!spinBusy) void runSpin(true);
    }, 320);
  });
  const releaseSpinPointer = (): void => {
    pointerHeld = false;
    window.clearTimeout(holdTimer);
    spinButton.classList.remove("is-pressed");
    if (holdTurbo) {
      holdTurbo = false;
      window.setTimeout(() => spinButton.classList.remove("is-spinning"), 250);
    }
  };
  window.addEventListener("pointerup", releaseSpinPointer);
  window.addEventListener("pointercancel", releaseSpinPointer);
  spinButton.addEventListener("pointerleave", () => {
    if (pointerHeld && holdTurbo) releaseSpinPointer();
  });
  spinButton.addEventListener("click", () => {
    if (skipClickAfterHold) {
      skipClickAfterHold = false;
      return;
    }
    if (autoplayOn) stopAutoplay();
    void runSpin(speedIndex === 2);
  });

  speedButton.addEventListener("click", () => {
    speedIndex = (speedIndex + 1) % SPEEDS[settings.language].length;
    updateSpeedButton();
    audio.play("click");
    showToast(`${translate(settings.language, "speed")}: ${SPEEDS[settings.language][speedIndex]}`);
  });
  autoplayButton.addEventListener("click", () => {
    audio.play("click");
    if (autoplayOn) stopAutoplay();
    else startAutoplay();
  });
  buyButton.addEventListener("click", () => {
    audio.play("click");
    void requestBuyFeature();
  });
  find<HTMLButtonElement>("#buy-cancel").addEventListener("click", () => {
    pendingBuy = false;
    buyDialog.close();
  });
  find<HTMLButtonElement>("#buy-confirm").addEventListener("click", () => {
    if (!pendingBuy) return;
    audio.play("click");
    void runSpin(false, true);
  });

  find<HTMLButtonElement>("#menu-button").addEventListener("click", () => {
    audio.play("click");
    openMainDialog();
  });
  find<HTMLButtonElement>("#sound-toggle").addEventListener("click", () => {
    settings.muted = !settings.muted;
    audio.setMuted(settings.muted);
    applyLanguage();
    persistSettings();
  });
  languageToggle.addEventListener("click", () => {
    settings.language = settings.language === "es" ? "en" : "es";
    updateLocalization();
  });

  for (const closeButton of root.querySelectorAll<HTMLButtonElement>(".dialog-close")) {
    closeButton.addEventListener("click", () => {
      mainDialog.close();
      buyDialog.close();
      pendingBuy = false;
    });
  }
  for (const dialog of [mainDialog, buyDialog]) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  for (const tab of root.querySelectorAll<HTMLButtonElement>(".dialog-tab")) {
    tab.addEventListener("click", () => {
      const panel = tab.dataset.panel;
      if (panel === "paytable" || panel === "rules" || panel === "history" || panel === "settings") {
        currentDialogPanel = panel;
        renderCurrentDialog();
      }
    });
  }

  dialogBody.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const control = target.closest<HTMLButtonElement>("[data-setting], [data-action]");
    if (!control) return;
    const setting = control.dataset.setting;
    if (setting === "sound" || setting === "music" || setting === "vibration") {
      settings[setting] = !settings[setting];
      if (setting === "sound") audio.setSoundEnabled(settings.sound);
      if (setting === "music") audio.setMusicEnabled(settings.music);
      persistSettings();
      renderCurrentDialog();
      applyLanguage();
      return;
    }
    if (control.dataset.action === "reset-balance") resetDemoBalance();
  });

  dialogBody.addEventListener("change", (event) => {
    const target = event.target as HTMLSelectElement | HTMLInputElement;
    const setting = target.dataset.settingSelect;
    if (
      setting === "quality" &&
      (target.value === "high" || target.value === "balanced" || target.value === "battery")
    ) {
      settings.quality = target.value;
      root.dataset.quality = settings.quality;
      persistSettings();
    }
    if (setting === "language" && (target.value === "es" || target.value === "en")) {
      settings.language = target.value;
      updateLocalization();
    }
    if (setting === "volume") {
      settings.volume = Number(target.value);
      audio.setVolume(settings.volume);
      persistSettings();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !mainDialog.open && !buyDialog.open && document.activeElement === document.body) {
      event.preventDefault();
      void runSpin(speedIndex === 2);
    }
    if (event.key === "Escape") {
      pendingBuy = false;
    }
  });

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      void navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .catch((error: unknown) => console.warn("PWA offline cache unavailable:", error));
    });
  }

  // A concise initial cue also gives the first frame a small sense of life.
  gsap.fromTo(
    root.querySelector(".brand-emblem"),
    { rotation: 52, scale: 0.86 },
    { rotation: 45, scale: 1, duration: 0.85, ease: "elastic.out(1,0.55)" },
  );
  updateButtons();
  window.setTimeout(() => loadingScreen.classList.add("is-hidden"), 450);

  window.addEventListener(
    "beforeunload",
    () => {
      stopAutoplay();
      board.destroy();
      pixi.destroy(true, { children: true, texture: false, textureSource: false });
      audio.dispose();
    },
    { once: true },
  );
}
