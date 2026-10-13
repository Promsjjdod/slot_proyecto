import { gameConfig } from "../core/engine";
import type { SymbolId } from "../core/types";
import { translate, type Language, type MessageKey } from "./i18n";

export interface UiSettings {
  sound: boolean;
  music: boolean;
  muted: boolean;
  vibration: boolean;
  quality: "high" | "balanced" | "battery";
  language: Language;
  volume: number;
}

export interface HistoryEntry {
  spin: number;
  bet: number;
  win: number;
  bonus: string | null;
  at: number;
}

const PAY_ORDER: SymbolId[] = [
  "DRAGON",
  "PAGODA",
  "MOON_GATE",
  "LOTUS",
  "JADE_KNOT",
  "KOI",
  "LANTERN",
  "WILD",
  "A",
  "K",
  "Q",
  "J",
  "TEN",
];
const SYMBOL_LABELS_EN: Partial<Record<SymbolId, string>> = {
  KOI: "Jade koi",
  LANTERN: "Solar lantern",
  LOTUS: "Moon lotus",
  JADE_KNOT: "Celestial knot",
  DRAGON: "Golden dragon",
  PAGODA: "Dawn pagoda",
  MOON_GATE: "Moon gate",
  WILD: "WILD",
};
const SYMBOL_EMBLEMS: Partial<Record<SymbolId, string>> = {
  DRAGON: "龍",
  PAGODA: "塔",
  MOON_GATE: "◉",
  LOTUS: "✿",
  JADE_KNOT: "∞",
  KOI: "鱗",
  LANTERN: "✧",
  WILD: "W",
  A: "A",
  K: "K",
  Q: "Q",
  J: "J",
  TEN: "10",
};

function paytablePanel(language: Language): string {
  const rows = PAY_ORDER.map((symbol) => {
    const info = gameConfig.symbols[symbol];
    const pay = gameConfig.paytable[symbol];
    if (!info || !pay) return "";
    const amountFormat = new Intl.NumberFormat(language === "es" ? "es-AR" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const amounts = [3, 4, 5].map((reels) =>
      amountFormat.format((pay[String(reels)] ?? 0) * gameConfig.math.payoutScale),
    );
    const label = language === "en" ? (SYMBOL_LABELS_EN[symbol] ?? info.label) : info.label;
    return `<div class="paytable-row"><span class="pay-symbol"><span class="pay-gem" style="color:${info.color}">${SYMBOL_EMBLEMS[symbol] ?? label}</span>${label}</span><strong>${amounts[0]}×</strong><strong>${amounts[1]}×</strong><strong>${amounts[2]}×</strong></div>`;
  }).join("");
  const reels = translate(language, "reelsShort");
  return `<div class="paytable-list"><div class="paytable-row paytable-header"><span>${translate(language, "wins")}</span><span>3 ${reels}</span><span>4 ${reels}</span><span>5 ${reels}</span></div>${rows}</div>
    <p class="panel-footnote">${translate(language, "paytableFootnote")}</p>`;
}

function rulesPanel(language: Language): string {
  const rows: [string, MessageKey][] = [
    ["✧", "ways"],
    ["◈", "wildDesc"],
    ["◉", "bonusDesc"],
    ["♨", "potDesc"],
    ["✦", "buyDesc"],
    ["◎", "responsible"],
  ];
  return `<ul class="rule-list">${rows.map(([icon, key]) => `<li><span class="rule-icon" aria-hidden="true">${icon}</span><span>${translate(language, key)}</span></li>`).join("")}</ul>`;
}

function historyPanel(language: Language, history: HistoryEntry[], formatCredits: (value: number) => string): string {
  if (history.length === 0) return `<p>${translate(language, "noHistory")}</p>`;
  return `<div class="history-list">${history
    .slice(0, 12)
    .map((entry) => {
      const time = new Date(entry.at).toLocaleTimeString(language === "es" ? "es-AR" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const note = entry.bonus ? ` · ${entry.bonus}` : "";
      return `<div class="history-row"><span>#${entry.spin} · ${time}<small>${translate(language, "bet")} ${formatCredits(entry.bet)}${note}</small></span><strong>${formatCredits(entry.win)}</strong></div>`;
    })
    .join("")}</div>`;
}

function switchControl(
  language: Language,
  name: keyof Pick<UiSettings, "sound" | "music" | "vibration">,
  on: boolean,
): string {
  return `<button class="switch" type="button" role="switch" data-setting="${name}" aria-checked="${on}" aria-label="${translate(language, name)}"></button>`;
}

function settingsPanel(language: Language, settings: UiSettings): string {
  const qualityLabels = {
    high: translate(language, "qualityHigh"),
    balanced: translate(language, "qualityBalanced"),
    battery: translate(language, "qualityBattery"),
  };
  return `<div class="settings-list">
    <div class="setting-row"><span>${translate(language, "sound")}</span>${switchControl(language, "sound", settings.sound)}</div>
    <div class="setting-row"><span>${translate(language, "music")}</span>${switchControl(language, "music", settings.music)}</div>
    <div class="setting-row"><span>${translate(language, "vibration")}</span>${switchControl(language, "vibration", settings.vibration)}</div>
    <div class="setting-row"><label for="quality-select">${translate(language, "quality")}</label><select id="quality-select" data-setting-select="quality"><option value="high" ${settings.quality === "high" ? "selected" : ""}>${qualityLabels.high}</option><option value="balanced" ${settings.quality === "balanced" ? "selected" : ""}>${qualityLabels.balanced}</option><option value="battery" ${settings.quality === "battery" ? "selected" : ""}>${qualityLabels.battery}</option></select></div>
    <div class="setting-row"><label for="language-select">${translate(language, "language")}</label><select id="language-select" data-setting-select="language"><option value="es" ${language === "es" ? "selected" : ""}>Español</option><option value="en" ${language === "en" ? "selected" : ""}>English</option></select></div>
    <div class="setting-row"><label for="volume-select">${translate(language, "volume")}</label><input id="volume-select" data-setting-select="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}" aria-label="${translate(language, "volume")}" /></div>
    <button class="reset-button" type="button" data-action="reset-balance">${translate(language, "resetBalance")}</button>
  </div>`;
}

export function renderDialogPanel(
  panel: "paytable" | "rules" | "history" | "settings",
  language: Language,
  settings: UiSettings,
  history: HistoryEntry[],
  formatCredits: (value: number) => string,
): string {
  switch (panel) {
    case "paytable":
      return paytablePanel(language);
    case "rules":
      return rulesPanel(language);
    case "history":
      return historyPanel(language, history, formatCredits);
    case "settings":
      return settingsPanel(language, settings);
  }
}
