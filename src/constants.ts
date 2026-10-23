import { NewsSource } from './types';

export const API_BASE = "https://quiet-sea-0b94.theinsidereportbd.workers.dev";

export const SOURCES: NewsSource[] = [
  { id: "prothomalo", name: "প্রথম আলো", url: "https://www.prothomalo.com/feed/", color: "#d32f2f", type: "news" },
  { id: "dailystar", name: "ডেইলি স্টার", url: "https://www.thedailystar.net/taxonomy/term/1/rss.xml", color: "#1565c0", type: "news" },
  { id: "jagonews24", name: "জাগো নিউজ", url: "https://www.jagonews24.com/rss/rss.xml", color: "#2e7d32", type: "news" },
  { id: "tirbd", name: "The Inside Report BD", url: "https://theinsidereportbd.blogspot.com/feeds/posts/default?alt=rss", color: "#f5c542", type: "news" },
  { id: "ajkerpatrika", name: "আজকের পত্রিকা", url: "https://www.ajkerpatrika.com/feed/", color: "#ef6c00", type: "news" },
  { id: "bdjournal", name: "বাংলাদেশ জার্নাল", url: "https://www.bd-journal.com/feed/latest-rss.xml", color: "#6a1b9a", type: "news" },
  { id: "bd24live", name: "বিডি২৪ লাইভ", url: "https://www.bd24live.com/bangla/feed/", color: "#00838f", type: "news" },
  { id: "aljazeera", name: "আল জাজিরা (ইংরেজি)", url: "https://www.aljazeera.com/xml/rss/all.xml", color: "#b8860b", type: "news" }
];

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toBengaliNumber(n: number | string): string {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[parseInt(d, 10)]);
}

export function formatTimeAgo(ms: number): string {
  if (!ms) return "";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "এইমাত্র";
  if (s < 3600) return `${toBengaliNumber(Math.floor(s / 60))} মিনিট আগে`;
  if (s < 86400) return `${toBengaliNumber(Math.floor(s / 3600))} ঘণ্টা আগে`;
  return `${toBengaliNumber(Math.floor(s / 86400))} দিন আগে`;
}

export function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return (tmp.textContent || "").replace(/\s+/g, " ").trim();
}

export function getSourceById(id: string): { name: string; color: string } {
  const found = SOURCES.find((s) => s.id === id);
  return found ? { name: found.name, color: found.color } : { name: id, color: "#888888" };
}
