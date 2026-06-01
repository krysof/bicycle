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

function colorHex(value) {
  return `#${Number(value || 0).toString(16).padStart(6, "0")}`;
}

function avatarSvg(avatar) {
  const skin = colorHex(avatar.skin);
  const hair = colorHex(avatar.hair);
  const body = colorHex(avatar.body);
  const hat = colorHex(avatar.hat);
  const female = avatar.gender === "female";
  const longHair = avatar.hairMode === "long" || avatar.hairMode === "bob" || avatar.hairMode === "bun";
  return `
    <svg class="character-svg ${avatar.gender}" viewBox="0 0 72 82" aria-hidden="true">
      <ellipse cx="36" cy="75" rx="22" ry="5" fill="rgba(36,48,68,.16)" />
      ${longHair ? `<ellipse cx="36" cy="31" rx="20" ry="24" fill="${hair}" />` : ""}
      ${avatar.hairBun ? `<circle cx="17" cy="31" r="8" fill="${hair}" />` : ""}
      <rect x="${female ? 22 : 21}" y="45" width="${female ? 28 : 30}" height="29" rx="${female ? 12 : 9}" fill="${body}" />
      <path d="${female ? "M22 67 L50 67 L56 77 L16 77 Z" : "M22 66 H50 V76 H22 Z"}" fill="${body}" opacity=".92" />
      <circle cx="36" cy="29" r="15" fill="${skin}" />
      <path d="${longHair ? "M22 25 C24 10 49 9 51 28 C44 21 31 21 22 25Z" : "M21 24 C24 10 48 11 51 25 C42 20 31 20 21 24Z"}" fill="${hair}" />
      ${avatar.hatVisible === false ? "" : `<path d="M20 16 Q36 6 52 16 V23 H20 Z" fill="${hat}" /><rect x="16" y="22" width="40" height="5" rx="3" fill="${hat}" />`}
      <circle cx="30" cy="31" r="2.2" fill="#2c2724" />
      <circle cx="42" cy="31" r="2.2" fill="#2c2724" />
      <path d="M31 39 Q36 43 41 39" fill="none" stroke="#9b4a45" stroke-width="2.3" stroke-linecap="round" />
      ${avatar.glasses ? `<path d="M25 30 h10 m2 0 h10" stroke="#51483f" stroke-width="2.2" stroke-linecap="round" /><circle cx="30" cy="31" r="5.3" fill="none" stroke="#51483f" stroke-width="2" /><circle cx="42" cy="31" r="5.3" fill="none" stroke="#51483f" stroke-width="2" />` : ""}
      ${avatar.mustache ? `<path d="M28 38 Q33 35 36 38 Q39 35 44 38" fill="none" stroke="${hair}" stroke-width="3" stroke-linecap="round" />` : ""}
      <rect x="18" y="50" width="6" height="17" rx="3" fill="${skin}" />
      <rect x="48" y="50" width="6" height="17" rx="3" fill="${skin}" />
    </svg>`;
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
                ${avatarSvg(avatar)}
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
