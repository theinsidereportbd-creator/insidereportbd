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
