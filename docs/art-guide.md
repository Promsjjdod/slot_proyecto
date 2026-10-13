# Guía de arte — Bruma de Jade

## Dirección

Acabado **híbrido**: paisaje pictórico con profundidad atmosférica, símbolos y UI vectoriales ornamentales. La referencia de composición sirve solo como guía; no se reutilizan nombres, logos, personajes, ilustraciones ni sonidos de terceros.

La marca elegida es **Bruma de Jade: Calderos del Alba**. La insignia representa una criatura-serpiente celeste que traza una nube alrededor de una gema. El mundo y los motivos son originales: el Santuario de Jade, la niebla de montaña y los tres calderos Jade, Brasa y Marea. Los paneles de jackpot presentan cuatro guardianes vectoriales propios: Neri (mensajera), Tovo (guardián del loto), Yuna (tejedora de brasa) y Aúreo (dragón astral).

## Paleta

| Uso                    | Color                |
| ---------------------- | -------------------- |
| Fondo profundo         | `#07171F`, `#071A22` |
| Jade / acción positiva | `#52D9AA`, `#178B70` |
| Oro principal          | `#F4D17A`, `#FFF0B4` |
| Brasa / BONUS          | `#FF8B69`, `#BD4248` |
| Marea / Minor          | `#57B7FF`            |
| Major                  | `#FF6B6B`            |
| Grand                  | `#BB88FF`            |
| Texto secundario       | `#A9B7B4`            |

Los cinco símbolos bajos usan verde, azul, magenta, morado y coral; los símbolos altos emplean jade, coral, violeta y oro.

## Tipografía

- **Marcellus** para marca, nombres de premios y cifras de impacto.
- **DM Sans** para navegación, botones, reglas y lecturas pequeñas.
- Fallback local: Georgia y system sans-serif. El juego mantiene contraste alto y no depende de la tipografía para comunicar un estado.

## Materiales e iluminación

- Paneles de vidrio verde petróleo con bordes finos oro viejo.
- Marcos con doble filete, bisel y reflejo superior; radios de 10–16 px en la UI.
- Luces jade frías para el entorno, oro cálido para premio/coin, coral para bonus.
- Glow siempre en capas cortas y controladas: borde + halo, evitando blur grande en móviles.
- El fondo es una ilustración original de montañas y niebla; su zona central se mantiene oscura para preservar la lectura del tablero.

## Motivos originales

- **Koi de jade:** cuerpo coral con escamas solares.
- **Linterna solar:** linterna bermellón con costillas doradas.
- **Loto de luna:** siete pétalos rosados y centro ámbar.
- **Nudo celeste:** lazo de jade continuo.
- **Dragón Áureo:** rostro geométrico de criatura-serpiente original.
- **Pagoda del Alba:** pabellón de tres aleros turquesa.
- **Puerta lunar:** arco violeta abierto sobre un horizonte de niebla.
- **Coin:** moneda tallada con un rombo central; muestra su valor en × apuesta.
- **WILD / BONUS:** emblemas de alto contraste; el color se acompaña siempre de una etiqueta.

Los símbolos vectoriales se dibujan en PixiJS y existe un atlas SVG con metadatos JSON tipo TexturePacker en `public/assets/spritesheets/`.

## Movimiento

- Rodillos: vibración breve y parada escalonada con overshoot.
- Símbolos ganadores: respiración de escala y trazo dorado de formas ganadoras.
- Monedas: trayectoria curva aparente, chispas discretas al llegar al caldero.
- Subida de Pot: luz del nivel correspondiente y salto corto de la vasija.
- `prefers-reduced-motion` y calidad Ahorro reducen la cantidad/intensidad de movimiento.

## Rendimiento / accesibilidad

- Objetivo de dibujo: una capa PixiJS para el tablero y efectos de corta vida; HTML semántico para botones, saldo y menús.
- El arte se mantiene vectorial en símbolos para escalar en DPR alto. El fondo se solicita solo como recurso principal, no como spritesheet.
- Botones con foco visible, labels accesibles y modo de idioma ES/EN. Los jackpots se distinguen por texto y valor además de color.
