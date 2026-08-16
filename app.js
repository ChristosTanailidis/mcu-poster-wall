(function () {
  "use strict";

  // iOS Safari (especially launched from the home-screen icon) can restore
  // the page already scrolled a few px past the top, which hides the sticky
  // header behind the status bar until the user drags down. Force it back.
  function pinToTop() { if (window.scrollY !== 0) window.scrollTo(0, 0); }
  pinToTop();
  window.addEventListener("load", pinToTop);
  window.addEventListener("pageshow", pinToTop);

  // Quick "the clock is ticking" splash, shown at most once per hour so it
  // never spams a user who has the tab open/reopens it repeatedly.
  (function initLoadingSplash() {
    const SPLASH_KEY = "mcu-poster-wall-last-splash-v1";
    const HOUR_MS = 60 * 60 * 1000;
    const last = Number(localStorage.getItem(SPLASH_KEY)) || 0;
    if (Date.now() - last < HOUR_MS) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      localStorage.setItem(SPLASH_KEY, String(Date.now()));
      return;
    }
    const splash = document.getElementById("splash-overlay");
    splash.hidden = false;
    requestAnimationFrame(() => splash.classList.add("show"));
    // Held long enough for the mask-in + caption + embers to actually play
    // out (see the splash-* keyframes in styles.css) rather than getting
    // cut off mid-animation — still a single brief flash overall.
    setTimeout(() => {
      splash.classList.remove("show");
      setTimeout(() => { splash.hidden = true; }, 350);
    }, 1500);
    localStorage.setItem(SPLASH_KEY, String(Date.now()));
  })();

  const TYPE_LABEL = {
    "Movie": "Movie", "TV Series": "TV", "Mini-Series": "Mini",
    "Special": "Special", "Animated Short": "Short", "One-Shot": "1-Shot"
  };
  const TYPE_TINT = {
    "Movie": "#3e6b99", "TV Series": "#7a4c6b", "Mini-Series": "#8e6b3e",
    "Special": "#4c7a6b", "Animated Short": "#6b7a3e", "One-Shot": "#6b6b6b"
  };
  const PRIORITY_VAR = { "Essential": "--seal-red", "Recommended": "--accent", "Completionist": "--moss" };
  // Infinity Stones easter egg (see the tap handler near playSnapAnimation)
  // — canon MCU stone colors, tapped into existence one at a time.
  const INFINITY_STONES = [
    { name: "Space", color: "#2f7fe0" },
    { name: "Mind", color: "#e0c72f" },
    { name: "Reality", color: "#d4141c" },
    { name: "Power", color: "#7a2fe0" },
    { name: "Time", color: "#2fae5c" },
    { name: "Soul", color: "#e08a2f" }
  ];
  const TYPE_GROUP = {
    "Movie": "Movies",
    "TV Series": "TV Series", "Mini-Series": "TV Series",
    "Special": "Specials", "One-Shot": "Specials", "Animated Short": "Specials"
  };
  // Avengers: Doomsday is the destination, not a checklist item — the whole
  // point is to finish everything *before* it, so it's excluded from every
  // progress/stats percentage (but still shows normally in the grid/list).
  const DOOMSDAY_ID = 83;
  function statsPool() { return MOVIES.filter(m => m.id !== DOOMSDAY_ID); }

  const APP_VERSION = "1.4.0";
  // Mirrors CHANGELOG.json on GitHub; used only if the live fetch fails
  // (offline, or CHANGELOG.json hasn't caught up with this deploy yet).
  const CHANGELOG_FALLBACK = [
    {
      "version": "1.4.0",
      "date": "2026-08-17",
      "changes": [
        "Grid cards: the title + priority dot now sit under the poster with no card of their own, instead of an overlay caption — long-press a card to toggle watched without opening it, and the hover lift animation is gone.",
        "Fixed long-press-to-toggle-watched not working on iPhone — it was losing the gesture to Safari's own long-press-on-image share menu.",
        "List view: swipe direction flipped to match the grid's gesture language (swipe left to mark watched, right to hide), badges now match the grid's styling, and watched rows no longer dim.",
        "Stats: added an Items/Hours toggle, and hidden titles now show as an explicit locked slice on the rings instead of silently vanishing from the %.",
        "Avengers: Doomsday no longer counts toward the watched % or the 100% milestone — it's the destination, not a checklist item.",
        "Fixed a bug where dragging from the bottom of an open dialog scrolled the page behind it instead of closing it.",
        "The detail view's timeline now shows every title matching your current filters, not just a handful around the current one.",
        "Priority badges are now flat (tinted background, no border) instead of outlined; removed the app title's glow and red border.",
        "Redesigned the once-an-hour loading flash around the Doctor Doom mask instead of a plain clock icon.",
        "Two new easter eggs: tap the Infinity War poster to loot each Infinity Stone, or hold the Endgame poster for \"I am Iron Man\" — a repulsor glow and Tony's own snap, with a small hint marker so it's discoverable.",
        "Split the single-file app into index.html/styles.css/movies-data.js/app.js for easier maintenance — same static deploy, no build step."
      ]
    },
    {
      "version": "1.3.0",
      "date": "2026-08-15",
      "changes": [
        "Fixed the iOS 26 \"Liquid Glass\" status bar still overlaying the Home Screen app header — the earlier fix wasn't enough on the newest iOS.",
        "Detail view: added a trailer button, Rotten Tomatoes-style critic/audience score icons, a synopsis for every title, and a prev/next watch-order timeline of clickable posters.",
        "List view: poster art now fades into a color pulled from the poster itself instead of a flat background.",
        "Fixed the watched/hide buttons overlapping with no gap on mobile list rows.",
        "Removed the redundant hover info panel on grid tiles — the detail view already covers it.",
        "Added VisionQuest, Marvel Zombies season 2, and Your Friendly Neighborhood Spider-Man season 2; refreshed The Punisher: One Last Kill now that it's released.",
        "Replaced most poster art with higher-resolution official art, including proper portrait covers for TV/mini-series/specials that were using landscape stills."
      ]
    },
    {
      "version": "1.2.0",
      "date": "2026-08-15",
      "changes": [
        "Tap a poster or list row to open a fullscreen detail view — big art, Doomsday meter, RT scores, and full notes.",
        "Added a fullscreen \"Time Watched\" view (tap the watched count) — watched vs. remaining, broken down by priority and by type.",
        "You can now hide titles you don't want to see, with a new Hidden filter to review or restore them.",
        "Replaced the Table view with a mobile-friendly List view — swipe right to mark watched, swipe left to hide.",
        "Reworked the visual theme to actually look like Marvel: black/red header, bold title treatment, red used consistently for primary actions.",
        "Fixed the iOS Home Screen app header being hidden under the status bar overlay on the newest iOS."
      ]
    },
    {
      "version": "1.1.0",
      "date": "2026-08-12",
      "changes": [
        "Filters (type, priority, watched status, sort, search) now persist between visits.",
        "Type filter simplified to Movies / TV Series / Specials, and now supports picking several at once.",
        "On mobile, the filters panel now floats over the poster grid instead of pushing it down.",
        "Unified sizing and behavior across all filter controls.",
        "Reclaimed wasted space in the search bar and toolbar.",
        "Fixed an iOS Safari bug where the top bar could be hidden until you scrolled.",
        "Added this changelog — you'll see what's new here whenever a new version ships."
      ]
    },
    {
      "version": "1.0.0",
      "date": "2026-08-07",
      "changes": [
        "Initial release: poster grid and table view, search, filters, sort, and per-device watched-progress tracking."
      ]
    }
  ];
  const CHANGELOG_URL = "https://raw.githubusercontent.com/ChristosTanailidis/mcu-poster-wall/main/CHANGELOG.json";
  const CHANGELOG_SEEN_KEY = "mcu-poster-wall-changelog-seen-v1";

  function compareVersions(a, b) {
    const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0, nb = pb[i] || 0;
      if (na !== nb) return na - nb;
    }
    return 0;
  }

  const STORE_KEY = "tva-sacred-timeline-watchlist-v1";
  function loadWatched() {
    try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY)) || []); }
    catch (e) { return new Set(); }
  }
  function saveWatched(set) {
    localStorage.setItem(STORE_KEY, JSON.stringify([...set]));
  }
  let watched = loadWatched();

  const HIDDEN_KEY = "mcu-poster-wall-hidden-v1";
  function loadHidden() {
    try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []); }
    catch (e) { return new Set(); }
  }
  function saveHidden(set) {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
  }
  let hidden = loadHidden();

  function readableRuntime(min) {
    if (min == null) return "—";
    if (min < 60) return min + "m";
    if (min < 1440) {
      const h = Math.floor(min / 60), m = min % 60;
      return h + "h" + (m ? " " + m + "m" : "");
    }
    const d = Math.floor(min / 1440), rem = min % 1440;
    const h = Math.floor(rem / 60), m = rem % 60;
    let out = d + "d";
    if (h) out += " " + h + "h";
    if (m) out += " " + m + "m";
    return out;
  }
  function doomsdayColor(pct) {
    if (pct == null) return "rgba(255,255,255,0.3)";
    if (pct >= 80) return "var(--seal-red)";
    if (pct >= 50) return "var(--accent)";
    if (pct >= 20) return "#d4a017";
    return "var(--moss)";
  }
  function formatReleaseDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  function escapeHTML(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  const CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8.5L6.2 12L13 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const HIDE_SVG = '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 8s2.3-4.5 6-4.5S14 8 14 8s-2.3 4.5-6 4.5S2 8 2 8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="8" r="1.7" stroke="currentColor" stroke-width="1.5"/><path d="M2.3 2.3l11.4 11.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  function tileHTML(m) {
    const posterFile = POSTER_FILES[m.id];
    const isWatched = watched.has(m.id);
    const isHidden = hidden.has(m.id);
    const priorityVar = m.priority ? PRIORITY_VAR[m.priority] : null;
    const priorityColor = priorityVar ? `var(${priorityVar})` : "rgba(255,255,255,0.25)";
    const typeLabel = TYPE_LABEL[m.type] || m.type;

    const artHTML = posterFile
      ? `<img class="poster-bg" src="${posterFile}" alt="" aria-hidden="true" loading="lazy" draggable="false">
         <img class="poster-fg" src="${posterFile}" alt="${escapeHTML(m.title)} poster" loading="lazy" draggable="false">`
      : `<div class="fallback-title">${escapeHTML(m.title)}</div>`;

    return `
    <article class="tile" data-id="${m.id}" tabindex="0">
      <div class="tile-art${posterFile ? "" : " no-art"}" style="background:${TYPE_TINT[m.type] || "#555"};">
        ${artHTML}
        <span class="chip type">${typeLabel}</span>
        <button type="button" class="watch-toggle${isWatched ? " watched" : ""}" data-action="toggle" aria-pressed="${isWatched}" aria-label="${isWatched ? "Mark unwatched" : "Mark watched"}">
          ${CHECK_SVG}
        </button>
        <button type="button" class="hide-toggle${isHidden ? " is-hidden" : ""}" data-action="hide" aria-pressed="${isHidden}" aria-label="${isHidden ? "Unhide" : "Hide from my list"}">
          ${HIDE_SVG}
        </button>
      </div>
      <div class="tile-title-row">
        <span class="tile-priority-dot" style="background:${priorityColor}"></span>
        <span class="tile-title">${escapeHTML(m.title)}</span>
      </div>
    </article>`;
  }

  function listRowHTML(m) {
    const posterFile = POSTER_FILES[m.id];
    const isWatched = watched.has(m.id);
    const isHidden = hidden.has(m.id);
    const priorityVar = m.priority ? PRIORITY_VAR[m.priority] : null;
    const priorityColor = priorityVar ? `var(${priorityVar})` : "rgba(255,255,255,0.75)";
    const typeLabel = TYPE_LABEL[m.type] || m.type;
    const bgHTML = posterFile
      ? `<img class="list-row-bg" src="${posterFile}" alt="" loading="lazy" draggable="false">`
      : `<div class="list-row-bg" style="background:${TYPE_TINT[m.type] || "#555"}"></div>`;

    return `
    <div class="list-row${isWatched ? " is-watched" : ""}" data-id="${m.id}">
      <div class="swipe-bg watch">${isWatched ? "Unwatch" : "Watched"}</div>
      <div class="swipe-bg hide">${isHidden ? "Unhide" : "Hide"}</div>
      <div class="list-row-content">
        ${bgHTML}
        <div class="list-row-scrim"></div>
        <div class="list-row-info">
          <div class="list-row-title">${escapeHTML(m.title)}</div>
          <div class="list-row-meta">
            <span class="list-type-chip" style="background:${TYPE_TINT[m.type] || "#555"}">${typeLabel}</span>
            ${m.priority ? `<span class="list-priority"><span class="tile-priority-dot" style="background:${priorityColor}"></span>${m.priority}</span>` : ""}
            <span>${readableRuntime(m.runtime)}</span>
          </div>
        </div>
        <button type="button" class="watch-toggle${isWatched ? " watched" : ""}" data-action="toggle" aria-pressed="${isWatched}" aria-label="${isWatched ? "Mark unwatched" : "Mark watched"}">
          ${CHECK_SVG}
        </button>
        <button type="button" class="hide-toggle${isHidden ? " is-hidden" : ""}" data-action="hide" aria-pressed="${isHidden}" aria-label="${isHidden ? "Unhide" : "Hide from my list"}">
          ${HIDE_SVG}
        </button>
      </div>
    </div>`;
  }

  const state = { q: "", types: new Set(), watch: "all", priorities: new Set(), sort: "chrono", view: "grid" };

  function applyFilters() {
    return MOVIES.filter(m => {
      if (state.watch === "hidden") {
        if (!hidden.has(m.id)) return false;
      } else if (hidden.has(m.id)) {
        return false;
      }
      if (state.types.size > 0 && !state.types.has(TYPE_GROUP[m.type])) return false;
      if (state.priorities.size > 0 && !state.priorities.has(m.priority)) return false;
      if (state.watch === "watched" && !watched.has(m.id)) return false;
      if (state.watch === "unwatched" && watched.has(m.id)) return false;
      if (state.q) {
        const hay = (m.title + " " + m.notes).toLowerCase();
        if (!hay.includes(state.q)) return false;
      }
      return true;
    });
  }

  function sortList(list) {
    const arr = list.slice();
    if (state.sort === "release") arr.sort((a, b) => (a.releaseDate || "9999").localeCompare(b.releaseDate || "9999"));
    else if (state.sort === "doomsday") arr.sort((a, b) => (b.doomsday ?? -1) - (a.doomsday ?? -1));
    else if (state.sort === "rt") arr.sort((a, b) => (b.rtCritics ?? -1) - (a.rtCritics ?? -1));
    else if (state.sort === "priority") {
      const rank = { "Essential": 0, "Recommended": 1, "Completionist": 2 };
      arr.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || a.id - b.id);
    } else if (state.sort === "title") {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }
    // "chrono" needs no sort: MOVIES is already in chronological order.
    return arr;
  }

  const grid = document.getElementById("grid");
  const listWrap = document.getElementById("list-wrap");
  const emptyState = document.getElementById("empty-state");

  function render() {
    const list = sortList(applyFilters());
    if (state.view === "list") {
      grid.hidden = true;
      grid.innerHTML = "";
      listWrap.hidden = false;
      listWrap.innerHTML = list.map(listRowHTML).join("");
      applyListRowColors();
    } else {
      listWrap.hidden = true;
      listWrap.innerHTML = "";
      grid.hidden = false;
      grid.innerHTML = list.map(tileHTML).join("");
      fitPosterImages();
    }
    emptyState.hidden = list.length !== 0;
    updateStats();
  }

  // Landscape source art (mostly TV-show logos) gets letterboxed on top of a
  // blurred cover of the same image, instead of being cropped or matted with
  // a flat color, since cover-cropping cuts off titles on anything wider than tall.
  function fitPosterImages() {
    grid.querySelectorAll(".tile img.poster-fg").forEach(img => {
      const check = () => {
        if (img.naturalWidth && img.naturalHeight && img.naturalWidth / img.naturalHeight > 1.05) {
          img.classList.add("is-landscape");
        }
      };
      if (img.complete) check();
      else img.addEventListener("load", check, { once: true });
    });
  }

  // Averages a poster's pixels (downsampled) to get its "most matched"
  // color — used for the list view's row background and the detail
  // modal's hero gradient. Cached per src so repeated renders/opens don't
  // re-sample the same image.
  const dominantColorCache = new Map();
  function sampleDominantColor(img, onReady) {
    const src = img.getAttribute("src");
    if (dominantColorCache.has(src)) { onReady(dominantColorCache.get(src)); return; }
    const sample = () => {
      let color = null;
      try {
        const size = 16;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        if (n) color = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
      } catch (e) {
        color = null; // canvas can throw on file:// in some browsers; fall back silently
      }
      dominantColorCache.set(src, color);
      onReady(color);
    };
    if (img.complete && img.naturalWidth) sample();
    else img.addEventListener("load", sample, { once: true });
  }
  // All three take/return plain {r,g,b} objects — only rgbCss() ever
  // produces a CSS string, so there's one unambiguous place that happens
  // (mixing the two up previously left a gradient silently invalid).
  function rgbCss(c) { return `rgb(${c.r}, ${c.g}, ${c.b})`; }
  // Resolves a CSS custom property to its live {r,g,b}, theme included —
  // used so the hero gradient's dark end can match the page background
  // exactly (a shaded copy of the poster color never quite matches it,
  // which left a visible seam where the gradient met the flat page bg).
  function cssVarRgb(name) {
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;visibility:hidden;color:var(${name})`;
    document.body.appendChild(probe);
    const [r, g, b] = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
    probe.remove();
    return { r, g, b };
  }
  function mixRgb(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  function applyListRowColors() {
    listWrap.querySelectorAll("img.list-row-bg").forEach(img => {
      const rowContent = img.closest(".list-row-content");
      sampleDominantColor(img, color => { if (color) rowContent.style.background = rgbCss(color); });
    });
  }

  function updateStats() {
    const pool = statsPool();
    const visible = pool.filter(m => !hidden.has(m.id));
    const hiddenCount = pool.length - visible.length;
    const watchedN = visible.filter(m => watched.has(m.id)).length;
    document.getElementById("total-count").textContent = visible.length;
    document.getElementById("watched-count").textContent = watchedN;
    const pct = visible.length ? Math.round((watchedN / visible.length) * 100) : 0;

    // The ring's watched/hidden arcs are fractions of the FULL pool
    // (including hidden titles), not just visible — that keeps them
    // consistent with the displayed % (still visible-only): once every
    // visible title is watched, the "remaining" arc is naturally 0 no
    // matter how many are hidden, instead of the two disagreeing.
    const total = pool.length || 1;
    const ring = document.getElementById("progress-ring");
    ring.style.setProperty("--pct", pct);
    ring.style.setProperty("--watched-frac", (watchedN / total) * 100);
    ring.style.setProperty("--hidden-frac", (hiddenCount / total) * 100);
    document.getElementById("progress-ring-pct").textContent = pct + "%";
    // The locked (muted) ring segment stays visible on its own — the
    // explanatory text only lives in the Stats dialog now (see
    // renderStats' hiddenNote) so the header doesn't grow a second line.
    ring.title = hiddenCount ? `${hiddenCount} hidden — excluded from this %` : "";
    updateFilterBadge();
    checkProgressMilestones(pct);
  }

  // ---------- easter eggs: progress milestones, watch pulse, snap ----------
  function prefersReducedMotion() {
    return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function pulseWatchButton(btn) {
    if (!btn || prefersReducedMotion()) return;
    btn.classList.remove("just-watched");
    void btn.offsetWidth;
    btn.classList.add("just-watched");
    btn.addEventListener("animationend", () => btn.classList.remove("just-watched"), { once: true });
  }

  function createFXCanvas() {
    const canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    document.body.appendChild(canvas);
    return canvas;
  }

  function fireConfetti() {
    if (prefersReducedMotion()) return;
    const canvas = createFXCanvas();
    const ctx = canvas.getContext("2d");
    const colors = ["#d4141c", "#e0904a", "#5f7a4f", "#f5f4f2", "#c1611c"];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.4,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      vx: -2 + Math.random() * 4,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * 360,
      vr: -8 + Math.random() * 16,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    let frame = 0;
    const maxFrames = 220;
    (function tick() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (frame < maxFrames) requestAnimationFrame(tick);
      else canvas.remove();
    })();
  }

  function fireDustBurst() {
    if (prefersReducedMotion()) return;
    const canvas = createFXCanvas();
    const ctx = canvas.getContext("2d");
    const colors = ["#e7c66b", "#caa768", "#8a8578", "#d9c98a", "#b98f4a"];
    const particles = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height * 0.15 + Math.random() * canvas.height * 0.7,
      r: 1.5 + Math.random() * 2.5,
      vx: -0.6 + Math.random() * 1.2,
      vy: -1.2 - Math.random() * 1.6,
      life: 0,
      maxLife: 60 + Math.random() * 40,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    let frame = 0;
    const maxFrames = 110;
    (function tick() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.life++;
        p.x += p.vx; p.y += p.vy; p.vy -= 0.01;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (frame < maxFrames) requestAnimationFrame(tick);
      else canvas.remove();
    })();
  }

  function playDoomAnimation() {
    if (prefersReducedMotion()) return;
    const overlay = document.getElementById("doom-overlay");
    overlay.classList.add("show");
    const dismiss = () => overlay.classList.remove("show");
    overlay.addEventListener("click", dismiss, { once: true });
    setTimeout(dismiss, 4200);
  }

  function playSnapAnimation() {
    if (prefersReducedMotion()) return;
    const overlay = document.getElementById("snap-overlay");
    const flash = document.getElementById("snap-flash");
    overlay.classList.add("show");
    flash.classList.remove("flash");
    void flash.offsetWidth;
    flash.classList.add("flash");
    setTimeout(fireDustBurst, 280);
    const dismiss = () => overlay.classList.remove("show");
    overlay.addEventListener("click", dismiss, { once: true });
    setTimeout(dismiss, 2600);
  }

  // Easter egg: hold the Endgame poster — the good guys win here, so this
  // gets its own bigger, brighter, red/gold-and-arc-reactor sequence
  // instead of reusing the (deliberately somber) Thanos snap treatment.
  // Charge (repulsor-ripple, right on the poster) -> flash -> full-screen
  // gauntlet + burst + quote.
  function fireRepulsorRipple() {
    if (prefersReducedMotion()) return;
    const ripple = document.getElementById("repulsor-ripple");
    ripple.classList.remove("fire");
    void ripple.offsetWidth;
    ripple.classList.add("fire");
  }

  function playIronManAnimation() {
    if (prefersReducedMotion()) return;
    const overlay = document.getElementById("ironman-overlay");
    const flash = document.getElementById("ironman-flash");
    overlay.classList.add("show");
    flash.classList.remove("flash");
    void flash.offsetWidth;
    flash.classList.add("flash");
    setTimeout(() => fireRepulsorBurst(innerWidth / 2, innerHeight * 0.42), 160);
    const dismiss = () => overlay.classList.remove("show");
    overlay.addEventListener("click", dismiss, { once: true });
    setTimeout(dismiss, 2900);
  }

  // Bigger, faster, and brighter than fireDustBurst on purpose — a
  // repulsor detonation instead of a slow disintegration. Red/gold for
  // the suit, cyan-white for the arc reactor.
  function fireRepulsorBurst(x, y) {
    if (prefersReducedMotion()) return;
    const canvas = createFXCanvas();
    const ctx = canvas.getContext("2d");
    const colors = ["#ff3b30", "#ff8c1a", "#ffd580", "#eafcff", "#7fd8ff"];
    const particles = Array.from({ length: 140 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.5 + Math.random() * 3,
        life: 0,
        maxLife: 45 + Math.random() * 35,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });
    let frame = 0;
    const maxFrames = 100;
    (function tick() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.life++;
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.94; p.vy *= 0.94;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (frame < maxFrames) requestAnimationFrame(tick);
      else canvas.remove();
    })();
  }

  // Fires only on an *increase* that crosses a threshold, and never on the
  // very first call (page load), so restoring existing progress from
  // localStorage doesn't replay every milestone at once.
  let lastKnownPct = null;
  function checkProgressMilestones(pct) {
    if (lastKnownPct === null) { lastKnownPct = pct; return; }
    if (pct > lastKnownPct) {
      if (pct >= 100 && lastKnownPct < 100) {
        playDoomAnimation();
      } else {
        for (const m of [25, 50, 75]) {
          if (lastKnownPct < m && pct >= m) { fireConfetti(); break; }
        }
      }
    }
    lastKnownPct = pct;
  }

  function updateFilterBadge() {
    const count = state.types.size + state.priorities.size + (state.watch !== "all" ? 1 : 0);
    const badge = document.getElementById("filter-count");
    badge.textContent = count;
    badge.hidden = count === 0;
  }

  document.getElementById("filters-toggle").addEventListener("click", () => {
    const panel = document.getElementById("filters-panel");
    const btn = document.getElementById("filters-toggle");
    const nowOpen = !panel.classList.contains("open");
    panel.classList.toggle("open", nowOpen);
    btn.setAttribute("aria-expanded", nowOpen);
  });

  const FILTERS_KEY = "mcu-poster-wall-filters-v1";
  function saveFilters() {
    localStorage.setItem(FILTERS_KEY, JSON.stringify({
      q: state.q,
      types: [...state.types],
      priorities: [...state.priorities],
      watch: state.watch,
      sort: state.sort
    }));
  }

  document.getElementById("q").addEventListener("input", e => {
    state.q = e.target.value.trim().toLowerCase();
    saveFilters();
    render();
  });
  document.getElementById("type-filter").addEventListener("click", e => {
    const btn = e.target.closest("button[data-val]");
    if (!btn) return;
    const val = btn.dataset.val;
    const nowOn = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", nowOn);
    if (nowOn) state.types.add(val); else state.types.delete(val);
    saveFilters();
    render();
  });
  document.getElementById("priority-filter").addEventListener("click", e => {
    const btn = e.target.closest("button[data-val]");
    if (!btn) return;
    const val = btn.dataset.val;
    const nowOn = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", nowOn);
    if (nowOn) state.priorities.add(val); else state.priorities.delete(val);
    saveFilters();
    render();
  });
  document.getElementById("watch-toggle-group").addEventListener("click", e => {
    const btn = e.target.closest("button[data-val]");
    if (!btn) return;
    state.watch = btn.dataset.val;
    [...btn.parentElement.children].forEach(b => b.setAttribute("aria-pressed", b === btn));
    saveFilters();
    render();
  });
  document.getElementById("f-sort").addEventListener("change", e => {
    state.sort = e.target.value;
    saveFilters();
    render();
  });
  document.getElementById("clear-filters").addEventListener("click", () => {
    state.types.clear();
    state.priorities.clear();
    state.watch = "all";
    document.querySelectorAll("#type-filter button, #priority-filter button").forEach(b => b.setAttribute("aria-pressed", "false"));
    const watchGrp = document.getElementById("watch-toggle-group");
    [...watchGrp.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.val === "all")));
    saveFilters();
    render();
  });

  const VIEW_KEY = "mcu-poster-wall-view-v1";
  document.getElementById("view-toggle-group").addEventListener("click", e => {
    const btn = e.target.closest("button[data-val]");
    if (!btn) return;
    state.view = btn.dataset.val;
    [...btn.parentElement.children].forEach(b => b.setAttribute("aria-pressed", b === btn));
    localStorage.setItem(VIEW_KEY, state.view);
    render();
  });

  function toggleWatched(id) {
    if (watched.has(id)) watched.delete(id); else watched.add(id);
    saveWatched(watched);
    return watched.has(id);
  }
  function toggleHidden(id) {
    if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
    saveHidden(hidden);
    return hidden.has(id);
  }

  // Shared by the watch-toggle button click and the grid's long-press
  // shortcut (initTileLongPress below) — both need the same button-visual
  // + stats + conditional-re-render sequence, just triggered differently.
  function toggleWatchedUI(item, id) {
    const watchBtn = item.querySelector(".watch-toggle");
    const nowWatched = toggleWatched(id);
    if (watchBtn) {
      watchBtn.classList.toggle("watched", nowWatched);
      watchBtn.setAttribute("aria-pressed", nowWatched);
    }
    item.classList.toggle("is-watched", nowWatched);
    if (nowWatched && watchBtn) pulseWatchButton(watchBtn);
    updateStats();
    if (state.watch !== "all") setTimeout(render, 200);
  }

  function handleWatchOrExpandClick(e) {
    const watchBtn = e.target.closest(".watch-toggle");
    const hideBtn = e.target.closest(".hide-toggle");
    const item = e.target.closest("[data-id]");
    if (!item) return;
    const id = Number(item.dataset.id);

    if (watchBtn) {
      toggleWatchedUI(item, id);
      return;
    }
    if (hideBtn) {
      const nowHidden = toggleHidden(id);
      hideBtn.classList.toggle("is-hidden", nowHidden);
      hideBtn.setAttribute("aria-pressed", nowHidden);
      updateStats();
      setTimeout(render, 200);
      return;
    }
    // tap on a poster tile or list row (not on an action button) opens the fullscreen detail view
    if (item.classList.contains("tile") || item.classList.contains("list-row")) {
      openDetailView(id);
    }
  }
  grid.addEventListener("click", handleWatchOrExpandClick);
  listWrap.addEventListener("click", handleWatchOrExpandClick);

  // ---------- grid long-press: hold a tile to toggle watched instead of opening it ----------
  (function initTileLongPress() {
    const HOLD_MS = 500;
    // Real touch input jitters — a finger held "still" for half a second
    // routinely drifts 10-15px on its own. A tight cancel threshold here
    // was reading that drift as an intentional move, cancelling the hold,
    // and letting the touch fall through as a normal tap that opened the
    // detail view instead of toggling watched.
    const MOVE_CANCEL_PX = 20;
    let press = null;
    let justHeld = false;

    // Cancels an *incomplete* hold (timer hasn't fired yet) — once the
    // hold has actually completed (press.held), further movement is a
    // no-op: the toggle already happened, and the eventual release still
    // needs to swallow its trailing click regardless of how the finger
    // wanders afterward.
    function cancelIfNotHeld() {
      if (!press || press.held) return;
      clearTimeout(press.timer);
      press.tile.classList.remove("pressing");
      press = null;
    }

    // Runs on the *actual* release (pointerup/pointercancel), whenever
    // that turns out to be — not on a fixed delay from when the hold
    // completed. That distinction matters: a deliberate long-press is
    // routinely held well past the 500ms threshold before the finger
    // actually lifts, so a swallow window measured from hold-completion
    // (rather than from release) could easily expire before the trailing
    // click arrives, letting it through and opening the detail view —
    // exactly the bug this replaced.
    function endPress(e) {
      if (!press || press.pointerId !== e.pointerId) return;
      const wasHeld = press.held;
      clearTimeout(press.timer);
      press.tile.classList.remove("pressing");
      press = null;
      if (wasHeld) {
        justHeld = true;
        setTimeout(() => { justHeld = false; }, 400);
      }
    }

    grid.addEventListener("pointerdown", e => {
      if (e.target.closest(".watch-toggle") || e.target.closest(".hide-toggle")) return;
      const tile = e.target.closest(".tile");
      if (!tile) return;
      press = {
        tile,
        id: Number(tile.dataset.id),
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        held: false,
        timer: setTimeout(() => {
          if (!press) return;
          press.held = true;
          press.tile.classList.remove("pressing");
          toggleWatchedUI(press.tile, press.id);
        }, HOLD_MS)
      };
      tile.classList.add("pressing");
    });

    grid.addEventListener("pointermove", e => {
      if (!press || press.pointerId !== e.pointerId) return;
      if (Math.abs(e.clientX - press.startX) > MOVE_CANCEL_PX || Math.abs(e.clientY - press.startY) > MOVE_CANCEL_PX) {
        cancelIfNotHeld();
      }
    });
    grid.addEventListener("pointerup", endPress);
    grid.addEventListener("pointercancel", endPress);

    // A completed long-press still ends in a pointerup, which fires a
    // trailing click — swallow just that one so it doesn't also open the
    // detail view, same technique as the list view's justSwiped flag.
    grid.addEventListener("click", e => {
      if (justHeld) {
        justHeld = false;
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  })();

  // ---------- list-view swipe gestures (swipe right = watched, swipe left = hide) ----------
  (function initListSwipe() {
    const THRESHOLD = 72;
    const MAX_DRAG = 96;
    let dragging = null;
    let justSwiped = false;

    listWrap.addEventListener("pointerdown", e => {
      if (e.target.closest(".watch-toggle") || e.target.closest(".hide-toggle")) return;
      const content = e.target.closest(".list-row-content");
      if (!content) return;
      dragging = {
        row: content.closest(".list-row"), content,
        startX: e.clientX, startY: e.clientY, dx: 0, axis: null,
        id: Number(content.closest(".list-row").dataset.id), pointerId: e.pointerId
      };
    });

    listWrap.addEventListener("pointermove", e => {
      if (!dragging || dragging.pointerId !== e.pointerId) return;
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      if (dragging.axis === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        dragging.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (dragging.axis === "x") {
          dragging.row.classList.add("dragging");
          dragging.content.setPointerCapture(e.pointerId);
        }
      }
      if (dragging.axis !== "x") return;
      e.preventDefault();
      dragging.dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
      dragging.content.style.transform = `translateX(${dragging.dx}px)`;
      dragging.row.querySelector(".swipe-bg.watch").style.opacity = dragging.dx < 0 ? Math.min(1, -dragging.dx / THRESHOLD) : 0;
      dragging.row.querySelector(".swipe-bg.hide").style.opacity = dragging.dx > 0 ? Math.min(1, dragging.dx / THRESHOLD) : 0;
    });

    function endDrag(e) {
      if (!dragging || dragging.pointerId !== e.pointerId) return;
      const { row, content, dx, axis, id } = dragging;
      dragging = null;
      if (axis !== "x") return;
      // Real mouse drags fire a trailing click the capture-phase listener below
      // consumes; touch drags never fire one at all, so this also self-clears
      // on a timer rather than relying solely on that click showing up.
      justSwiped = true;
      setTimeout(() => { justSwiped = false; }, 350);
      row.classList.remove("dragging");
      content.style.transform = "";
      row.querySelectorAll(".swipe-bg").forEach(bg => bg.style.opacity = "");
      if (dx <= -THRESHOLD) {
        toggleWatchedUI(row, id);
      } else if (dx >= THRESHOLD) {
        toggleHidden(id);
        updateStats();
        setTimeout(render, 200);
      }
    }
    listWrap.addEventListener("pointerup", endDrag);
    listWrap.addEventListener("pointercancel", endDrag);

    // A mouse-driven drag still fires a synthetic click on release (unlike
    // touch, which suppresses it natively) — swallow that one click so it
    // doesn't also trigger handleWatchOrExpandClick on the dragged row.
    listWrap.addEventListener("click", e => {
      if (justSwiped) {
        justSwiped = false;
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  })();

  document.addEventListener("click", e => {
    const panel = document.getElementById("filters-panel");
    const toggle = document.getElementById("filters-toggle");
    if (panel.classList.contains("open") && !e.target.closest("#filters-panel") && !e.target.closest("#filters-toggle")) {
      panel.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  const savedView = localStorage.getItem(VIEW_KEY);
  if (savedView === "list" || savedView === "grid") {
    state.view = savedView;
    const grp = document.getElementById("view-toggle-group");
    [...grp.children].forEach(b => b.setAttribute("aria-pressed", b.dataset.val === savedView));
  }

  (function restoreFilters() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(FILTERS_KEY)); } catch (e) { saved = null; }
    if (!saved) return;

    if (typeof saved.q === "string") {
      state.q = saved.q;
      document.getElementById("q").value = saved.q;
    }
    if (Array.isArray(saved.types)) {
      state.types = new Set(saved.types);
      const grp = document.getElementById("type-filter");
      [...grp.children].forEach(b => b.setAttribute("aria-pressed", state.types.has(b.dataset.val)));
    }
    if (Array.isArray(saved.priorities)) {
      state.priorities = new Set(saved.priorities);
      const grp = document.getElementById("priority-filter");
      [...grp.children].forEach(b => b.setAttribute("aria-pressed", state.priorities.has(b.dataset.val)));
    }
    if (saved.watch === "all" || saved.watch === "watched" || saved.watch === "unwatched" || saved.watch === "hidden") {
      state.watch = saved.watch;
      const grp = document.getElementById("watch-toggle-group");
      [...grp.children].forEach(b => b.setAttribute("aria-pressed", b.dataset.val === saved.watch));
    }
    if (typeof saved.sort === "string") {
      state.sort = saved.sort;
      document.getElementById("f-sort").value = saved.sort;
    }
  })();

  render();

  // ---------- stats ----------
  const STAT_COLORS = { "Essential": "var(--seal-red)", "Recommended": "var(--accent)", "Completionist": "var(--moss)" };
  const STATS_METRIC_KEY = "mcu-poster-wall-stats-metric-v1";
  const savedMetric = localStorage.getItem(STATS_METRIC_KEY);
  state.statsMetric = savedMetric === "hours" ? "hours" : "count";

  // Same shape either way (pct + ready-to-render labels), so donutHTML and
  // the by-priority/by-type cards don't need to know which metric is active
  // — "count" weighs every title equally, "hours" weighs by runtime (a
  // 3-hour finale moves the needle more than a 20-minute short).
  function bucketStats(list, metric) {
    if (metric === "hours") {
      const withRuntime = list.filter(m => m.runtime != null);
      const watchedMin = withRuntime.filter(m => watched.has(m.id)).reduce((s, m) => s + m.runtime, 0);
      const totalMin = withRuntime.reduce((s, m) => s + m.runtime, 0);
      const remainingMin = totalMin - watchedMin;
      const pct = totalMin ? Math.round((watchedMin / totalMin) * 100) : 0;
      return {
        pct,
        holeCaption: `${readableRuntime(watchedMin)} watched`,
        watchedLine: `Watched — ${readableRuntime(watchedMin)}`,
        remainingLine: `Remaining — ${readableRuntime(remainingMin)}`,
        unknownCount: list.length - withRuntime.length
      };
    }
    const watchedN = list.filter(m => watched.has(m.id)).length;
    const remainingN = list.length - watchedN;
    const pct = list.length ? Math.round((watchedN / list.length) * 100) : 0;
    return {
      pct,
      holeCaption: `${watchedN} watched`,
      watchedLine: `Watched — ${watchedN}`,
      remainingLine: `Remaining — ${remainingN}`,
      unknownCount: 0
    };
  }

  function donutHTML(label, stats, color, hiddenVars) {
    return `
    <div class="stat-card">
      <div class="stat-card-title">${escapeHTML(label)}</div>
      <div class="donut${hiddenVars ? " with-hidden" : ""}" style="--pct:${stats.pct}; --donut-color:${color};${hiddenVars || ""}">
        <div class="donut-hole">
          <div class="donut-pct">${stats.pct}%</div>
          <div class="donut-hours">${stats.holeCaption}</div>
        </div>
      </div>
      <div class="stat-legend">
        <div><span class="dot" style="background:${color}"></span>${stats.watchedLine}</div>
        <div><span class="dot" style="background:var(--border)"></span>${stats.remainingLine}</div>
      </div>
    </div>`;
  }

  function renderStats() {
    const metric = state.statsMetric;
    const pool = statsPool();
    const visible = pool.filter(m => !hidden.has(m.id));
    const hiddenList = pool.filter(m => hidden.has(m.id));
    const overall = bucketStats(visible, metric);

    // Hidden-items transparency on the Overall donut: fractions of the FULL
    // pool (visible + hidden), same reasoning as the top-right ring in
    // updateStats — keeps the arcs consistent with the visible-only %.
    let watchedFrac, hiddenFrac;
    if (metric === "hours") {
      const withRuntime = pool.filter(m => m.runtime != null);
      const totalMin = withRuntime.reduce((s, m) => s + m.runtime, 0) || 1;
      const watchedMin = withRuntime.filter(m => !hidden.has(m.id) && watched.has(m.id)).reduce((s, m) => s + m.runtime, 0);
      const hiddenMin = withRuntime.filter(m => hidden.has(m.id)).reduce((s, m) => s + m.runtime, 0);
      watchedFrac = (watchedMin / totalMin) * 100;
      hiddenFrac = (hiddenMin / totalMin) * 100;
    } else {
      const total = pool.length || 1;
      watchedFrac = (visible.filter(m => watched.has(m.id)).length / total) * 100;
      hiddenFrac = (hiddenList.length / total) * 100;
    }

    const priorityCards = ["Essential", "Recommended", "Completionist"].map(p =>
      donutHTML(p, bucketStats(visible.filter(m => m.priority === p), metric), STAT_COLORS[p])
    ).join("");

    const typeCards = ["Movies", "TV Series", "Specials"].map(t =>
      donutHTML(t, bucketStats(visible.filter(m => TYPE_GROUP[m.type] === t), metric), "var(--accent)")
    ).join("");

    const hiddenNote = hiddenList.length
      ? `<p class="stats-footnote">${hiddenList.length} hidden title${hiddenList.length === 1 ? "" : "s"} (the muted slice above) — excluded from this %.</p>`
      : "";
    const unknownNote = overall.unknownCount
      ? `<p class="stats-footnote">+${overall.unknownCount} title${overall.unknownCount === 1 ? "" : "s"} with runtime not yet announced — excluded from these totals.</p>`
      : "";

    document.getElementById("stats-body").innerHTML = `
      <div class="stats-section">
        <div class="seg stat-metric-toggle" id="stats-metric-toggle" role="group" aria-label="Show stats by items or hours">
          <button type="button" data-val="count" aria-pressed="${metric === "count"}">Items</button>
          <button type="button" data-val="hours" aria-pressed="${metric === "hours"}">Hours</button>
        </div>
        <div class="stat-grid" style="max-width:220px;margin:0 auto;">
          ${donutHTML("Overall", overall, "var(--moss)", `--watched-frac:${watchedFrac};--hidden-frac:${hiddenFrac};`)}
        </div>
        ${hiddenNote}
        ${unknownNote}
      </div>
      <div class="stats-section">
        <h3 class="stats-section-title">By priority</h3>
        <div class="stat-grid">${priorityCards}</div>
      </div>
      <div class="stats-section">
        <h3 class="stats-section-title">By type</h3>
        <div class="stat-grid">${typeCards}</div>
      </div>
    `;

    document.getElementById("stats-metric-toggle").addEventListener("click", e => {
      const btn = e.target.closest("button[data-val]");
      if (!btn || btn.dataset.val === state.statsMetric) return;
      state.statsMetric = btn.dataset.val;
      localStorage.setItem(STATS_METRIC_KEY, state.statsMetric);
      renderStats();
    });
  }

  const statsView = document.getElementById("stats-view");
  document.getElementById("stats-trigger").addEventListener("click", () => {
    renderStats();
    openFullscreenView(statsView);
  });
  // ---------- movie detail view ----------
  // m.synopsis / m.cast aren't in the data set yet (MOVIES only carries the
  // fields listed in FIELDS above) — these blocks render automatically once
  // that data exists, and are simply omitted until then rather than showing
  // placeholder/fabricated text for real, identifiable titles.
  // Custom tomato/popcorn glyphs in the spirit of Rotten Tomatoes' iconography
  // (red = fresh, green = rotten, gold ring = certified fresh; upright vs.
  // spilled popcorn for audience score) without reusing their trademarked art.
  function trailerSearchURL(title) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " official trailer")}`;
  }
  const RT_DASH_SVG = '<svg viewBox="0 0 24 24"><line x1="6" y1="12" x2="18" y2="12" stroke="var(--ink-muted)" stroke-width="2" stroke-linecap="round"/></svg>';
  function tomatoSVG(score) {
    const fresh = score >= 60;
    const certified = score >= 75;
    const body = fresh ? "#e8402a" : "#7a8f4a";
    const leaf = fresh ? "#2f8a3c" : "#5c6b3a";
    const ring = certified ? '<circle cx="12" cy="14.5" r="9.2" fill="none" stroke="#d8a51c" stroke-width="1.5"/>' : "";
    return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${ring}<path d="M12 8.2c-4.1 0-7.2 3.3-7.2 7.3 0 3.9 3.1 7 7.2 7s7.2-3.1 7.2-7c0-4-3.1-7.3-7.2-7.3Z" fill="${body}"/><path d="M9 6.4c1-1.7 2-2.4 3-2.4s2 .7 3 2.4" stroke="${leaf}" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M12 5.8V4" stroke="${leaf}" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  }
  function popcornSVG(score) {
    const fresh = score >= 60;
    const color = fresh ? "#e8402a" : "#8a8478";
    const tilt = fresh ? "" : ' style="transform:rotate(-24deg);transform-origin:12px 13px"';
    const spillDots = fresh ? "" : '<circle cx="19.5" cy="17" r="1.1" fill="#8a8478"/><circle cx="21.3" cy="13.8" r="0.8" fill="#8a8478"/>';
    return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${spillDots}<g${tilt}><path d="M7 10h10l-1.3 10.6a1 1 0 0 1-1 .9H9.3a1 1 0 0 1-1-.9L7 10Z" fill="${color}"/><path d="M6.2 10h11.6l.3-2a1 1 0 0 0-1-1.2H6.9a1 1 0 0 0-1 1.2l.3 2Z" fill="${color}"/><circle cx="9.3" cy="6" r="1.3" fill="${color}"/><circle cx="12" cy="5" r="1.5" fill="${color}"/><circle cx="14.7" cy="6" r="1.3" fill="${color}"/></g></svg>`;
  }
  function rtScoreHTML(kind, score) {
    const label = kind === "critics" ? "Critics" : "Audience";
    const icon = score == null ? RT_DASH_SVG : kind === "critics" ? tomatoSVG(score) : popcornSVG(score);
    return `<div class="rt-score"><span class="rt-score-icon">${icon}</span><span><span class="rt-score-value">${score != null ? score + "%" : "—"}</span><span class="rt-score-label">${label}</span></span></div>`;
  }

  function timelineItemHTML(item, isCurrent) {
    const posterFile = POSTER_FILES[item.id];
    const art = posterFile
      ? `<img src="${posterFile}" alt="${escapeHTML(item.title)} poster" loading="lazy">`
      : `<div class="dt-fallback" style="background:${TYPE_TINT[item.type] || "#555"}"></div>`;
    return `<button type="button" class="detail-timeline-item${isCurrent ? " current" : ""}" data-id="${item.id}"${isCurrent ? ' aria-current="true"' : ""}>${art}<span class="dt-label">${escapeHTML(item.title)}</span></button>`;
  }

  // Shows the same set of titles the main grid/list would, under whatever
  // filters are currently active there — not just a fixed window around
  // the current movie — so the strip stays a useful "what's next" view
  // even when the user has narrowed things down (e.g. to Essential-only).
  function timelineHTML(m) {
    const items = sortList(applyFilters());
    if (!items.length) return "";
    return `
      <div class="detail-block">
        <h3>Timeline</h3>
        <div class="detail-timeline">${items.map(item => timelineItemHTML(item, item.id === m.id)).join("")}</div>
      </div>`;
  }

  function detailViewHTML(m) {
    const posterFile = POSTER_FILES[m.id];
    const isWatched = watched.has(m.id);
    const isHidden = hidden.has(m.id);
    const priorityVar = m.priority ? PRIORITY_VAR[m.priority] : null;
    const typeLabel = TYPE_LABEL[m.type] || m.type;
    const doomsdayVal = m.doomsday != null ? m.doomsday + "%" : "—";

    const posterTopHTML = posterFile
      ? `<img class="detail-poster-full" src="${posterFile}" alt="${escapeHTML(m.title)} poster" draggable="false">`
      : `<div class="detail-poster-full no-art" style="background:${TYPE_TINT[m.type] || "#555"}">${escapeHTML(m.title)}</div>`;

    // Easter eggs: Infinity Stones live on the Infinity War poster (tap
    // handler near playSnapAnimation), the Iron Man hold on Endgame's
    // (see initIronManHold) — both below.
    const isInfinityWar = m.title === "Avengers: Infinity War";
    const stonesHTML = isInfinityWar
      ? `<div class="infinity-stones" id="infinity-stones" aria-hidden="true">${INFINITY_STONES.map(s => `<span class="stone" style="--stone-color:${s.color}" title="${s.name} Stone"></span>`).join("")}</div>`
      : "";
    const isEndgame = m.title === "Avengers: Endgame";
    const ironManHintHTML = isEndgame
      ? `<div class="ironman-hint" aria-hidden="true" title="Hold the poster...">
           <svg viewBox="0 0 24 24" fill="none">
             <circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="1.4"/>
             <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.2"/>
             <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
           </svg>
         </div>`
      : "";

    const synopsisHTML = m.synopsis ? `
      <div class="detail-block">
        <h3>Synopsis</h3>
        <p>${escapeHTML(m.synopsis)}</p>
      </div>` : "";

    const castHTML = (m.cast && m.cast.length) ? `
      <div class="detail-block">
        <h3>Cast</h3>
        <p>${m.cast.map(escapeHTML).join(" · ")}</p>
      </div>` : "";

    const fallbackTint = TYPE_TINT[m.type] || "#555";

    return `
      <div class="detail-container">
        <div class="detail-color-scope" style="background:${fallbackTint};">
          <div class="detail-hero-wrap">
            <div class="detail-drag-handle sheet-handle" aria-hidden="true"></div>
            <div class="detail-top">
              <div class="detail-poster-wrap">
                ${posterTopHTML}
                ${stonesHTML}
                ${ironManHintHTML}
              </div>
              <div class="detail-info">
                <div class="detail-title-row">
                  <h1 class="detail-movie-title" id="detail-title-head">${escapeHTML(m.title)}</h1>
                  ${m.priority ? `<span class="detail-priority-badge" style="background:var(${priorityVar}-tint);color:var(${priorityVar}-badge-ink)">${m.priority}</span>` : ""}
                </div>
                <div class="detail-type-row">
                  <span class="detail-type-chip">${typeLabel}</span>
                  <span class="detail-type-chip">${escapeHTML(m.format)}</span>
                </div>
                <div class="detail-fact-list">
                  <div class="detail-fact-row set-in"><span class="detail-fact-label">Set in</span><span class="detail-fact-value">${escapeHTML(m.setIn)}</span></div>
                  <div class="detail-fact-row released"><span class="detail-fact-label">Released</span><span class="detail-fact-value">${formatReleaseDate(m.releaseDate)}</span></div>
                  <div class="detail-fact-row runtime"><span class="detail-fact-label">Runtime</span><span class="detail-fact-value">${readableRuntime(m.runtime)}</span></div>
                </div>
              </div>
            </div>
            <a class="detail-trailer-btn" href="${trailerSearchURL(m.title)}" target="_blank" rel="noopener">▶ Watch trailer</a>
            <div class="detail-actions">
              <button type="button" class="detail-action-btn watch${isWatched ? " active" : ""}" data-action="toggle" data-id="${m.id}">${CHECK_SVG}<span>${isWatched ? "Watched" : "Mark watched"}</span></button>
              <button type="button" class="detail-action-btn hide${isHidden ? " active" : ""}" data-action="hide" data-id="${m.id}">${HIDE_SVG}<span>${isHidden ? "Unhide" : "Hide from list"}</span></button>
            </div>
          </div>
          <div class="detail-timeline-wrap">${timelineHTML(m)}</div>
        </div>
        <div class="detail-rest">
          ${synopsisHTML}
          ${castHTML}
          <div class="detail-block">
            <h3>Doomsday relevance</h3>
            <div class="detail-meter">
              <div class="detail-meter-track"><div class="detail-meter-fill" style="width:${m.doomsday ?? 0}%; background:${doomsdayColor(m.doomsday)}"></div></div>
              <span class="mono">${doomsdayVal}</span>
            </div>
          </div>
          <div class="detail-block">
            <h3>Rotten Tomatoes</h3>
            <div class="rt-scores">${rtScoreHTML("critics", m.rtCritics)}${rtScoreHTML("audience", m.rtAudience)}</div>
          </div>
          <div class="detail-block">
            <h3>Post-credits scene</h3>
            <p>${escapeHTML(m.postCredits || "—")}</p>
          </div>
          <div class="detail-block">
            <h3>Why it matters</h3>
            <p>${escapeHTML(m.notes)}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Shared open/close animation for all three bottom-sheet dialogs (stats,
  // movie detail, changelog): slide up from the bottom on open, slide down
  // on close, with a shared dimmed backdrop behind whichever is open. The
  // double rAF forces the browser to paint the pre-open (off-screen) state
  // on its own frame first, otherwise adding "open" on the same frame as
  // removing [hidden] just skips straight to the end state instead of
  // transitioning.
  // Locks the page behind a sheet in place while it's open. Without this,
  // dragging near the bottom of a sheet's own (overscroll-contained) scroll
  // area could still chain into the page behind it once that area hit its
  // scroll boundary — the page would scroll instead of the drag reaching
  // the sheet's dismiss handler at all.
  let bodyScrollY = 0;
  function lockBodyScroll() {
    bodyScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${bodyScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
  }
  function unlockBodyScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    window.scrollTo(0, bodyScrollY);
  }

  const sheetBackdrop = document.getElementById("sheet-backdrop");
  let openSheet = null;
  function openFullscreenView(el) {
    openSheet = el;
    el.style.transform = "";
    el.hidden = false;
    el.classList.remove("open");
    sheetBackdrop.hidden = false;
    lockBodyScroll();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.add("open");
      sheetBackdrop.classList.add("open");
    }));
  }
  function closeFullscreenView(el) {
    if (el._onClose) { el._onClose(); el._onClose = null; }
    el.classList.remove("open", "dragging");
    el.style.transform = "translateY(100%)";
    if (openSheet === el) {
      openSheet = null;
      unlockBodyScroll();
      sheetBackdrop.classList.remove("open");
      const onBackdropEnd = e => {
        if (e.target !== sheetBackdrop || e.propertyName !== "opacity") return;
        sheetBackdrop.hidden = true;
        sheetBackdrop.removeEventListener("transitionend", onBackdropEnd);
      };
      sheetBackdrop.addEventListener("transitionend", onBackdropEnd);
    }
    const onEnd = e => {
      if (e.target !== el || e.propertyName !== "transform") return;
      el.hidden = true;
      el.style.transform = "";
      el.removeEventListener("transitionend", onEnd);
    };
    el.addEventListener("transitionend", onEnd);
  }
  sheetBackdrop.addEventListener("click", () => { if (openSheet) closeFullscreenView(openSheet); });

  // Drag-to-dismiss: pulling down from a sheet's drag zone (its head bar,
  // or the hero for the handle-less detail view) slides it out and closes
  // it, mirroring the open animation in reverse.
  function initDragToDismiss(el, dragZoneSelector) {
    const DISMISS_PX = 120;
    let drag = null;
    el.addEventListener("pointerdown", e => {
      if (el.hidden || !el.classList.contains("open")) return;
      if (!e.target.closest(dragZoneSelector)) return;
      if (e.target.closest("a, button")) return;
      drag = { startY: e.clientY, pointerId: e.pointerId, active: false };
    });
    el.addEventListener("pointermove", e => {
      if (!drag || drag.pointerId !== e.pointerId) return;
      const dy = e.clientY - drag.startY;
      if (dy <= 0) return; // only drag downward; let normal scroll happen otherwise
      if (!drag.active) {
        drag.active = true;
        el.classList.add("dragging");
        el.setPointerCapture(e.pointerId);
      }
      e.preventDefault();
      el.style.transform = `translateY(${dy}px)`;
    });
    function endDrag(e) {
      if (!drag || drag.pointerId !== e.pointerId) return;
      const wasActive = drag.active;
      const dy = Math.max(0, e.clientY - drag.startY);
      drag = null;
      if (!wasActive) return;
      if (dy > DISMISS_PX) {
        closeFullscreenView(el);
      } else {
        el.classList.remove("dragging");
        el.style.transform = "";
      }
    }
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
  }

  const detailView = document.getElementById("detail-view");
  // Slides the outgoing detail page and the incoming one past each other
  // horizontally instead of just swapping innerHTML — used when hopping
  // between movies via the timeline strip, so the motion tells you which
  // way you moved in the chronology. "forward" = deeper into MOVIES (the
  // array is already chronological), old exits left / new enters right.
  function swapDetailContent(body, m, direction) {
    const oldContent = body.firstElementChild;
    const wrap = document.createElement("div");
    wrap.innerHTML = detailViewHTML(m);
    const newContent = wrap.firstElementChild;
    body.appendChild(newContent);
    body.classList.add("swapping");
    // Position newContent absolute (overlapping oldContent at the top)
    // before touching scroll — while it's still in normal flow, it sits
    // below oldContent's full height, so scrollIntoView's vertical
    // "nearest" search below would drag #detail-body's scroll down to
    // reach it instead of leaving the page at the top.
    newContent.classList.add("detail-slide-new");
    body.scrollTop = 0;
    applyDetailHeroColor(m, newContent);
    const current = newContent.querySelector(".detail-timeline-item.current");
    if (current) current.scrollIntoView({ inline: "center", block: "nearest" });

    // Web Animations API instead of a CSS class + transitionend: for a
    // freshly-inserted element, a CSS transition needs the browser to have
    // actually committed a "before" frame first, and that isn't reliable
    // even behind a forced reflow — it can silently collapse to the final
    // value with no animation (and no transitionend to clean up after).
    // .animate() always plays the keyframes given to it, no prior render
    // history required.
    const sign = direction === "forward" ? 1 : -1;
    const duration = 320;
    const easing = "cubic-bezier(0.32, 0.72, 0, 1)";
    oldContent.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(${-sign * 100}%)` }],
      { duration, easing, fill: "forwards" }
    );
    const newAnim = newContent.animate(
      [{ transform: `translateX(${sign * 100}%)` }, { transform: "translateX(0)" }],
      { duration, easing, fill: "forwards" }
    );
    newAnim.finished.then(() => {
      oldContent.remove();
      newContent.classList.remove("detail-slide-new");
      newContent.style.transform = "";
      body.classList.remove("swapping");
    }).catch(() => {});
  }
  let currentDetailId = null;
  function openDetailView(id, direction) {
    const m = MOVIES.find(mv => mv.id === id);
    if (!m) return;
    const body = document.getElementById("detail-body");
    if (direction && !detailView.hidden && body.firstElementChild && !body.classList.contains("swapping")) {
      swapDetailContent(body, m, direction);
    } else {
      body.innerHTML = detailViewHTML(m);
      body.scrollTop = 0;
      applyDetailHeroColor(m);
      openFullscreenView(detailView);
      const current = body.querySelector(".detail-timeline-item.current");
      if (current) current.scrollIntoView({ inline: "center", block: "nearest" });
    }
    currentDetailId = id;
  }

  // Same canvas-average technique as the list view's row backgrounds
  // (applyListRowColors), just producing a bright + a darkened shade so the
  // hero can fade from the poster's color into the timeline's solid
  // backdrop. Raw averages skew muddy (they mix in whatever dark
  // background surrounds the subject), so the top of the gradient is
  // brightened toward the color's own strongest channel before use —
  // otherwise the "gradient" can end up too close to its own dark end to
  // read as one at a glance.
  function vivify(c) {
    const max = Math.max(c.r, c.g, c.b, 1);
    const boost = Math.min(1.8, 185 / max);
    return {
      r: Math.min(255, Math.round(c.r * boost)),
      g: Math.min(255, Math.round(c.g * boost)),
      b: Math.min(255, Math.round(c.b * boost)),
    };
  }
  function applyDetailHeroColor(m, root) {
    // Scoped to a specific .detail-container (root) rather than always
    // querying #detail-body directly: during a timeline swap the outgoing
    // and incoming containers briefly coexist in the DOM, and an unscoped
    // query would silently grab the outgoing (still-first) one.
    const scope = (root || document).querySelector(".detail-color-scope");
    const heroWrap = (root || document).querySelector(".detail-hero-wrap");
    const timelineWrap = (root || document).querySelector(".detail-timeline-wrap");
    const img = (root || document).querySelector(".detail-poster-full");
    if (!scope || !heroWrap || !timelineWrap || !img || img.tagName !== "IMG") return;
    sampleDominantColor(img, color => {
      if (!color) return;
      const top = vivify(color);
      const dark = cssVarRgb("--bg");
      const mid = mixRgb(top, dark, 0.55);
      // One gradient spans the poster's whole colored region (hero +
      // timeline) instead of being squeezed into just the hero box and
      // then hard-cut to a flat color — a 2-stop fade confined to the
      // shorter hero box reads as "cropped" because it has to reach full
      // darkness in too little vertical space. Landing the dark stop at
      // the hero/timeline boundary (measured, not guessed) means the
      // timeline is still flatly "this dark color 100%" as intended, but
      // getting there is gradual across the taller hero area instead of
      // abrupt.
      const heroH = heroWrap.offsetHeight;
      const timelineH = timelineWrap.offsetHeight;
      const total = heroH + timelineH;
      const heroPct = total ? Math.max(40, Math.min(92, (heroH / total) * 100)) : 75;
      const midPct = heroPct * 0.6;
      scope.style.background =
        `linear-gradient(to bottom, ${rgbCss(top)} 0%, ${rgbCss(mid)} ${midPct}%, ${rgbCss(dark)} ${heroPct}%, ${rgbCss(dark)} 100%)`;
    });
  }

  initDragToDismiss(detailView, ".detail-hero-wrap");

  // Easter egg: tap the Infinity War poster 6 times, one stone lights up
  // per tap, the 6th triggers the snap — then the row resets.
  let snapTapCount = 0;
  let snapTapTimer = null;
  function resetInfinityStones() {
    document.querySelectorAll("#infinity-stones .stone").forEach(s => s.classList.remove("lit"));
  }
  document.getElementById("detail-body").addEventListener("click", e => {
    const poster = e.target.closest(".detail-poster-full");
    if (poster) {
      const m = MOVIES.find(mv => mv.id === currentDetailId);
      if (m && m.title === "Avengers: Infinity War") {
        snapTapCount++;
        clearTimeout(snapTapTimer);
        snapTapTimer = setTimeout(() => { snapTapCount = 0; resetInfinityStones(); }, 1800);
        const stones = document.querySelectorAll("#infinity-stones .stone");
        if (stones[snapTapCount - 1]) stones[snapTapCount - 1].classList.add("lit");
        if (snapTapCount >= 6) {
          snapTapCount = 0;
          playSnapAnimation();
          setTimeout(resetInfinityStones, 2600);
        }
        return;
      }
    }
    const timelineItem = e.target.closest(".detail-timeline-item");
    if (timelineItem) {
      const targetId = Number(timelineItem.dataset.id);
      const fromIdx = MOVIES.findIndex(mv => mv.id === currentDetailId);
      const toIdx = MOVIES.findIndex(mv => mv.id === targetId);
      const direction = toIdx > fromIdx ? "forward" : "backward";
      openDetailView(targetId, direction);
      return;
    }
    const btn = e.target.closest(".detail-action-btn");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const label = btn.querySelector("span");
    if (btn.classList.contains("watch")) {
      const nowWatched = toggleWatched(id);
      btn.classList.toggle("active", nowWatched);
      label.textContent = nowWatched ? "Watched" : "Mark watched";
      if (nowWatched) pulseWatchButton(btn);
      updateStats();
    } else if (btn.classList.contains("hide")) {
      const nowHidden = toggleHidden(id);
      btn.classList.toggle("active", nowHidden);
      label.textContent = nowHidden ? "Unhide" : "Hide from list";
      updateStats();
    }
    render();
  });

  // Easter egg: hold the Endgame poster — a repulsor glow charges up,
  // then Tony's own snap plays. A plain hold on purpose, no drag: the
  // poster sits inside a scrolling dialog, so a drag-based gesture there
  // fights the page's own scroll (that's what the circle-draw version of
  // this used to do, before it got replaced with this).
  (function initIronManHold() {
    const detailBody = document.getElementById("detail-body");
    const HOLD_MS = 1100;
    const MOVE_CANCEL_PX = 20; // see the matching comment in initTileLongPress
    let press = null;

    function isCurrentEndgame() {
      const m = MOVIES.find(mv => mv.id === currentDetailId);
      return !!(m && m.title === "Avengers: Endgame");
    }

    function cancelPress() {
      if (!press) return;
      clearTimeout(press.timer);
      press = null;
    }

    detailBody.addEventListener("pointerdown", e => {
      const wrap = e.target.closest(".detail-poster-wrap");
      if (!wrap || !isCurrentEndgame()) return;
      press = {
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        timer: setTimeout(() => {
          press = null;
          fireRepulsorRipple();
          setTimeout(playIronManAnimation, 260);
        }, HOLD_MS)
      };
    });

    detailBody.addEventListener("pointermove", e => {
      if (!press || press.pointerId !== e.pointerId) return;
      if (Math.abs(e.clientX - press.startX) > MOVE_CANCEL_PX || Math.abs(e.clientY - press.startY) > MOVE_CANCEL_PX) {
        cancelPress();
      }
    });
    detailBody.addEventListener("pointerup", cancelPress);
    detailBody.addEventListener("pointercancel", cancelPress);
  })();

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (openSheet) closeFullscreenView(openSheet);
  });

  // ---------- changelog ----------
  const changelogView = document.getElementById("changelog-view");
  initDragToDismiss(changelogView, ".fullscreen-head");
  initDragToDismiss(statsView, ".fullscreen-head");

  function renderChangelogEntries(entries) {
    return entries.map(e => `
      <div class="changelog-entry">
        <h3>v${escapeHTML(e.version)}</h3>
        <div class="changelog-date">${escapeHTML(e.date || "")}</div>
        <ul>${(e.changes || []).map(c => `<li>${escapeHTML(c)}</li>`).join("")}</ul>
      </div>`).join("");
  }

  function openChangelogModal(entries, latestVersion) {
    document.getElementById("changelog-body").innerHTML = renderChangelogEntries(entries);
    changelogView._onClose = () => {
      if (latestVersion) localStorage.setItem(CHANGELOG_SEEN_KEY, latestVersion);
    };
    document.getElementById("changelog-ok").onclick = () => closeFullscreenView(changelogView);
    openFullscreenView(changelogView);
  }

  async function initChangelog() {
    let entries;
    try {
      const res = await fetch(CHANGELOG_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("changelog fetch failed: " + res.status);
      entries = await res.json();
      if (!Array.isArray(entries) || !entries.length) throw new Error("empty changelog");
    } catch (e) {
      entries = CHANGELOG_FALLBACK;
    }
    entries = entries.slice().sort((a, b) => compareVersions(b.version, a.version));
    const latest = entries[0].version;

    const badge = document.getElementById("version-badge");
    badge.textContent = "v" + latest;
    badge.hidden = false;
    badge.addEventListener("click", () => openChangelogModal(entries, null));

    const seen = localStorage.getItem(CHANGELOG_SEEN_KEY);
    if (seen === null) {
      // First-ever visit: nothing to announce, just baseline silently.
      localStorage.setItem(CHANGELOG_SEEN_KEY, latest);
      return;
    }
    if (compareVersions(seen, latest) < 0) {
      const unseen = entries.filter(e => compareVersions(e.version, seen) > 0);
      openChangelogModal(unseen.length ? unseen : entries, latest);
    }
  }
  initChangelog();
})();
