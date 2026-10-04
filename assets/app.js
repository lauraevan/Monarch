const state = {
  catalog: [],
  featuredId: null,
  view: "home",
  query: "",
  selectedId: null,
  favorites: new Set(JSON.parse(localStorage.getItem("monarch:favorites") || "[]")),
  recent: JSON.parse(localStorage.getItem("monarch:recent") || "[]")
};

const $ = (selector) => document.querySelector(selector);
const grid = $("#buildGrid");
const emptyState = $("#emptyState");
const dialog = $("#detailsDialog");

const viewNames = {
  home: ["Monarch library", "Featured"],
  all: ["Complete catalog", "All builds"],
  vanilla: ["Core versions", "Regular"],
  client: ["Alternate builds", "Clients"],
  modded: ["Extended play", "Modded"],
  fps: ["Performance", "FPS clients"],
  snapshot: ["Experimental", "Snapshots"],
  favorites: ["Your library", "Favorites"],
  recent: ["Your library", "Recently played"]
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
  }[category] || category;
}

function isLaunchable(build) {
  return Boolean(build?.launch?.target);
}

function statusLabel(build) {
  if (isLaunchable(build)) return "Ready";
  return {
    integration: "Integration queued",
    experimental: "Experimental",
    broken: "Temporarily unavailable"
  }[build?.status] || "Integration queued";
}

function filteredBuilds() {
  let builds = [...state.catalog];

  if (state.view === "home") {
    builds = builds.filter((b) => b.id !== state.featuredId);
  } else if (state.view === "favorites") {
    builds = builds.filter((b) => state.favorites.has(b.id));
  } else if (state.view === "recent") {
    builds = state.recent.map((id) => state.catalog.find((b) => b.id === id)).filter(Boolean);
  } else if (state.view !== "all") {
    builds = builds.filter((b) => b.category === state.view);
  }

  const q = state.query.trim().toLowerCase();
  if (q) {
    builds = builds.filter((b) =>
      [b.name, b.version, b.category, b.description, ...(b.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  return builds;
}

function renderHero() {
  const build = state.catalog.find((b) => b.id === state.featuredId) || state.catalog[0];
  if (!build) return;

  $("#heroEyebrow").textContent = "Featured " + categoryLabel(build.category);
  $("#heroTitle").textContent = build.name;
  $("#heroDescription").textContent = build.description;
  $("#heroMeta").innerHTML = [
    build.version,
    categoryLabel(build.category),
    build.engine,
    statusLabel(build)
  ].map((text) => `<span class="chip">${escapeHtml(text)}</span>`).join("");

  const hero = $("#hero");
  hero.style.backgroundImage = build.art
    ? `linear-gradient(90deg,rgba(4,4,4,.92),rgba(4,4,4,.15)),url("${cssUrl(build.art)}")`
    : "";

  const launch = $("#heroLaunch");
  launch.disabled = !isLaunchable(build);
  launch.textContent = isLaunchable(build) ? "Launch" : "Coming soon";
  launch.onclick = () => launchBuild(build);

  $("#heroDetails").onclick = () => openDetails(build.id);
}

function renderGrid() {
  const builds = filteredBuilds();
  const [eyebrow, title] = viewNames[state.view] || viewNames.all;
  $("#viewEyebrow").textContent = eyebrow;
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
        <p class="card-description">${escapeHtml(build.description)}</p>
        <div class="card-footer">
          <span>${escapeHtml(build.engine || "Web")}</span>
          <span class="launch-status ${isLaunchable(build) ? "ready" : ""}">${escapeHtml(statusLabel(build))}</span>
        </div>
      </div>`;

    card.addEventListener("click", (event) => {
      if (event.target.closest(".favorite-button")) return;
      openDetails(build.id);
    });

    card.querySelector(".favorite-button").addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(build.id);
    });

    grid.appendChild(card);
  }
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  renderGrid();
  if (window.innerWidth <= 820) $("#sidebar").classList.remove("open");
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();
  renderGrid();
  if (state.selectedId === id && dialog.open) renderDialog(id);
}

function openDetails(id) {
  state.selectedId = id;
  renderDialog(id);
  if (!dialog.open) dialog.showModal();
}

function renderDialog(id) {
  const build = state.catalog.find((b) => b.id === id);
  if (!build) return;

  $("#dialogEyebrow").textContent = categoryLabel(build.category) + " · " + build.version;
  $("#dialogTitle").textContent = build.name;
  $("#dialogDescription").textContent = build.description;
  $("#dialogCover").style.backgroundImage = build.art ? `url("${cssUrl(build.art)}")` : "";
  $("#dialogChips").innerHTML = (build.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("");
  $("#dialogFacts").innerHTML = `
    <div class="fact"><div class="fact-label">Version</div><div class="fact-value">${escapeHtml(build.version)}</div></div>
    <div class="fact"><div class="fact-label">Engine</div><div class="fact-value">${escapeHtml(build.engine || "Web")}</div></div>
    <div class="fact"><div class="fact-label">Status</div><div class="fact-value">${escapeHtml(statusLabel(build))}</div></div>`;

  const launch = $("#dialogLaunch");
  launch.disabled = !isLaunchable(build);
  launch.textContent = isLaunchable(build) ? "Launch" : "Coming soon";
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
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function randomBuild() {
  const pool = filteredBuilds();
  if (!pool.length) return;
  openDetails(pool[Math.floor(Math.random() * pool.length)].id);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
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
  } catch (error) {
    console.error(error);
    state.catalog = [];
    showToast("Catalog failed to load.");
  }

  $("#allCount").textContent = state.catalog.length;
  $("#favoriteCount").textContent = state.favorites.size;
  renderHero();
  renderGrid();
}

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view));
});

$("#searchInput").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderGrid();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
    event.preventDefault();
    $("#searchInput").focus();
  }
  if (event.key === "Escape") $("#sidebar").classList.remove("open");
});

$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#randomButton").addEventListener("click", randomBuild);
$("#dialogClose").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

loadCatalog();


if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Monarch service worker registration failed:", error);
    });
  });
}
