import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NewsItem, ActiveTab, ThemeMode } from './types';
import { Header } from './components/Header';
import { NewsCard } from './components/NewsCard';
import { BottomNav } from './components/BottomNav';
import { fetchAllNews } from './services/newsService';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? (JSON.parse(val) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => loadFromStorage<ThemeMode>('theme', 'light'));

  // News items state
  const [items, setItems] = useState<NewsItem[]>(() => loadFromStorage<NewsItem[]>('cache', []));
  const [savedItems, setSavedItems] = useState<NewsItem[]>(() => loadFromStorage<NewsItem[]>('saved', []));

  // Navigation & filters
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status & loading
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveToStorage('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Fetch news logic
  const loadNews = useCallback(async () => {
    setIsRefreshing(true);
    setStatusMessage('খবর লোড হচ্ছে...');

    try {
      const fetchedItems = await fetchAllNews();
      if (!fetchedItems.length) {
        throw new Error('No items returned');
      }

      // Sort newest first
      fetchedItems.sort((a, b) => b.date - a.date);

      setItems(fetchedItems);
      saveToStorage('cache', fetchedItems.slice(0, 200));
      setStatusMessage('');
    } catch (err) {
      console.error('Error fetching news:', err);
      const cached = loadFromStorage<NewsItem[]>('cache', []);
      setItems(cached);

      if (cached.length > 0) {
        setStatusMessage('ইন্টারনেট সমস্যা, আগের খবর দেখানো হচ্ছে');
      } else {
        setStatusMessage('খবর আনা যায়নি। ইন্টারনেট চেক করে রিফ্রেশ করুন।');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load and auto-refresh every 5 minutes
  useEffect(() => {
    loadNews();
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNews]);

  // Saved items toggle
  const toggleSave = useCallback((item: NewsItem) => {
    setSavedItems((prev) => {
      const exists = prev.some((s) => s.link === item.link);
      const updated = exists
        ? prev.filter((s) => s.link !== item.link)
        : [item, ...prev];

      saveToStorage('saved', updated);
      return updated;
    });
  }, []);

  const isItemSaved = useCallback(
    (link: string) => savedItems.some((s) => s.link === link),
    [savedItems]
  );

  // Filtered news items
  const filteredItems = useMemo(() => {
    const sourceList = activeTab === 'saved' ? savedItems : items;
    const q = searchQuery.trim().toLowerCase();

    return sourceList.filter((item) => {
      if (activeTab === 'all' && selectedSource !== 'all' && item.source !== selectedSource) {
        return false;
      }
      if (q) {
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const summaryMatch = (item.summary || '').toLowerCase().includes(q);
        if (!titleMatch && !summaryMatch) return false;
      }
      return true;
    });
  }, [activeTab, savedItems, items, selectedSource, searchQuery]);

  // Empty state handling message
  const emptyFeedback = useMemo(() => {
    if (statusMessage) return statusMessage;
    if (activeTab === 'saved' && savedItems.length === 0) {
      return 'কোনো সংরক্ষিত খবর নেই';
    }
    if (filteredItems.length === 0) {
      return searchQuery ? 'খোঁজার সাথে মিল রেখে কোনো খবর পাওয়া যায়নি' : 'কোনো খবর পাওয়া যায়নি';
    }
    return '';
  }, [statusMessage, activeTab, savedItems.length, filteredItems.length, searchQuery]);

  return (
    <div className="app-container">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onRefresh={loadNews}
        isRefreshing={isRefreshing}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSource={selectedSource}
        onSelectSource={setSelectedSource}
      />

      <main>
        {emptyFeedback && (
          <div id="status" className="status">
            {emptyFeedback}
          </div>
        )}

        <div id="list">
          {filteredItems.slice(0, 150).map((item) => (
            <NewsCard
              key={`${item.source}-${item.link}`}
              item={item}
              isSaved={isItemSaved(item.link)}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          // clear temporary status when tab changes
          if (statusMessage.startsWith('ইন্টারনেট সমস্যা')) {
            // keep warning
          } else {
            setStatusMessage('');
          }
        }}
        savedCount={savedItems.length}
      />
    </div>
  );
};

export default App;
