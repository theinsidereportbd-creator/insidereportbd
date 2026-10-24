// Cloudflare Worker: পত্রিকার RSS ফিড টেনে একসাথে JSON হিসেবে দেয়।
// /api/news  -> খবরের তালিকা (৫ মিনিট ক্যাশ)
// /api/check -> কোন ফিড কাজ করছে, কয়টা খবর, সবচেয়ে নতুন খবর কখনকার

const SOURCES = [
  { id: "prothomalo",  url: "https://www.prothomalo.com/feed/" },
  { id: "dailystar",   url: "https://www.thedailystar.net/taxonomy/term/1/rss.xml" },
  { id: "jagonews24",  url: "https://www.jagonews24.com/rss/rss.xml" },
  { id: "tirbd",        url: "https://theinsidereportbd.blogspot.com/feeds/posts/default?alt=rss" },
  { id: "ajkerpatrika", url: "https://www.ajkerpatrika.com/feed/" },
  { id: "bdjournal",    url: "https://www.bd-journal.com/feed/latest-rss.xml" },
  { id: "bd24live",     url: "https://www.bd24live.com/bangla/feed/" },
  { id: "aljazeera",    url: "https://www.aljazeera.com/xml/rss/all.xml" }
];

const MAX_AGE_MS = 10 * 24 * 3600 * 1000; // ১০ দিনের পুরোনো খবর বাদ

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

function decode(s) {
  return (s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0*39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(block, name) {
  const m = new RegExp("<" + name + "[^>]*>([\\s\\S]*?)</" + name + ">", "i").exec(block);
  return m ? decode(m[1]) : "";
}

function attr(block, tagName, attrName) {
  const m = new RegExp("<" + tagName + "[^>]*?" + attrName + '=["\']([^"\']+)["\']', "i").exec(block);
  return m ? decode(m[1]) : "";
}

function strip(html) {
  return decode(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseDate(str) {
  let ms = Date.parse(str);
  if (!ms) return 0;
  const d = new Date(ms);
  if (d.getUTCFullYear() < 2000) { d.setUTCFullYear(d.getUTCFullYear() + 100); ms = d.getTime(); }
  return ms;
}

function parseFeed(xml, sourceId) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 40).map((b) => {
    const desc = tag(b, "description") || tag(b, "summary") || tag(b, "content:encoded") || tag(b, "content");
    const link = tag(b, "link") || attr(b, "link", "href");
    let image =
      attr(b, "media:content", "url") ||
      attr(b, "media:thumbnail", "url") ||
      attr(b, "enclosure", "url");
    if (!image) {
      const m = /<img[^>]+src=["']([^"']+)/i.exec(decode(desc) + decode(tag(b, "content:encoded")));
      image = m ? m[1] : "";
    }
    const date = parseDate(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date"));
    return {
      source: sourceId,
      title: strip(tag(b, "title")),
      link,
      date,
      summary: strip(desc).slice(0, 160),
      image
    };
  }).filter((i) => i.title && i.link);
}

async function fetchSource(s) {
  const res = await fetch(s.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Accept": "application/rss+xml, application/xml, text/xml, */*"
    },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return parseFeed(await res.text(), s.id);
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);

    if (url.pathname === "/api/check") {
      const report = await Promise.all(SOURCES.map(async (s) => {
        try {
          const items = await fetchSource(s);
          const newest = items.reduce((m, i) => Math.max(m, i.date), 0);
          return { id: s.id, ok: items.length > 0, items: items.length, newest: newest ? new Date(newest).toISOString() : null };
        } catch (e) {
          return { id: s.id, ok: false, error: String(e.message || e) };
        }
      }));
      return new Response(JSON.stringify(report, null, 2), { headers: CORS });
    }

    if (url.pathname !== "/api/news") {
      return new Response(JSON.stringify({ ok: true, message: "Inside Report BD API", try: ["/api/news", "/api/check"] }), { headers: CORS });
    }

    const cache = caches.default;
    const cacheKey = new Request(url.origin + "/api/news");
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const results = await Promise.allSettled(SOURCES.map(fetchSource));
    let items = [];
    const failed = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.length) items = items.concat(r.value);
      else failed.push(SOURCES[i].id);
    });
    const cutoff = Date.now() - MAX_AGE_MS;
    items = items.filter((i) => i.date >= cutoff);
    items.sort((a, b) => b.date - a.date);
    // একটি সোর্স যেন তালিকা দখল না করে: প্রতি সোর্স থেকে সর্বোচ্চ ৩০টি
    const count = {};
    items = items.filter((i) => (count[i.source] = (count[i.source] || 0) + 1) <= 30);

    const response = new Response(
      JSON.stringify({ updated: Date.now(), failed, items: items.slice(0, 300) }),
      { headers: { ...CORS, "Cache-Control": "public, max-age=300" } }
    );
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};
