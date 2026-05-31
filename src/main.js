import { App } from "./app.js";
import { BUILD_VERSION } from "./buildInfo.js";

const versionBadge = document.getElementById("versionBadge");
if (versionBadge) {
  versionBadge.textContent = `v${BUILD_VERSION}`;
  versionBadge.setAttribute("aria-label", `Build version ${BUILD_VERSION}`);
}

const app = new App();
window.__app = app;
app.start();
