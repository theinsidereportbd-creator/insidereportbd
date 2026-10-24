(function () {
  var SOURCES = window.SOURCES;
  var API_BASE = (window.CONFIG && window.CONFIG.API_BASE) || "";
  var OWN_ID = "tirbd"; // আমাদের নিজস্ব ব্লগ
  var $ = function (id) { return document.getElementById(id); };
  var state = { items: [], filter: "all", tab: "all", q: "", loading: true };

  function load(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var saved = load("saved", []);
  var theme = load("theme", "light");
  document.documentElement.setAttribute("data-theme", theme);

  // ---------- আইকন ----------
  var ICON = {
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4.5L5 20V5a1 1 0 0 1 1-1z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7.5 9 7.5v8.5a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.4"/><circle cx="17.5" cy="6" r="2.4"/><circle cx="17.5" cy="18" r="2.4"/><path d="M8.1 10.9l7.3-3.8M8.1 13.1l7.3 3.8"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg>',
    empty: '<svg viewBox="0 0 24 24"><path d="M4 5h13a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2zM19 9h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1M8 9h7M8 13h7M8 16h4"/></svg>'
  };
  function fillIcons() {
    $("btnTheme").innerHTML = theme === "dark" ? ICON.sun : ICON.moon;
    $("btnRefresh").innerHTML = ICON.refresh;
    var els = document.querySelectorAll("[data-ico]");
    for (var i = 0; i < els.length; i++) els[i].innerHTML = ICON[els[i].getAttribute("data-ico")] || "";
  }

  // ---------- বাংলা সংখ্যা ও তারিখ ----------
  var bnDigits = "০১২৩৪৫৬৭৮৯";
  function bn(n) { return String(n).replace(/\d/g, function (d) { return bnDigits[d]; }); }
  var MONTHS = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  var DAYS = ["রবিবার","সোমবার","মঙ্গলবার","বুধবার","বৃহস্পতিবার","শুক্রবার","শনিবার"];
  function todayLabel() {
    var d = new Date();
    return DAYS[d.getDay()] + ", " + bn(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + bn(d.getFullYear());
  }

  function timeAgo(ms) {
    if (!ms) return "";
    var s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return "এইমাত্র";
    if (s < 3600) return bn(Math.floor(s / 60)) + " মিনিট আগে";
    if (s < 86400) return bn(Math.floor(s / 3600)) + " ঘণ্টা আগে";
    if (s < 86400 * 30) return bn(Math.floor(s / 86400)) + " দিন আগে";
    var d = new Date(ms);
    return bn(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + bn(d.getFullYear());
  }

  function stripHtml(h) {
    var d = document.createElement("div");
    d.innerHTML = h || "";
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  }

  function srcById(id) {
    for (var i = 0; i < SOURCES.length; i++) if (SOURCES[i].id === id) return SOURCES[i];
    return { id: id, name: id, color: "#888" };
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function txt(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    e.textContent = text;
    return e;
  }

  // ---------- স্ট্যাটাস বার্তা ----------
  var statusTimer = null;
  function setStatus(msg, isErr, autoHideMs) {
    var s = $("status");
    clearTimeout(statusTimer);
    if (!msg) { s.hidden = true; s.textContent = ""; return; }
    s.hidden = false;
    s.textContent = msg;
    s.className = "status" + (isErr ? " err" : "");
    if (autoHideMs) statusTimer = setTimeout(function () { setStatus(""); }, autoHideMs);
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
    var rb = $("btnRefresh");
    rb.classList.add("spin");
    if (!state.items.length) { state.loading = true; render(); }
    var p = API_BASE ? fetchViaWorker() : fetchViaRss2Json();
    p.then(function (items) {
      if (!items.length) throw new Error("empty");
      items.sort(function (a, b) { return b.date - a.date; });
      state.items = items;
      state.loading = false;
      save("cache", items.slice(0, 200));
      setStatus("");
      render();
    }).catch(function () {
      var c = load("cache", []);
      state.items = c;
      state.loading = false;
      setStatus(c.length
        ? "ইন্টারনেট সমস্যা, আগের খবর দেখানো হচ্ছে"
        : "খবর আনা যায়নি। ইন্টারনেট চেক করে রিফ্রেশ করুন।", true);
      render();
    }).then(function () {
      setTimeout(function () { rb.classList.remove("spin"); }, 400);
    });
  }

  // ---------- সংরক্ষণ ও শেয়ার ----------
  function isSaved(link) { return saved.some(function (s) { return s.link === link; }); }

  function toggleSave(item) {
    if (isSaved(item.link)) saved = saved.filter(function (s) { return s.link !== item.link; });
    else saved.unshift(item);
    save("saved", saved);
    render();
  }

  function shareItem(item) {
    var text = item.title + "\n" + item.link;
    try {
      if (navigator.share) {
        navigator.share({ title: item.title, text: item.title, url: item.link }).catch(function () {});
        return;
      }
    } catch (e) {}
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { setStatus("লিংক কপি হয়েছে", false, 2000); });
        return;
      }
    } catch (e) {}
    setStatus(item.link, false, 4000);
  }

  // ---------- দেখানো ----------
  function renderChips() {
    var box = $("chips");
    box.innerHTML = "";
    var own = SOURCES.filter(function (s) { return s.id === OWN_ID; });
    var others = SOURCES.filter(function (s) { return s.id !== OWN_ID; });
    var all = [{ id: "all", name: "সব" }].concat(own, others);
    all.forEach(function (s) {
      var b = el("button", "chip" + (state.filter === s.id ? " on" : ""));
      b.textContent = s.name;
      b.onclick = function () { state.filter = s.id; renderChips(); render(); };
      box.appendChild(b);
    });
  }

  function skeleton(n) {
    var html = "";
    for (var i = 0; i < n; i++) {
      html += '<div class="skel"><div class="l"><span></span><span></span><span></span></div><div class="im"></div></div>';
    }
    return html;
  }

  function buildHero(it) {
    var s = srcById(it.source);
    var a = el("a", "hero");
    a.href = it.link; a.target = "_blank"; a.rel = "noopener";
    if (it.image) {
      var img = document.createElement("img");
      img.src = it.image; img.alt = ""; img.loading = "eager";
      img.onerror = function () { img.remove(); };
      a.appendChild(img);
    }
    var inner = el("div", "inner");
    var badge = el("span", "badge");
    badge.style.setProperty("--c", s.color);
    badge.innerHTML = "<i></i>";
    badge.appendChild(document.createTextNode(s.name));
    inner.appendChild(badge);
    inner.appendChild(txt("h2", "", it.title));
    var meta = el("div", "hmeta");
    meta.appendChild(txt("span", "", timeAgo(it.date)));
    meta.appendChild(el("span", "", "· মূল সাইটে পড়ুন"));
    inner.appendChild(meta);
    a.appendChild(inner);
    return a;
  }

  function buildItem(it) {
    var s = srcById(it.source);
    var own = it.source === OWN_ID;
    var row = el("article", "item" + (own ? " own" : ""));

    var body = el("div", "ibody");
    var line = el("div", "srcline");
    var dot = el("i"); dot.style.setProperty("--c", s.color);
    line.appendChild(dot);
    line.appendChild(txt("b", "", s.name));
    line.appendChild(txt("em", "", timeAgo(it.date)));
    body.appendChild(line);

    var t = txt("a", "title", it.title);
    t.href = it.link; t.target = "_blank"; t.rel = "noopener";
    body.appendChild(t);
    if (it.summary) body.appendChild(txt("p", "sum", it.summary));

    var foot = el("div", "ifoot");
    var read = el("a", "read", "মূল সাইটে পড়ুন " + ICON.arrow);
    read.href = it.link; read.target = "_blank"; read.rel = "noopener";
    foot.appendChild(read);

    var tools = el("div", "tools");
    var sh = el("button", "tool", ICON.share);
    sh.setAttribute("aria-label", "শেয়ার");
    sh.onclick = function () { shareItem(it); };
    var sv = el("button", "tool" + (isSaved(it.link) ? " saved" : ""), ICON.bookmark);
    sv.setAttribute("aria-label", "সংরক্ষণ");
    sv.onclick = function () { toggleSave(it); };
    tools.appendChild(sh);
    tools.appendChild(sv);
    foot.appendChild(tools);
    body.appendChild(foot);
    row.appendChild(body);

    if (it.image) {
      var im = document.createElement("img");
      im.className = "thumb"; im.loading = "lazy"; im.alt = ""; im.src = it.image;
      im.onerror = function () { im.remove(); };
      row.appendChild(im);
    }
    return row;
  }

  // ---------- ব্রেকিং টিকার: প্রতিটি চ্যানেলের সবচেয়ে নতুন খবর ঘুরে ঘুরে ----------
  var tk = { list: [], i: 0, timer: null, sig: "" };

  function breakingList() {
    var now = Date.now(), seen = {}, out = [];
    state.items.slice().sort(function (a, b) { return b.date - a.date; }).forEach(function (it) {
      if (seen[it.source]) return;
      if (!it.date || now - it.date > 3 * 86400000) return;
      seen[it.source] = true;
      out.push(it);
    });
    return out.slice(0, 8);
  }

  function showTick() {
    var box = $("ticker");
    var it = tk.list[tk.i % tk.list.length];
    var s = srcById(it.source);
    box.href = it.link; box.target = "_blank"; box.rel = "noopener";
    box.innerHTML = "";
    box.appendChild(el("div", "tk-label", "<i></i>ব্রেকিং"));
    var body = el("div", "tk-body");
    var slide = el("div", "tk-slide");
    var src = el("div", "tk-src");
    var dot = el("i"); dot.style.setProperty("--c", s.color);
    src.appendChild(dot);
    src.appendChild(txt("b", "", s.name));
    src.appendChild(txt("span", "", "· " + timeAgo(it.date)));
    slide.appendChild(src);
    slide.appendChild(txt("p", "tk-title", it.title));
    body.appendChild(slide);
    var dots = el("div", "tk-dots");
    for (var k = 0; k < tk.list.length; k++) dots.appendChild(el("span", k === tk.i % tk.list.length ? "on" : ""));
    body.appendChild(dots);
    box.appendChild(body);
  }

  function renderTicker() {
    var box = $("ticker");
    var show = state.tab === "all" && !state.q && state.filter === "all";
    var list = show ? breakingList() : [];
    if (!list.length) {
      box.hidden = true; clearInterval(tk.timer); tk.timer = null; tk.sig = "";
      return;
    }
    var sig = list.map(function (x) { return x.link; }).join("|");
    tk.list = list;
    box.hidden = false;
    if (sig !== tk.sig) { tk.sig = sig; tk.i = 0; }
    showTick();
    if (!tk.timer) {
      tk.timer = setInterval(function () {
        if (box.hidden || tk.list.length < 2) return;
        tk.i = (tk.i + 1) % tk.list.length;
        showTick();
      }, 4500);
    }
  }

  function render() {
    var list = $("list"), hero = $("hero");
    list.innerHTML = ""; hero.innerHTML = "";
    renderTicker();

    var cnt = $("savedCount");
    cnt.hidden = !saved.length;
    cnt.textContent = bn(saved.length);

    var items = state.tab === "saved" ? saved : state.items;
    var q = state.q.toLowerCase();
    items = items.filter(function (i) {
      if (state.tab === "all" && state.filter !== "all" && i.source !== state.filter) return false;
      if (q && (i.title || "").toLowerCase().indexOf(q) < 0 && (i.summary || "").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    if (state.loading && !items.length && state.tab === "all") {
      list.innerHTML = skeleton(6);
      return;
    }

    if (!items.length) {
      var msg = state.tab === "saved"
        ? "কোনো সংরক্ষিত খবর নেই। খবরের পাশের বুকমার্ক চিহ্নে চাপ দিন।"
        : (state.q ? "এই শব্দে কোনো খবর পাওয়া যায়নি" : "কোনো খবর পাওয়া যায়নি");
      var empty = el("div", "empty", ICON.empty);
      empty.appendChild(txt("p", "", msg));
      list.appendChild(empty);
      return;
    }

    var rest = items.slice(0, 150);
    // প্রধান খবর: শুধু "সব খবর" ট্যাবে, খোঁজা ছাড়া, ছবিসহ প্রথম খবর
    if (state.tab === "all" && !state.q) {
      var idx = -1;
      for (var i = 0; i < Math.min(rest.length, 8); i++) { if (rest[i].image) { idx = i; break; } }
      if (idx >= 0) {
        hero.appendChild(buildHero(rest[idx]));
        rest.splice(idx, 1);
      }
    }
    rest.forEach(function (it) { list.appendChild(buildItem(it)); });
  }

  // ---------- ইভেন্ট ----------
  $("btnRefresh").onclick = refresh;
  $("btnTheme").onclick = function () {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    save("theme", theme);
    $("btnTheme").innerHTML = theme === "dark" ? ICON.sun : ICON.moon;
  };
  $("search").oninput = function (e) { state.q = e.target.value; render(); };
  $("tabAll").onclick = function () {
    state.tab = "all";
    $("tabAll").className = "active"; $("tabSaved").className = "";
    window.scrollTo(0, 0); render();
  };
  $("tabSaved").onclick = function () {
    state.tab = "saved";
    $("tabSaved").className = "active"; $("tabAll").className = "";
    window.scrollTo(0, 0); render();
  };

  $("today").textContent = todayLabel();
  fillIcons();
  renderChips();
  state.items = load("cache", []);
  state.loading = !state.items.length;
  render();
  refresh();
  setInterval(refresh, 5 * 60 * 1000);
})();
