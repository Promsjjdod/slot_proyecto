# Ejecutar la demo en Android con Termux

`termux.sh` instala las dependencias de npm la primera vez, inicia Vite solo en la interfaz local del teléfono y abre el navegador Android. No requiere GitHub Pages, servidor externo, root ni dinero real.

## Preparación

1. Instala una versión reciente de **Termux** desde F-Droid o las publicaciones oficiales de Termux. Abre Termux y actualiza sus paquetes:

   ```sh
   pkg update -y && pkg upgrade -y
   pkg install -y git nodejs-lts
   node --version
   ```

   El proyecto requiere Node.js 22 o posterior. `termux.sh` comprueba la versión antes de iniciar.

2. Clona la rama de este PR mientras todavía no esté integrada en `main`:

   ```sh
   cd ~
   git clone --branch arena/54e9f7f7-slot-proyecto --single-branch https://github.com/Promsjjdod/slot_proyecto.git
   cd slot_proyecto
   ```

   Después de que el PR se integre, también puedes clonar la rama predeterminada sin `--branch arena/54e9f7f7-slot-proyecto`.

3. Inicia el proyecto:

   ```sh
   chmod +x termux.sh
   ./termux.sh
   ```

   La primera ejecución necesita conexión a Internet para `npm ci`. Si Termux tiene `termux-open-url`, abrirá el navegador automáticamente; si no, visita **http://127.0.0.1:5173/** en el navegador del mismo teléfono. Mantén esta sesión de Termux abierta mientras juegas y pulsa **Ctrl+C** para apagar Vite.

## Opciones

Si el puerto 5173 ya está ocupado, elige otro:

```sh
PORT=5174 ./termux.sh
```

De forma predeterminada, el servidor solo escucha en `127.0.0.1`, por lo que otros dispositivos de la red Wi-Fi no pueden acceder. Para compartirlo en una red de confianza puedes ejecutar `HOST=0.0.0.0 ./termux.sh`; en ese caso, usa en el otro dispositivo la dirección IP local del teléfono y el puerto elegido. No lo expongas en redes públicas.

## Si ya tienes el repositorio

Desde la carpeta del proyecto, actualiza la rama y ejecuta el lanzador:

```sh
git fetch origin
git checkout arena/54e9f7f7-slot-proyecto
git pull --ff-only origin arena/54e9f7f7-slot-proyecto
./termux.sh
```

El lanzador instala de nuevo las dependencias solo si faltan o si cambió `package.json` o `package-lock.json`. Los créditos, el idioma y el historial se guardan en el almacenamiento local del navegador del teléfono.
