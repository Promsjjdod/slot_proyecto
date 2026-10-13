import "./ui/styles.css";
import { mountGame } from "./ui/app";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Missing #app root element");
}

void mountGame(app).catch((error: unknown) => {
  console.error("Bruma de Jade could not start:", error);
  app.innerHTML =
    '<main style="min-height:100vh;display:grid;place-items:center;background:#07171f;color:#fff1c5;font:16px system-ui;padding:24px;text-align:center"><p>No se pudo iniciar la demo.<br />Actualiza la página e inténtalo de nuevo.</p></main>';
});
