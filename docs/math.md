# Matemática del juego

## Configuración

La fuente editable es `src/core/config.json`: strips de 160 paradas por rodillo, tabla de pagos, probabilidades, umbrales del Pot, coste de Buy Feature y RTP objetivo. El juego es una **demo de entretenimiento**; todos los importes son multiplicadores de créditos virtuales.

- Cuadrícula: 5 rodillos × 3 filas.
- Modelo: **243 ways**. Se paga la mayor cantidad de rodillos consecutivos desde la izquierda; el número de formas es el producto de coincidencias por rodillo.
- WILD sustituye a símbolos pagadores, no a COIN ni BONUS. WILD también tiene pago propio.
- 6 o más COIN en una tirada activan Hold & Spin.
- Premio objetivo: RTP 96%; volatilidad media-alta, con una contribución infrecuente del jackpot Grand.

## RNG reproducible

`src/core/rng.ts` implementa Mulberry32 con semilla unsigned de 32 bits. `SlotEngine(seed)` y las tiras estáticas permiten repetir exactamente una secuencia en tests y simulaciones. En el cliente se genera una semilla nueva con `crypto.getRandomValues` al iniciar la sesión. Este PRNG es para una demo; no debe reutilizarse como generador criptográfico ni para apuestas con valor real.

Cada rodillo elige una parada uniforme en su strip y presenta las tres posiciones contiguas con wrap-around. La distribución y las agrupaciones de símbolos de colección están en el JSON, no en código aleatorio ad hoc.

## Ways y pagos

Para un símbolo pagador, se cuentan las celdas coincidentes (símbolo + WILD) de cada rodillo desde el primero. Con 3 o más rodillos consecutivos:

`ways = count(reel 1) × count(reel 2) × … × count(reel N)`

`pago = redondear_a_0,01(ways × tabla[símbolo][N] × payoutScale × apuesta)`

`payoutScale` calibra el conjunto de pagos para sostener el RTP meta junto con el jackpot. Se mantiene en JSON y cualquier modificación de strips, premios, valores de coin, feature o umbrales obliga a volver a ejecutar el simulador.

## Coin, Pot y jackpots

Los símbolos COIN reciben valores de la tabla ponderada (`1, 2, 3, 5, 10, 20 × apuesta`). Cada moneda se asigna a uno de los calderos Jade, Brasa o Marea y contribuye a un medidor compartido. El medidor avanza los niveles en umbrales acumulados de `20`, `70` y `320` unidades. Los premios de cada nivel son Mini ×20, Minor ×50, Major ×250 y Grand ×2000.

Cada coin tiene `chanceUpgradeProbability = 0.18`; si se activa, aumenta su valor y aporte al Pot en `chanceUpgradeExtra = 1`. El medidor persiste entre giros normales y se reinicia cuando se resuelve Hold & Spin. Un bonus otorga el valor de las monedas recogidas más el premio del nivel del Pot alcanzado. Completar las 15 posiciones paga Grand ×2000.

## Hold & Spin

Con 6+ coins, se fijan las monedas iniciales y se juegan 3 respins. Cada celda vacía puede recibir una moneda con `featureCoinProbability`; una moneda nueva restablece el contador a 3. El feature termina al agotar los respins o llenar el tablero. Cada moneda conserva su valor y puede activar la mejora del 18%.

Buy Feature cuesta `535 × apuesta`, requiere confirmación y crea un medidor independiente para evitar cobrar progreso generado por giros anteriores. El progreso del Pot base se conserva. El precio se calibró aparte con `npm run simulate:buy`: en 100.000 compras (seed `7411`) el pago medio fue `509,837×`, la frecuencia de tablero completo `21,931 %` y el retorno implícito al precio configurado `95,297 %`. Buy Feature se presenta como comodidad de demo; el RTP base de CI se mide con el feature disparado por strips.

## Simulador / control de RTP

`tools/simulate.ts` ejecuta **10.000.000** giros secuenciales y reporta RTP, hit frequency, frecuencia del bonus, distribución de jackpots, llenados y velocidad. El estado del Pot se conserva entre tiradas igual que en el juego.

```sh
npm run simulate -- --spins=1000000 --seed=2654435769
npm run simulate:buy -- --spins=100000
npm run test:rtp
```

`npm run test:rtp` usa la semilla fija por defecto y falla si el RTP simulado difiere más de **±1 punto porcentual** del objetivo configurado. El workflow de CI ejecuta la comprobación completa de 10 millones.

### Calibración de referencia

En la calibración de 10.000.000 de giros (seed `2654435769`, 2026-10-13), se obtuvo:

| Métrica              |                              Resultado |
| -------------------- | -------------------------------------: |
| RTP observado        |           **96,009 %** (objetivo 96 %) |
| Frecuencia de premio |                               47,638 % |
| Bonus                |            802 / 10.000.000 (0,0080 %) |
| Premios del Pot      | Mini 0 · Minor 1 · Major 7 · Grand 794 |
| Tablero completo     |                                    179 |
| Mayor pago observado |                         2.081× apuesta |

Es una estimación Monte Carlo con semilla fija; cambios en los strips o en cualquier premio invalidan esta referencia y requieren volver a ejecutar `npm run test:rtp`.
