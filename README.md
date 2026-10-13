# Bruma de Jade: Calderos del Alba

**Bruma de Jade** es una tragaperras web original de fantasía, mobile-first y solo para entretenimiento. Usa créditos virtuales; **no hay dinero real, pagos, depósitos ni retiros**. La referencia inspiró únicamente la composición general; personajes, símbolos, marca, ilustraciones y audio son originales.

> **Demo – sin dinero real.** Los créditos no tienen valor monetario.

## Marca

- **Bruma de Jade: Calderos del Alba** — elegida; una aventura por el Santuario de Jade y sus tres calderos.
- La Senda del Fénix Ámbar.
- Las Nueve Campanas.

## Incluye

- Cuadrícula 5×3, **243 ways**, reel strips JSON y RNG reproducible con semilla.
- 5 símbolos bajos y 7 altos originales, WILD, COIN con valores y BONUS.
- Mini ×20, Minor ×50, Major ×250 y Grand ×2000 sobre apuesta; tres calderos, chance de mejora configurable al 18% y Hold & Spin de 3 respins.
- Buy Feature con confirmación y coste demo configurable (535× la apuesta).
- PixiJS + GSAP, arte híbrido original, partículas, jackpots, paytable, reglas, historial, ajustes ES/EN y MP3 procedurales mediante Howler.
- Vitest, ESLint, Prettier, simulador de 10 millones de giros, PWA y workflow de Pages.

**Calibración verificada:** con la semilla fija y 10 M de giros, RTP observado **96,009 %**, hit frequency **47,638 %** y 802 bonus. [Detalle y distribución](docs/math.md).

## Ejecutar localmente

Requiere Node.js 22+.

```sh
npm ci
npm run dev
```

Abre la URL local que muestra Vite. Las preferencias, historial y saldo de demo se guardan solo en el almacenamiento local del navegador; el menú permite reiniciar el saldo.

### Android con Termux

Clona el proyecto en `$HOME` dentro de Termux y ejecuta `./termux.sh`. El lanzador instala dependencias si faltan, inicia el servidor local y abre el navegador Android. [Guía de Termux](docs/termux.md).

## Comandos

| Comando                               | Uso                                                 |
| ------------------------------------- | --------------------------------------------------- |
| `npm run dev`                         | Servidor Vite para desarrollo                       |
| `npm run build`                       | Typecheck y bundle de producción                    |
| `npm test`                            | Tests unitarios Vitest                              |
| `npm run lint`                        | ESLint                                              |
| `npm run format:check`                | Verificar Prettier                                  |
| `npm run simulate -- --spins=1000000` | Simular giros base y reportar métricas              |
| `npm run simulate:buy`                | Estimar costo y retorno de Buy Feature              |
| `npm run test:rtp`                    | 10 M giros; valida RTP objetivo ±1 punto porcentual |
| `npm run audio:generate`              | Regenerar loops y efectos MP3 originales            |

## Documentación

- [Diseño del juego](docs/game-design.md)
- [Matemática del juego](docs/math.md)
- [Guía de arte](docs/art-guide.md)
- [Ejecutar en Android con Termux](docs/termux.md)
- [Changelog](CHANGELOG.md)

## Demo publicada

La acción de GitHub Pages está configurada para desplegar desde `main` cuando el cambio se integre. URL prevista: **https://promsjjdod.github.io/slot_proyecto/**. Hasta completar esa integración, ejecuta la demo localmente o usa la vista previa de Arena.

## Originalidad y recursos

El código del proyecto y los recursos creados para esta demo no incorporan marcas, personajes ni audio de slots existentes. El audio se sintetiza desde cero con `tools/generate-audio.cjs`. La ilustración de fondo y los SVG son originales para Bruma de Jade.
