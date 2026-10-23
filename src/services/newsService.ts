import { NewsItem } from '../types';
import { API_BASE, SOURCES, stripHtml } from '../constants';

export async function fetchViaWorker(): Promise<NewsItem[]> {
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/news`);
  if (!res.ok) {
    throw new Error(`Worker responded with status ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

interface Rss2JsonItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  content?: string;
  thumbnail?: string;
  enclosure?: { link?: string };
}

interface Rss2JsonResponse {
  status: string;
  items?: Rss2JsonItem[];
}

export async function fetchViaRss2Json(): Promise<NewsItem[]> {
  const promises = SOURCES.map(async (source): Promise<NewsItem[]> => {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`);
      if (!res.ok) return [];
      const json: Rss2JsonResponse = await res.json();
      if (json.status !== 'ok' || !Array.isArray(json.items)) return [];

      return json.items.map((it): NewsItem => {
        let img = it.thumbnail || (it.enclosure && it.enclosure.link) || '';
        if (!img) {
          const match = /<img[^>]+src=["']([^"']+)/i.exec(it.content || it.description || '');
          img = match ? match[1] : '';
        }

        const dateStr = (it.pubDate || '').replace(' ', 'T') + 'Z';
        const parsedDate = Date.parse(dateStr) || Date.now();

        return {
          source: source.id,
          title: it.title || 'শিরোনাম নেই',
          link: it.link || source.url,
          date: parsedDate,
          summary: stripHtml(it.description || it.content || '').slice(0, 160),
          image: img,
        };
      });
    } catch {
      return [];
    }
  });

  const results = await Promise.allSettled(promises);
  let allItems: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      allItems = allItems.concat(r.value);
    }
  }
  return allItems;
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  try {
    if (API_BASE) {
      const workerItems = await fetchViaWorker();
      if (workerItems && workerItems.length > 0) {
        return workerItems;
      }
    }
  } catch (err) {
    console.warn('Worker fetch failed, trying RSS2JSON fallback:', err);
  }

  // Fallback to RSS2JSON
  const rssItems = await fetchViaRss2Json();
  if (rssItems && rssItems.length > 0) {
    return rssItems;
  }

  throw new Error('All news sources failed to load');
}
