const state = {
  catalog: [],
  selectedId: null,
  view: "home"
};

const $ = (selector) => document.querySelector(selector);

function isLaunchable(build) {
  return Boolean(build?.launch?.target);
}

function visibleBuilds() {
  if (state.view === "home") return state.catalog;
  return state.catalog.filter((build) => build.category === state.view);
}

function selectedBuild() {
  return state.catalog.find((build) => build.id === state.selectedId)
    || visibleBuilds()[0]
    || state.catalog[0]
    || null;
}

function renderSelector() {
  const builds = visibleBuilds();
  const select = $("#buildSelect");

  select.innerHTML = builds.map((build) =>
    `<option value="${escapeAttr(build.id)}">${escapeHtml(build.name)} · ${escapeHtml(build.version)}</option>`
  ).join("");

  if (!builds.some((build) => build.id === state.selectedId)) {
    state.selectedId = builds[0]?.id || state.catalog[0]?.id || null;
  }

  if (state.selectedId) select.value = state.selectedId;
}

function renderHero() {
  const build = selectedBuild();
  if (!build) return;

  state.selectedId = build.id;

  $("#heroVersion").textContent = build.version || "";
  $("#heroTitle").textContent = build.name || "Minecraft";
  $("#heroDescription").textContent = build.description || "Choose a build and play.";

  const hero = $("#hero");
  hero.classList.toggle("has-art", Boolean(build.art));
  hero.style.backgroundImage = build.art ? `url("${cssUrl(build.art)}")` : "";

  const play = $("#playButton");
  play.disabled = !isLaunchable(build);
  play.textContent = isLaunchable(build) ? "PLAY" : "COMING SOON";
  play.onclick = () => launchBuild(build);
}

function setView(view) {
  state.view = view;

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });

  renderSelector();
  renderHero();

  if (window.innerWidth <= 760) {
    $("#sidebar").classList.remove("open");
  }
}

function launchBuild(build) {
  if (!isLaunchable(build)) {
    showToast("This build is not connected yet.");
    return;
  }

  if (build.launch.mode === "new-tab") {
    window.open(build.launch.target, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = build.launch.target;
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
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
    if (!response.ok) throw new Error("Catalog failed");

    const data = await response.json();
    state.catalog = Array.isArray(data.builds) ? data.builds : [];
    state.selectedId = data.featured || state.catalog[0]?.id || null;
  } catch (error) {
    console.error(error);
    showToast("Catalog failed to load.");
  }

  renderSelector();
  renderHero();
}

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view));
});

$("#buildSelect").addEventListener("change", (event) => {
  state.selectedId = event.target.value;
  renderHero();
});

$("#mobileMenu").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

$("#libraryTab").addEventListener("click", () => {
  setView("home");
  $("#buildSelect").focus();
});

loadCatalog();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?monarch=4").catch(() => {});
  });
}
