/**
 * GameHub — Homepage logic
 * Rendering, search, category filters, favorites, recently played,
 * carousel, trending grid, leaderboard, loading screen and
 * page-transition-on-play.
 */
(function () {
  "use strict";

  const state = {
    query: "",
    category: "All"
  };

  const els = {
    featuredGrid: document.getElementById("featured-grid"),
    allGrid: document.getElementById("all-grid"),
    trendGrid: document.getElementById("trend-grid"),
    leaderboardPanel: document.getElementById("leaderboard-panel"),
    recentSection: document.getElementById("recent-section"),
    recentRail: document.getElementById("recent-rail"),
    categoryBar: document.getElementById("category-bar"),
    categoryPillsTop: document.getElementById("category-pills-top"),
    searchInput: document.getElementById("nav-search-input"),
    resultsCount: document.getElementById("results-count"),
    toast: document.getElementById("toast"),
    pageTransition: document.getElementById("page-transition"),
    yearEl: document.getElementById("footer-year"),
    statGames: document.getElementById("stat-games"),
    aboutGames: document.getElementById("about-games")
  };

  /* ---------------- Icon helpers ---------------- */
  const ICONS = {
    heart: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7Z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l3 6.6 7.2.7-5.4 4.9 1.6 7.1L12 17.9l-6.4 3.9 1.6-7.1L1.8 9.8l7.2-.7Z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3a4 4 0 0 1-4 5M7 5H4a4 4 0 0 0 4 5"/></svg>'
  };

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  /* ---------------- Card rendering ---------------- */
  function cardHTML(game, opts) {
    opts = opts || {};
    const isFav = GHStorage.isFavorite(game.slug);
    const cats = game.categories
      .map((c) => `<span class="gc-cat-tag">${escapeHtml(c)}</span>`)
      .join("");
    let badge = "";
    if (game.isNew) {
      badge = `<span class="gc-badge gc-badge-new">New</span>`;
    } else if (opts.badge) {
      badge = `<span class="gc-badge">${escapeHtml(opts.badge)}</span>`;
    }

    return `
      <article class="game-card" style="--tint:${game.accent}" data-slug="${game.slug}">
        <a class="gc-thumb" href="games/${game.slug}/index.html" data-play="${game.slug}">
          ${badge}
          <button class="gc-fav ${isFav ? "active" : ""}" data-fav="${game.slug}" aria-label="Toggle favorite" title="Save to favorites">${ICONS.heart}</button>
          <img src="${game.thumbnail}" alt="${escapeHtml(game.title)} thumbnail" loading="lazy" width="400" height="300">
          <span class="gc-play">${ICONS.play}</span>
        </a>
        <div class="gc-body">
          <div class="gc-title-row">
            <h3 class="gc-title">${escapeHtml(game.title)}</h3>
            <span class="gc-rating">${ICONS.star}${(game.rating || 4.5).toFixed(1)}</span>
          </div>
          <p class="gc-tagline">${escapeHtml(game.tagline)}</p>
          <p class="gc-desc">${escapeHtml(game.description)}</p>
          <div class="gc-footer">
            <div class="gc-cats">${cats}</div>
            <a class="gc-playbtn" href="games/${game.slug}/index.html" data-play="${game.slug}">${ICONS.play} Play</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderFeatured() {
    const featured = GAMES.filter((g) => g.featured);
    els.featuredGrid.innerHTML = featured
      .map((g) => cardHTML(g, { badge: "Featured" }))
      .join("");
  }

  function renderTrending() {
    const trending = [...GAMES].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    els.trendGrid.innerHTML = trending.map((g) => cardHTML(g)).join("");
  }

  function leaderboardRowHTML(p, i) {
    return `
      <div class="lb-row">
        <div class="lb-rank">${i + 1}</div>
        <div class="lb-avatar">${escapeHtml((p.displayName || "?").charAt(0).toUpperCase())}</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(p.displayName || "Player")} ${i < 3 ? `<span class="lb-trophy" style="display:inline-flex;vertical-align:-3px;">${ICONS.trophy}</span>` : ""}</div>
          <div class="lb-game">Top game: ${escapeHtml(p.gameTitle || "—")}</div>
        </div>
        <div class="lb-xp"><b>${Math.round(p.score || 0).toLocaleString()}</b><span>PTS</span></div>
      </div>
    `;
  }

  function renderLeaderboard() {
    if (!els.leaderboardPanel) return;

    if (!window.Arcadia || !Arcadia.isConfigured) {
      els.leaderboardPanel.innerHTML = `
        <div class="empty-state">
          <h3>Leaderboard not set up yet</h3>
          <p>Add your Firebase keys to js/firebase-config.js to turn this on — see FIREBASE_SETUP.md.</p>
        </div>`;
      return;
    }

    els.leaderboardPanel.innerHTML = `<div class="empty-state"><p>Loading leaderboard…</p></div>`;
    Arcadia.getGlobalLeaderboard(10).then((rows) => {
      if (!rows.length) {
        els.leaderboardPanel.innerHTML = `
          <div class="empty-state">
            <h3>No scores yet</h3>
            <p>Sign in and play any game — your best score will show up here first.</p>
          </div>`;
        return;
      }
      els.leaderboardPanel.innerHTML = rows.map(leaderboardRowHTML).join("");
    });
  }
  window.renderArcadiaLeaderboard = renderLeaderboard;

  function matchesFilters(game) {
    const q = state.query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      game.title.toLowerCase().includes(q) ||
      game.tagline.toLowerCase().includes(q) ||
      game.description.toLowerCase().includes(q) ||
      game.categories.some((c) => c.toLowerCase().includes(q));
    const matchesCat =
      state.category === "All" || game.categories.includes(state.category);
    return matchesQuery && matchesCat;
  }

  function renderAllGames() {
    const results = GAMES.filter(matchesFilters);
    els.resultsCount.textContent = `${results.length} game${results.length === 1 ? "" : "s"}`;

    if (results.length === 0) {
      els.allGrid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <h3>No games found</h3>
          <p>Try a different search term or category.</p>
        </div>`;
      return;
    }
    els.allGrid.innerHTML = results.map((g) => cardHTML(g)).join("");
  }

  function renderRecent() {
    const recent = GHStorage.getRecent(8)
      .map((r) => ({ ...r, game: GAMES.find((g) => g.slug === r.slug) }))
      .filter((r) => r.game);

    if (recent.length === 0) {
      els.recentSection.classList.remove("has-items");
      return;
    }
    els.recentSection.classList.add("has-items");
    els.recentRail.innerHTML = recent
      .map(
        (r) => `
        <a class="recent-card" href="games/${r.game.slug}/index.html" data-play="${r.game.slug}">
          <img src="${r.game.thumbnail}" alt="${escapeHtml(r.game.title)}" loading="lazy" width="200" height="150">
          <div class="rc-title">${escapeHtml(r.game.title)}</div>
        </a>`
      )
      .join("");
  }

  function renderCategoryBar() {
    const html = CATEGORIES.map(
      (c) => `<button class="pill ${c === state.category ? "active" : ""}" data-cat="${c}">${c}</button>`
    ).join("");
    els.categoryBar.innerHTML = html;
    if (els.categoryPillsTop) els.categoryPillsTop.innerHTML = html;
  }

  function renderAll() {
    renderFeatured();
    renderTrending();
    renderLeaderboard();
    renderAllGames();
    renderRecent();
    renderCategoryBar();
    if (els.statGames) els.statGames.textContent = GAMES.length;
    if (els.aboutGames) els.aboutGames.textContent = GAMES.length;
  }

  /* ---------------- Event delegation ---------------- */
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }
  window.ArcadiaToast = showToast;

  function handleClick(e) {
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      e.preventDefault();
      const slug = favBtn.getAttribute("data-fav");
      const nowFav = GHStorage.toggleFavorite(slug);
      const game = GAMES.find((g) => g.slug === slug);
      showToast(nowFav ? `${game.title} added to favorites` : `${game.title} removed from favorites`);
      renderAll();
      return;
    }

    const playEl = e.target.closest("[data-play]");
    if (playEl) {
      e.preventDefault();
      const slug = playEl.getAttribute("data-play");
      const href = playEl.getAttribute("href");
      GHStorage.recordPlay(slug);
      els.pageTransition.classList.add("active");
      setTimeout(() => {
        window.location.href = href;
      }, 320);
      return;
    }

    const catBtn = e.target.closest("[data-cat]");
    if (catBtn) {
      state.category = catBtn.getAttribute("data-cat");
      renderCategoryBar();
      renderAllGames();
      document.getElementById("all-games")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  document.addEventListener("click", handleClick);

  /* ---------------- Search ---------------- */
  let searchDebounce;
  els.searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    const value = e.target.value;
    searchDebounce = setTimeout(() => {
      state.query = value;
      renderAllGames();
    }, 120);
  });
  els.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      document.getElementById("all-games")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  /* ---------------- Featured carousel ---------------- */
  const carouselPrev = document.getElementById("carousel-prev");
  const carouselNext = document.getElementById("carousel-next");
  function scrollCarousel(dir) {
    if (!els.featuredGrid) return;
    const card = els.featuredGrid.querySelector(".game-card");
    const step = card ? card.getBoundingClientRect().width + 24 : 320;
    els.featuredGrid.scrollBy({ left: dir * step, behavior: "smooth" });
  }
  carouselPrev?.addEventListener("click", () => scrollCarousel(-1));
  carouselNext?.addEventListener("click", () => scrollCarousel(1));

  // Gentle auto-scroll of the featured carousel, pausing on hover/interaction.
  let autoScrollTimer;
  let autoScrollPaused = false;
  function startAutoScroll() {
    clearInterval(autoScrollTimer);
    autoScrollTimer = setInterval(() => {
      if (autoScrollPaused || !els.featuredGrid) return;
      const atEnd =
        els.featuredGrid.scrollLeft + els.featuredGrid.clientWidth >=
        els.featuredGrid.scrollWidth - 4;
      if (atEnd) {
        els.featuredGrid.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollCarousel(1);
      }
    }, 4200);
  }
  els.featuredGrid?.addEventListener("mouseenter", () => (autoScrollPaused = true));
  els.featuredGrid?.addEventListener("mouseleave", () => (autoScrollPaused = false));

  /* ---------------- Mobile nav ---------------- */
  const burger = document.getElementById("nav-burger");
  const navLinks = document.getElementById("nav-links");
  burger?.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  /* ---------------- Loading screen ---------------- */
  window.addEventListener("load", () => {
    setTimeout(() => {
      document.getElementById("loading-screen")?.classList.add("hidden");
    }, 400);
  });

  /* ---------------- Footer year ---------------- */
  if (els.yearEl) els.yearEl.textContent = new Date().getFullYear();

  /* ---------------- Init ---------------- */
  renderAll();
  startAutoScroll();
})();
