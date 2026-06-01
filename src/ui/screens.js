import { t } from "../i18n.js";
import { PLAYER_AVATARS } from "../data/playerAvatars.js";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export class Screens {
  constructor(root) {
    this.root = root;
  }

  clear() {
    this.root.innerHTML = "";
  }

  title(selectedAvatarId = "m01") {
    const selected = PLAYER_AVATARS.find((avatar) => avatar.id === selectedAvatarId) || PLAYER_AVATARS[0];
    this.root.innerHTML = `
      <section class="screen narrow title-screen">
        <div class="stamp">${t("stamp")}</div>
        <p class="eyebrow">${t("titleKicker")}</p>
        <h1>${t("homeTitle")}</h1>
        <p class="lead">${t("titleSoundNote")}</p>
        <div class="title-character-panel" aria-label="${esc(t("titleSelectCharacter"))}">
          <p class="character-title">${t("titleSelectCharacter")}</p>
          <div class="character-grid">
            ${PLAYER_AVATARS.map((avatar, index) => `
              <button type="button" class="character-card ${avatar.id === selected.id ? "selected" : ""}" data-avatar="${esc(avatar.id)}" aria-label="${esc(`${t("titleSelectCharacter")} ${index + 1}`)}">
                <span class="character-portrait ${avatar.gender}" style="--body:#${avatar.body.toString(16).padStart(6, "0")};--hat:#${avatar.hat.toString(16).padStart(6, "0")};--hair:#${avatar.hair.toString(16).padStart(6, "0")};--skin:#${avatar.skin.toString(16).padStart(6, "0")};">
                  <span class="portrait-head"></span>
                  <span class="portrait-hair ${avatar.hairMode || "short"}"></span>
                  ${avatar.hairBun ? `<span class="portrait-bun"></span>` : ""}
                  ${avatar.hatVisible === false ? "" : `<span class="portrait-hat"></span>`}
                  <span class="portrait-eye left"></span>
                  <span class="portrait-eye right"></span>
                  <span class="portrait-body"></span>
                  ${avatar.glasses ? `<span class="portrait-glasses"></span>` : ""}
                  ${avatar.mustache ? `<span class="portrait-mustache"></span>` : ""}
                </span>
              </button>`).join("")}
          </div>
          <p class="character-note">${selected.gender === "female" ? t("titleSelectedFemale") : t("titleSelectedMale")}</p>
        </div>
        <button class="title-start primary" data-action="title-start">
          <span class="mode-icon">🚲</span>
          <strong>${t("titleStart")}</strong>
        </button>
      </section>`;
  }

  home(record, playerName = "", todayStatus = "normal", autoFamilyMessage = "", familyMessageCount = 0) {
    const last = record.lastSummary;
    const yesterday = last
      ? t("greetingLast", last.count)
      : t("greetingFirst");
    const familyMessage = autoFamilyMessage || record.familyMessage || "";

    this.root.innerHTML = `
      <section class="screen narrow home-screen simple-home">
        <div class="stamp">${t("stamp")}</div>
        <p class="eyebrow">${t("eyebrow")}</p>
        <h1>${t("homeTitle")}</h1>
        <p class="lead">${playerName ? t("companionHelloNamed", playerName, yesterday) : t("companionHello", yesterday)}</p>
        <label class="name-field">
          <span>${t("playerNameLabel")}</span>
          <input id="playerNameInput" type="text" maxlength="24" value="${esc(playerName)}" autocomplete="name" />
          <em>${t("playerNameHelp")}</em>
        </label>
        <label class="name-field family-field">
          <span>${t("familyMessageLabel")}</span>
          <div class="family-message-row">
            <input id="familyMessageInput" type="text" maxlength="120" value="${esc(familyMessage)}" placeholder="${esc(t("familyMessagePlaceholder"))}" data-auto-message="${esc(autoFamilyMessage)}" />
            <button type="button" class="small-inline-btn" data-action="random-family-message">${t("familyMessageShuffle")}</button>
          </div>
          <em>${t("familyMessageHelp", familyMessageCount)}</em>
        </label>
        <div class="status-panel" aria-label="${t("statusQuestion")}">
          <p class="status-title">${t("statusQuestion")}</p>
          <div class="status-grid">
            ${["tired", "normal", "good"].map((status) => `
              <button type="button" class="status-card ${todayStatus === status ? "selected" : ""}" data-status="${status}">
                <strong>${t(`status_${status}`)}</strong>
                <em>${t(`status_${status}_hint`)}</em>
              </button>`).join("")}
          </div>
        </div>
        <div class="mode-grid" aria-label="${t("chooseMode")}">
          <button class="mode-card primary" data-mode="bike">
            <span class="mode-icon">🚲</span>
            <strong>${t("startBike")}</strong>
            <em>${t("startBikeHint")}</em>
          </button>
          <button class="mode-card" data-mode="walk">
            <span class="mode-icon">🚶</span>
            <strong>${t("startWalk")}</strong>
            <em>${t("startWalkHint")}</em>
          </button>
        </div>
        <p class="tiny-note">${t("homeNote")}</p>
      </section>`;
  }

  summary(state, early) {
    const count = state.delivered.length;
    const cards = state.gratitudeCards || [];
    this.root.innerHTML = `
      <section class="screen narrow">
        <p class="eyebrow">${t("todaySummary")}</p>
        <h1>${early ? t("stopToday") : t("doneToday")}</h1>
        <p class="lead">${t("summaryLead", count)}</p>
        <div class="cards">
          <div class="card"><strong>${count}</strong><p>${t("deliveredCount")}</p></div>
          <div class="card"><strong>${state.config?.routeNameKey ? t(state.config.routeNameKey) : (state.config?.routeName || "Route")}</strong><p>${t("route")}</p></div>
          <div class="card"><strong>${state.config?.moveMode === "bike" ? t("modeBike") : t("modeWalk")}</strong><p>${t("mode")}</p></div>
        </div>
        <section class="thank-card-list" aria-label="${t("thankCardTitle")}">
          <h2>${t("thankCardTitle")}</h2>
          ${cards.length ? cards.map((card) => `
            <article class="thank-card">
              <strong>${esc(t("thankCardFrom", card.name))}</strong>
              <p>${esc(card.text)}</p>
            </article>`).join("") : `<p class="tiny-note">${esc(t("shareText", count))}</p>`}
        </section>
        <div class="button-row">
          <button class="primary" data-action="home">${t("home")}</button>
          <button data-action="share-card">${t("shareCard")}</button>
          <button data-mode="walk">${t("walkAgain")}</button>
          <button data-mode="bike">${t("bikeAgain")}</button>
        </div>
      </section>`;
  }
}
