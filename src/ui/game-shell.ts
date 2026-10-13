import { gameConfig } from "../core/engine";

const guardians = {
  mini: {
    name: "Neri · mensajera de la niebla",
    shape:
      '<path d="M5 27c1-12 7-18 15-18 7 0 13 6 14 18l-6-5-3-8-5 5-7-4-2 7z" fill="#60d6b4"/><ellipse cx="20" cy="22" rx="8" ry="9" fill="#f0be91"/><path d="M11 31c2-5 5-7 9-7s8 2 10 7" fill="#7de0bd"/><circle cx="17" cy="22" r="1" fill="#273d37"/><circle cx="23" cy="22" r="1" fill="#273d37"/>',
  },
  minor: {
    name: "Tovo · guardián del loto",
    shape:
      '<path d="M4 21 9 7l8 8 3-12 5 12 8-8 4 14-6 5H10z" fill="#8e7be8"/><ellipse cx="20" cy="22" rx="8" ry="9" fill="#ecc397"/><path d="M10 33c2-5 5-7 10-7s8 2 10 7" fill="#5acba9"/><path d="M16 22h2m4 0h2" stroke="#243b39" stroke-width="1.4"/>',
  },
  major: {
    name: "Yuna · tejedora de brasa",
    shape:
      '<path d="M6 27 9 12 5 7l11 4 4-9 5 9 11-5-4 13 2 9-7-5-6-7-8 9z" fill="#ff895f"/><ellipse cx="20" cy="22" rx="8" ry="9" fill="#efbd94"/><path d="M10 33c2-5 5-7 10-7s8 2 10 7" fill="#c85050"/><circle cx="17" cy="22" r="1" fill="#4b302a"/><circle cx="23" cy="22" r="1" fill="#4b302a"/>',
  },
  grand: {
    name: "Aúreo · dragón astral",
    shape:
      '<path d="M5 13 1 4l12 6 7-8 6 8 13-6-5 15-5 12-9 4-10-5-7-12z" fill="#f4ca68"/><path d="M12 16 7 12m21 4 5-4" stroke="#fff0bb" stroke-width="2"/><ellipse cx="20" cy="22" rx="7" ry="6" fill="#d58d47"/><circle cx="17" cy="21" r="1.4" fill="#4e3426"/><circle cx="23" cy="21" r="1.4" fill="#4e3426"/><path d="m15 27 5 3 5-3" fill="none" stroke="#7e3e36" stroke-width="1.5"/>',
  },
};

function jackpotCard(level: (typeof gameConfig.pot.levels)[number]): string {
  const guardian = guardians[level.id];
  return `<article class="jackpot-card jackpot-${level.id}" data-jackpot="${level.id}" style="--jackpot-color:${level.color}" aria-label="${level.label}, ${level.multiplier} veces la apuesta" title="${guardian.name}">
    <span class="jackpot-orbit" aria-hidden="true"></span>
    <span class="jackpot-avatar" aria-hidden="true"><svg viewBox="0 0 40 40">${guardian.shape}</svg></span>
    <span class="jackpot-info"><span class="jackpot-label">${level.label}</span><strong class="jackpot-value">×${level.multiplier.toLocaleString("es-AR")}</strong><small class="guardian-name">${guardian.name.split(" · ")[0]}</small></span>
  </article>`;
}

const vesselNames = ["JADE", "EMBER", "TIDE"];
const vesselLabels = ["Jade", "Brasa", "Marea"];
const vesselLabelKeys = ["vesselJade", "vesselEmber", "vesselTide"];

function vessel(index: number): string {
  const name = vesselNames[index] ?? "JADE";
  const label = vesselLabels[index] ?? "Jade";
  const labelKey = vesselLabelKeys[index] ?? "vesselJade";
  return `<div class="pot-vessel pot-${name.toLowerCase()}" data-vessel="${index}">
    <span class="vessel-aura" aria-hidden="true"></span>
    <svg viewBox="0 0 70 76" aria-hidden="true" class="vessel-art">
      <path class="vessel-neck" d="M23 11h24l-2 10H25z" />
      <path class="vessel-body" d="M21 19c1 7-10 12-10 29 0 15 10 23 24 23s24-8 24-23c0-17-11-22-10-29z" />
      <path class="vessel-rim" d="M20 19h30M17 31c11 7 25 7 36 0M16 52c12 6 26 6 38 0" />
      <circle class="vessel-jewel" cx="35" cy="42" r="6" />
      <path class="vessel-tassel" d="M35 2v8m0 0-5 5m5-5 5 5" />
    </svg>
    <span class="vessel-name" data-i18n="${labelKey}">${label}</span>
    <strong class="vessel-count" data-vessel-value="${index}">×0</strong>
  </div>`;
}

export function mountGameShell(host: HTMLElement): void {
  host.innerHTML = `
    <main class="game-shell">
      <div class="ambient-glow ambient-glow-one" aria-hidden="true"></div>
      <div class="ambient-glow ambient-glow-two" aria-hidden="true"></div>
      <div class="loading-screen" id="loading-screen" role="status" aria-live="polite">
        <div class="loading-mark" aria-hidden="true"><span>✦</span></div>
        <p class="loading-brand">BRUMA <i>DE JADE</i></p>
        <div class="loading-track"><span></span></div>
        <small data-i18n="responsibleShort">DEMO – SIN DINERO REAL</small>
      </div>

      <header class="topbar">
        <a class="brand-lockup" href="#game" aria-label="Bruma de Jade, inicio" data-i18n-aria="brandHome">
          <span class="brand-emblem" aria-hidden="true">
            <svg viewBox="0 0 52 52"><path d="M26 4 44 14v21L26 46 8 35V14z"/><path d="M13 26c6-9 16-10 24-2-6-1-9 1-11 5-2 4-7 4-12 3 4 4 11 5 17 1 3-2 5-5 7-9-2 10-8 16-17 15-7-1-11-5-12-13Z"/><circle cx="31" cy="20" r="1.4"/></svg>
          </span>
          <span class="brand-copy"><strong>BRUMA <i>DE JADE</i></strong><small>CALDEROS DEL ALBA</small></span>
        </a>
        <div class="top-actions">
          <span class="demo-badge"><span class="demo-dot"></span><span data-i18n="responsibleShort">DEMO – SIN DINERO REAL</span></span>
          <button class="icon-button sound-toggle" id="sound-toggle" type="button" aria-label="Activar o silenciar sonido" title="Sound">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path class="sound-wave" d="M16 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/></svg>
          </button>
          <button class="language-toggle" id="language-toggle" type="button" aria-label="Cambiar idioma" data-i18n-aria="changeLanguage">ES</button>
        </div>
      </header>

      <section class="jackpot-strip" aria-label="Jackpots" data-i18n-aria="jackpotsLabel">
        ${gameConfig.pot.levels.map(jackpotCard).join("")}
      </section>

      <section class="wallet-row" aria-label="Saldo y apuesta" data-i18n-aria="walletLabel">
        <div class="wallet-card wallet-balance">
          <span class="eyebrow" data-i18n="balance">SALDO</span>
          <strong id="balance-value">5,000</strong>
          <span class="wallet-currency" data-i18n="virtualCredits">CRÉDITOS DEMO</span>
        </div>
        <div class="wallet-divider" aria-hidden="true"></div>
        <div class="wallet-card wallet-bet">
          <span class="eyebrow" data-i18n="bet">APUESTA</span>
          <strong id="bet-value">1.00</strong>
          <span class="wallet-currency" data-i18n="creditsPerSpin">CRÉDITOS / GIRO</span>
        </div>
      </section>

      <div class="prompt-row">
        <span class="prompt-flourish" aria-hidden="true">✧</span>
        <span id="game-message" role="status" aria-live="polite" aria-atomic="true" data-i18n="place">HAZ TU APUESTA</span>
        <span class="prompt-flourish" aria-hidden="true">✧</span>
      </div>

      <section class="machine" aria-label="Tragaperras Bruma de Jade" data-i18n-aria="machineLabel">
        <div class="vessel-row" aria-label="Calderos del Pot" data-i18n-aria="potVesselsLabel">${vessel(0)}${vessel(1)}${vessel(2)}</div>
        <div class="board-shell">
          <div class="board-glint" aria-hidden="true"></div>
          <div id="pixi-stage" class="pixi-stage" role="img" aria-label="Tablero de cinco rodillos por tres filas" data-i18n-aria="boardLabel"></div>
          <div class="board-corner corner-left" aria-hidden="true">❖</div>
          <div class="board-corner corner-right" aria-hidden="true">❖</div>
        </div>
        <div class="pot-progress-row">
          <span id="pot-level-label">MINI ×20</span>
          <div class="pot-progress-track" role="progressbar" aria-label="Progreso del Pot hacia el siguiente nivel" data-i18n-aria="potProgressLabel" aria-valuemin="0" aria-valuemax="320" aria-valuenow="0">
            <span id="pot-progress-fill"></span>
            <i class="pot-progress-spark" aria-hidden="true"></i>
          </div>
          <span id="pot-progress-caption">0 / 20</span>
        </div>
      </section>

      <div class="status-row">
        <span class="win-copy" id="win-copy"><span class="win-star">✦</span><span data-i18n="collect">Reúne 6 monedas para activar HOLD &amp; SPIN</span></span>
        <span class="win-amount" id="win-amount" role="status" aria-live="polite" aria-atomic="true" hidden></span>
      </div>

      <section class="control-deck" aria-label="Controles del juego" data-i18n-aria="controlsLabel">
        <div class="control-row control-row-main">
          <button class="utility-control" id="menu-button" type="button" aria-label="Abrir menú" data-i18n-aria="openMenu">
            <span class="utility-icon">☰</span><span data-i18n="menu">MENÚ</span>
          </button>
          <button class="utility-control speed-control" id="speed-button" type="button" aria-label="Cambiar velocidad">
            <span class="utility-icon">»</span><span data-i18n="speed">VELOCIDAD</span>
          </button>
          <button class="spin-button" id="spin-button" type="button" aria-label="Girar rodillos; mantener pulsado para turbo" data-i18n-aria="spinAria">
            <span class="spin-ring" aria-hidden="true"></span>
            <span class="spin-text" data-i18n="spin">GIRAR</span>
            <small data-i18n="turbo">MANTÉN PARA TURBO</small>
          </button>
          <button class="utility-control bet-down" id="bet-down" type="button" aria-label="Reducir apuesta" data-i18n-aria="decreaseBet">
            <span class="utility-icon">−</span><span data-i18n="bet">APUESTA</span>
          </button>
          <button class="utility-control bet-up" id="bet-up" type="button" aria-label="Aumentar apuesta" data-i18n-aria="increaseBet">
            <span class="utility-icon">+</span><span data-i18n="bet">APUESTA</span>
          </button>
        </div>
        <div class="control-row control-row-secondary">
          <button class="buy-feature-button" id="buy-feature-button" type="button">
            <span class="buy-star" aria-hidden="true">✦</span>
            <span><strong data-i18n="bonus">BONUS</strong><small id="feature-cost-label">535× APUESTA</small></span>
            <span class="buy-arrow" aria-hidden="true">›</span>
          </button>
          <button class="autoplay-button" id="autoplay-button" type="button" aria-label="Activar juego automático">
            <span class="autoplay-ring">A</span><span data-i18n="autoplay">AUTO</span>
          </button>
        </div>
      </section>

      <footer class="responsible-footer">
        <span class="footer-seal" aria-hidden="true">✧</span>
        <span data-i18n="responsible">Juega con responsabilidad. Solo para entretenimiento.</span>
        <span class="footer-seal" aria-hidden="true">✧</span>
      </footer>

      <dialog class="game-dialog" id="main-dialog" aria-labelledby="dialog-title">
        <div class="dialog-heading"><div><span class="eyebrow">BRUMA DE JADE</span><h2 id="dialog-title">Santuario de Jade</h2></div><button class="dialog-close" type="button" aria-label="Cerrar" data-i18n-aria="closeDialog">×</button></div>
        <nav class="dialog-tabs" aria-label="Secciones del menú" data-i18n-aria="dialogTabs">
          <button class="dialog-tab is-active" data-panel="paytable" type="button" data-i18n="paytable">Pagos</button>
          <button class="dialog-tab" data-panel="rules" type="button" data-i18n="rules">Reglas</button>
          <button class="dialog-tab" data-panel="history" type="button" data-i18n="history">Historial</button>
          <button class="dialog-tab" data-panel="settings" type="button" data-i18n="settings">Ajustes</button>
        </nav>
        <div class="dialog-body" id="dialog-body"></div>
      </dialog>

      <dialog class="game-dialog buy-dialog" id="buy-dialog" aria-labelledby="buy-title">
        <div class="dialog-heading"><div><span class="eyebrow" data-i18n="featureCost">COSTE DEL BONUS</span><h2 id="buy-title" data-i18n="confirmBuyTitle">¿Comprar HOLD &amp; SPIN?</h2></div><button class="dialog-close" type="button" aria-label="Cerrar" data-i18n-aria="closeDialog">×</button></div>
        <p class="buy-confirm-copy" id="buy-confirm-copy"></p>
        <p class="buy-meter-note" data-i18n="buyDesc">La compra activa un bonus de demostración con un medidor independiente; conserva el progreso del Pot base.</p>
        <div class="dialog-actions"><button class="secondary-button" id="buy-cancel" type="button" data-i18n="cancel">VOLVER</button><button class="primary-button" id="buy-confirm" type="button" data-i18n="buy">COMPRAR BONUS</button></div>
      </dialog>

      <div class="toast" id="toast" role="status" aria-live="polite"></div>
    </main>`;
}
