# Diseño del juego — Bruma de Jade: Calderos del Alba

## Premisa y marca

En la cordillera de jade, la niebla despierta cada amanecer y guarda monedas solares bajo el Santuario. La persona jugadora acompaña a cuatro guardianes originales: **Neri**, mensajera de la niebla (Mini); **Tovo**, guardián del loto (Minor); **Yuna**, tejedora de brasa (Major); y **Aúreo**, dragón astral (Grand). No se basan en personajes ni relatos de juegos existentes.

Nombres considerados:

1. **Bruma de Jade: Calderos del Alba** — elegido.
2. La Senda del Fénix Ámbar.
3. Las Nueve Campanas.

## Bucle principal

1. Seleccionar una apuesta de créditos virtuales y pulsar SPIN.
2. Resolver una cuadrícula de 5×3 con strips ponderados y 243 formas de izquierda a derecha.
3. Los COIN muestran un valor, vuelan al caldero Jade, Brasa o Marea y llenan el Pot compartido.
4. Si el medidor cruza un umbral, el jackpot activo asciende: Mini ×20 → Minor ×50 → Major ×250 → Grand ×2000.
5. Con 6 o más COIN empieza Hold & Spin: se fijan las monedas y hay 3 respins; cada nueva moneda reinicia el contador. Al concluir se suman valores y premio del Pot; completar las 15 posiciones paga Grand.

## Símbolos

- Bajos: 10, J, Q, K y A, con cinco colores de gema.
- Altos: Koi de jade, Linterna solar, Loto de luna, Nudo celeste, Dragón Áureo, Pagoda del Alba y Puerta lunar.
- WILD: sustituye símbolos pagadores salvo COIN y BONUS.
- COIN: moneda tallada con valor × apuesta y asignación de caldero.
- BONUS: emblema solar de transición.

## Pantalla y controles

- Retrato responsive con logo e indicación persistente de demo.
- Cuatro paneles Mini/Minor/Major/Grand, saldo y apuesta.
- Tres calderos decorativos y barra de progreso por nivel.
- Tablero PixiJS con marco ornamental; HUD inferior con menú, velocidad, SPIN/hold turbo, selector de apuesta, autoplay y compra de feature confirmable.
- Menú: paytable, reglas, historial de últimas 12 rondas y ajustes de sonido, música, vibración, calidad e idioma ES/EN.

## Compra de feature y juego responsable

Buy Feature cuesta `535 × apuesta`, se confirma antes del cargo y opera con un medidor fresco separado; preserva el progreso normal del Pot. Es una función de demo, no una oferta económica. El saldo, historial y preferencias viven localmente en el navegador.

La experiencia usa únicamente créditos sin valor monetario. No integra pagos, depósitos, retiros, premios canjeables ni cuentas de jugador. El rótulo **«Demo – sin dinero real»** permanece visible.
