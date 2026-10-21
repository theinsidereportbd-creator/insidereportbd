// Cloudflare Worker: সব পত্রিকার RSS ফিড টেনে একসাথে JSON হিসেবে দেয়।
// ৫ মিনিট ক্যাশ থাকে, তাই সার্ভারের উপর চাপ কম।

const SOURCES = [
  { id: "prothomalo",    url: "https://www.prothomalo.com/feed/" },
  { id: "dailystar",     url: "https://www.thedailystar.net/frontpage/rss.xml" },
  { id: "jugantor",      url: "https://www.jugantor.com/feed/rss.xml" },
  { id: "samakal",       url: "https://samakal.com/feed" },
  { id: "kalerkantho",   url: "https://www.kalerkantho.com/rss.xml" },
  { id: "banglatribune", url: "https://www.banglatribune.com/feed" },
  { id: "dhakatribune",  url: "https://www.dhakatribune.com/feed" },
  { id: "ittefaq",       url: "https://www.ittefaq.com.bd/feed" },
  { id: "somoy",         url: "https://www.somoynews.tv/rss" },
  { id: "jamuna",        url: "https://jamuna.tv/feed" }
];

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

function parseFeed(xml, sourceId) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 30).map((b) => {
    const desc = tag(b, "description") || tag(b, "summary") || tag(b, "content:encoded") || tag(b, "content");
    let link = tag(b, "link") || attr(b, "link", "href");
    let image =
      attr(b, "media:content", "url") ||
      attr(b, "media:thumbnail", "url") ||
      attr(b, "enclosure", "url");
    if (!image) {
      const m = /<img[^>]+src=["']([^"']+)/i.exec(decode(desc) + decode(tag(b, "content:encoded")));
      image = m ? m[1] : "";
    }
    const date = Date.parse(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date")) || 0;
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
    headers: { "User-Agent": "Mozilla/5.0 (compatible; InsideReportBD/1.0)" },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!res.ok) throw new Error(s.id + " " + res.status);
  return parseFeed(await res.text(), s.id);
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    if (url.pathname !== "/api/news") {
      return new Response(JSON.stringify({ ok: true, message: "Inside Report BD API", try: "/api/news" }), { headers: CORS });
    }

    const cache = caches.default;
    const cacheKey = new Request(url.origin + "/api/news");
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const results = await Promise.allSettled(SOURCES.map(fetchSource));
    let items = [];
    const failed = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") items = items.concat(r.value);
      else failed.push(SOURCES[i].id);
    });
    items.sort((a, b) => b.date - a.date);

    const response = new Response(
      JSON.stringify({ updated: Date.now(), failed, items: items.slice(0, 300) }),
      { headers: { ...CORS, "Cache-Control": "public, max-age=300" } }
    );
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};
