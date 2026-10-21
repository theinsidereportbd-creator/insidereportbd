(function () {
  var SOURCES = window.SOURCES;
  var API_BASE = (window.CONFIG && window.CONFIG.API_BASE) || "";
  var $ = function (id) { return document.getElementById(id); };
  var state = { items: [], filter: "all", tab: "all", q: "" };

  function load(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var saved = load("saved", []);            // সংরক্ষিত খবর (সম্পূর্ণ অবজেক্ট)
  var theme = load("theme", "light");
  document.documentElement.setAttribute("data-theme", theme);

  var bnDigits = "০১২৩৪৫৬৭৮৯";
  function bn(n) { return String(n).replace(/\d/g, function (d) { return bnDigits[d]; }); }

  function timeAgo(ms) {
    if (!ms) return "";
    var s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return "এইমাত্র";
    if (s < 3600) return bn(Math.floor(s / 60)) + " মিনিট আগে";
    if (s < 86400) return bn(Math.floor(s / 3600)) + " ঘণ্টা আগে";
    return bn(Math.floor(s / 86400)) + " দিন আগে";
  }

  function stripHtml(h) {
    var d = document.createElement("div");
    d.innerHTML = h || "";
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  }

  function srcById(id) {
    for (var i = 0; i < SOURCES.length; i++) if (SOURCES[i].id === id) return SOURCES[i];
    return { name: id, color: "#888" };
  }

  // ---------- ডেটা আনা ----------
  function fetchViaWorker() {
    return fetch(API_BASE.replace(/\/$/, "") + "/api/news")
      .then(function (r) { return r.json(); })
      .then(function (j) { return j.items || []; });
  }

  function fetchViaRss2Json() {
    return Promise.allSettled(SOURCES.map(function (s) {
      return fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(s.url))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.status !== "ok") throw new Error("feed error");
          return j.items.map(function (it) {
            var img = it.thumbnail || (it.enclosure && it.enclosure.link) || "";
            if (!img) {
              var m = /<img[^>]+src=["']([^"']+)/i.exec(it.content || it.description || "");
              img = m ? m[1] : "";
            }
            return {
              source: s.id,
              title: it.title,
              link: it.link,
              date: Date.parse((it.pubDate || "").replace(" ", "T") + "Z") || 0,
              summary: stripHtml(it.description || it.content).slice(0, 160),
              image: img
            };
          });
        });
    })).then(function (rs) {
      var all = [];
      rs.forEach(function (r) { if (r.status === "fulfilled") all = all.concat(r.value); });
      return all;
    });
  }

  function refresh() {
    $("status").textContent = "খবর লোড হচ্ছে...";
    var p = API_BASE ? fetchViaWorker() : fetchViaRss2Json();
    p.then(function (items) {
      if (!items.length) throw new Error("empty");
      items.sort(function (a, b) { return b.date - a.date; });
      state.items = items;
      save("cache", items.slice(0, 200));
      $("status").textContent = "";
      render();
    }).catch(function () {
      var c = load("cache", []);
      state.items = c;
      $("status").textContent = c.length
        ? "ইন্টারনেট সমস্যা, আগের খবর দেখানো হচ্ছে"
        : "খবর আনা যায়নি। ইন্টারনেট চেক করে রিফ্রেশ করুন।";
      render();
    });
  }

  // ---------- দেখানো ----------
  function isSaved(link) { return saved.some(function (s) { return s.link === link; }); }

  function toggleSave(item) {
    if (isSaved(item.link)) saved = saved.filter(function (s) { return s.link !== item.link; });
    else saved.unshift(item);
    save("saved", saved);
    render();
  }

  function renderChips() {
    var box = $("chips");
    box.innerHTML = "";
    var all = [{ id: "all", name: "সব" }].concat(SOURCES);
    all.forEach(function (s) {
      var b = document.createElement("button");
      b.className = "chip" + (state.filter === s.id ? " on" : "");
      b.textContent = s.name;
      b.onclick = function () { state.filter = s.id; renderChips(); render(); };
      box.appendChild(b);
    });
  }

  function render() {
    var list = $("list");
    list.innerHTML = "";
    var items = state.tab === "saved" ? saved : state.items;
    var q = state.q.toLowerCase();
    items = items.filter(function (i) {
      if (state.tab === "all" && state.filter !== "all" && i.source !== state.filter) return false;
      if (q && (i.title || "").toLowerCase().indexOf(q) < 0 && (i.summary || "").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (!items.length && !$("status").textContent) {
      $("status").textContent = state.tab === "saved" ? "কোনো সংরক্ষিত খবর নেই" : "কোনো খবর পাওয়া যায়নি";
    } else if (items.length && $("status").textContent === "কোনো সংরক্ষিত খবর নেই") {
      $("status").textContent = "";
    }

    items.slice(0, 150).forEach(function (it) {
      var s = srcById(it.source);
      var card = document.createElement("div");
      card.className = "card";

      if (it.image) {
        var img = document.createElement("img");
        img.loading = "lazy";
        img.src = it.image;
        img.onerror = function () { img.remove(); };
        card.appendChild(img);
      }

      var body = document.createElement("div");
      body.className = "body";

      var src = document.createElement("div");
      src.className = "src";
      src.style.color = s.color;
      src.textContent = s.name;

      var title = document.createElement("div");
      title.className = "title";
      title.textContent = it.title;

      var sum = document.createElement("div");
      sum.className = "sum";
      sum.textContent = it.summary || "";

      var meta = document.createElement("div");
      meta.className = "meta";
      var left = document.createElement("span");
      left.textContent = timeAgo(it.date);
      var right = document.createElement("span");
      var a = document.createElement("a");
      a.className = "read";
      a.href = it.link;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "মূল সাইটে পড়ুন ↗";
      var star = document.createElement("button");
      star.textContent = isSaved(it.link) ? "★" : "☆";
      star.className = isSaved(it.link) ? "saved" : "";
      star.setAttribute("aria-label", "সংরক্ষণ");
      star.onclick = function () { toggleSave(it); };
      right.appendChild(a);
      right.appendChild(star);
      meta.appendChild(left);
      meta.appendChild(right);

      body.appendChild(src);
      body.appendChild(title);
      body.appendChild(sum);
      body.appendChild(meta);
      card.appendChild(body);
      list.appendChild(card);
    });
  }

  // ---------- ইভেন্ট ----------
  $("btnRefresh").onclick = refresh;
  $("btnTheme").onclick = function () {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    save("theme", theme);
  };
  $("search").oninput = function (e) { state.q = e.target.value; render(); };
  $("tabAll").onclick = function () {
    state.tab = "all"; $("status").textContent = "";
    $("tabAll").className = "active"; $("tabSaved").className = ""; render();
  };
  $("tabSaved").onclick = function () {
    state.tab = "saved"; $("status").textContent = "";
    $("tabSaved").className = "active"; $("tabAll").className = ""; render();
  };

  renderChips();
  state.items = load("cache", []);
  render();
  refresh();
  setInterval(refresh, 5 * 60 * 1000); // অ্যাপ খোলা থাকলে ৫ মিনিট পরপর আপডেট
})();
