const state = {
  catalog: [],
  featuredId: null,
  selectedId: null,
  view: "home",
  query: "",
  favorites: new Set(JSON.parse(localStorage.getItem("monarch:favorites") || "[]")),
  recent: JSON.parse(localStorage.getItem("monarch:recent") || "[]")
};

const $ = (selector) => document.querySelector(selector);
const grid = $("#buildGrid");
const emptyState = $("#emptyState");
const dialog = $("#detailsDialog");

const viewNames = {
  home: ["MONARCH LIBRARY", "Featured builds"],
  all: ["COMPLETE CATALOG", "All builds"],
  vanilla: ["CORE VERSIONS", "Regular versions"],
  client: ["ALTERNATE BUILDS", "Clients"],
  modded: ["EXTENDED PLAY", "Modded builds"],
  fps: ["PERFORMANCE", "FPS clients"],
  snapshot: ["EXPERIMENTAL", "Snapshots"],
  favorites: ["MY LIBRARY", "Favorites"],
  recent: ["MY LIBRARY", "Recently played"]
};

function saveFavorites() {
  localStorage.setItem("monarch:favorites", JSON.stringify([...state.favorites]));
  $("#favoriteCount").textContent = state.favorites.size;
}

function saveRecent() {
  state.recent = state.recent.slice(0, 12);
  localStorage.setItem("monarch:recent", JSON.stringify(state.recent));
}

function categoryLabel(category) {
  return {
    vanilla: "Regular",
    client: "Client",
    modded: "Modded",
    fps: "FPS",
    snapshot: "Snapshot"
  }[category] || category || "Build";
}

function isLaunchable(build) {
  return Boolean(build?.launch?.target);
}

function statusLabel(build) {
  if (isLaunchable(build)) return "Ready to play";
  return {
    integration: "Integration queued",
    experimental: "Experimental",
    broken: "Temporarily unavailable"
  }[build?.status] || "Integration queued";
}

function selectedBuild() {
  return state.catalog.find((build) => build.id === state.selectedId)
    || state.catalog.find((build) => build.id === state.featuredId)
    || state.catalog[0]
    || null;
}

function filteredBuilds() {
  let builds = [...state.catalog];

  if (state.view === "home") {
    builds = builds.filter((build) => build.id !== state.selectedId);
  } else if (state.view === "favorites") {
    builds = builds.filter((build) => state.favorites.has(build.id));
  } else if (state.view === "recent") {
    builds = state.recent
      .map((id) => state.catalog.find((build) => build.id === id))
      .filter(Boolean);
  } else if (state.view !== "all") {
    builds = builds.filter((build) => build.category === state.view);
  }

  const query = state.query.trim().toLowerCase();
  if (query) {
    builds = builds.filter((build) =>
      [
        build.name,
        build.version,
        build.category,
        build.description,
        ...(build.tags || [])
      ].join(" ").toLowerCase().includes(query)
    );
  }

  return builds;
}

function renderSelector() {
  const select = $("#buildSelect");
  select.innerHTML = state.catalog.map((build) =>
    `<option value="${escapeAttr(build.id)}">${escapeHtml(build.name)} · ${escapeHtml(build.version)}</option>`
  ).join("");

  if (state.selectedId) select.value = state.selectedId;
}

function renderHero() {
  const build = selectedBuild();
  if (!build) return;

  state.selectedId = build.id;
  $("#heroEyebrow").textContent = "Featured " + categoryLabel(build.category);
  $("#heroVersion").textContent = build.version || "";
  $("#heroTitle").textContent = build.name;
  $("#heroDescription").textContent = build.description || "";
  $("#selectedStatus").textContent = statusLabel(build);

  const hero = $("#hero");
  hero.classList.toggle("has-art", Boolean(build.art));
  hero.style.backgroundImage = build.art ? `url("${cssUrl(build.art)}")` : "";

  const select = $("#buildSelect");
  if (select && select.options.length) select.value = build.id;

  const launch = $("#heroLaunch");
  launch.disabled = !isLaunchable(build);
  launch.textContent = isLaunchable(build) ? "PLAY" : "COMING SOON";
  launch.onclick = () => launchBuild(build);

  $("#heroDetails").onclick = () => openDetails(build.id);
}

function renderGrid() {
  const builds = filteredBuilds();
  const [kicker, title] = viewNames[state.view] || viewNames.all;

  $("#viewEyebrow").textContent = kicker;
  $("#viewTitle").textContent = state.query ? `Results for “${state.query}”` : title;
  $("#resultCount").textContent = `${builds.length} build${builds.length === 1 ? "" : "s"}`;

  grid.innerHTML = "";
  emptyState.classList.toggle("hidden", builds.length > 0);

  for (const build of builds) {
    const card = document.createElement("article");
    card.className = "build-card";
    card.dataset.id = build.id;
    card.innerHTML = `
      <div class="card-art" ${build.art ? `style="background-image:url('${escapeAttr(build.art)}')"` : ""}>
        <span class="card-badge">${escapeHtml(categoryLabel(build.category))}</span>
        <button class="favorite-button ${state.favorites.has(build.id) ? "active" : ""}" aria-label="Favorite ${escapeAttr(build.name)}" title="Favorite">★</button>
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <h3 class="card-title">${escapeHtml(build.name)}</h3>
          <span class="card-version">${escapeHtml(build.version)}</span>
        </div>
        <p class="card-description">${escapeHtml(build.description || "")}</p>
        <div class="card-footer">
          <span>${escapeHtml(build.engine || "Web")}</span>
          <span class="launch-status ${isLaunchable(build) ? "ready" : ""}">${escapeHtml(statusLabel(build))}</span>
        </div>
      </div>`;

    card.addEventListener("click", (event) => {
      if (event.target.closest(".favorite-button")) return;
      selectBuild(build.id, true);
    });

    card.querySelector(".favorite-button").addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(build.id);
    });

    grid.appendChild(card);
  }
}

function selectBuild(id, scrollToHero = false) {
  if (!state.catalog.some((build) => build.id === id)) return;
  state.selectedId = id;
  renderHero();
  renderGrid();

  if (scrollToHero) {
    $("#playSection").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setView(view) {
  state.view = view;

  document.querySelectorAll("[data-view]").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });

  renderGrid();

  if (window.innerWidth <= 900) {
    $("#sidebar").classList.remove("open");
  }
}

function setHeaderTab(tab) {
  document.querySelectorAll(".header-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  if (tab === "play") {
    $("#playSection").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (tab === "installations") {
    setView("all");
    $("#librarySection").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (tab === "news") {
    setView("home");
    $("#librarySection").scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Monarch news cards are coming next.");
    return;
  }

  if (tab === "patch-notes") {
    showToast("Patch notes will appear here as Monarch grows.");
  }
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);

  saveFavorites();
  renderGrid();

  if (state.selectedId === id && dialog.open) {
    renderDialog(id);
  }
}

function openDetails(id) {
  state.selectedId = id;
  renderHero();
  renderDialog(id);
  if (!dialog.open) dialog.showModal();
}

function renderDialog(id) {
  const build = state.catalog.find((item) => item.id === id);
  if (!build) return;

  $("#dialogEyebrow").textContent = categoryLabel(build.category) + " · " + build.version;
  $("#dialogTitle").textContent = build.name;
  $("#dialogDescription").textContent = build.description || "";

  const cover = $("#dialogCover");
  cover.style.backgroundImage = build.art ? `url("${cssUrl(build.art)}")` : "";

  $("#dialogChips").innerHTML = (build.tags || [])
    .map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`)
    .join("");

  $("#dialogFacts").innerHTML = `
    <div class="fact">
      <div class="fact-label">Version</div>
      <div class="fact-value">${escapeHtml(build.version)}</div>
    </div>
    <div class="fact">
      <div class="fact-label">Engine</div>
      <div class="fact-value">${escapeHtml(build.engine || "Web")}</div>
    </div>
    <div class="fact">
      <div class="fact-label">Status</div>
      <div class="fact-value">${escapeHtml(statusLabel(build))}</div>
    </div>`;

  const launch = $("#dialogLaunch");
  launch.disabled = !isLaunchable(build);
  launch.textContent = isLaunchable(build) ? "PLAY" : "COMING SOON";
  launch.onclick = () => launchBuild(build);

  const favorite = $("#dialogFavorite");
  favorite.textContent = state.favorites.has(build.id) ? "Remove favorite" : "Add favorite";
  favorite.onclick = () => toggleFavorite(build.id);
}

function launchBuild(build) {
  if (!isLaunchable(build)) {
    showToast("This build is not connected yet.");
    return;
  }

  state.recent = [build.id, ...state.recent.filter((id) => id !== build.id)];
  saveRecent();

  const target = build.launch.target;
  if (build.launch.mode === "new-tab") {
    window.open(target, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = target;
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1900);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function cssUrl(value = "") {
  return String(value).replace(/["\\\n\r]/g, "");
}

async function loadCatalog() {
  try {
    const response = await fetch("./catalog/versions.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);

    const data = await response.json();
    state.catalog = Array.isArray(data.builds) ? data.builds : [];
    state.featuredId = data.featured || state.catalog[0]?.id || null;
    state.selectedId = state.featuredId;
  } catch (error) {
    console.error(error);
    state.catalog = [];
    showToast("Catalog failed to load.");
  }

  $("#allCount").textContent = state.catalog.length;
  $("#favoriteCount").textContent = state.favorites.size;

  renderSelector();
  renderHero();
  renderGrid();
}

document.querySelectorAll("[data-view]").forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view));
});

document.querySelectorAll(".header-tab").forEach((button) => {
  button.addEventListener("click", () => setHeaderTab(button.dataset.tab));
});

$("#buildSelect").addEventListener("change", (event) => {
  selectBuild(event.target.value);
});

$("#searchInput").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderGrid();
});

$("#mobileMenu").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

$("#settingsButton").addEventListener("click", () => {
  showToast("Launcher settings are coming next.");
});

$("#dialogClose").addEventListener("click", () => dialog.close());

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $("#sidebar").classList.remove("open");
  }
});

loadCatalog();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?monarch=3").catch((error) => {
      console.warn("Monarch service worker registration failed:", error);
    });
  });
}
