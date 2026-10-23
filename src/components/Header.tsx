import React from 'react';
import { SOURCES } from '../constants';
import { ThemeMode } from '../types';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSource: string;
  onSelectSource: (sourceId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleTheme,
  onRefresh,
  isRefreshing,
  searchQuery,
  onSearchChange,
  selectedSource,
  onSelectSource,
}) => {
  return (
    <header>
      <div className="top">
        <h1>
          দ্য ইনসাইড রিপোর্ট <span>বিডি</span>
        </h1>
        <div className="actions">
          <button
            id="btnTheme"
            aria-label="থিম বদলান"
            onClick={onToggleTheme}
            title="ডার্ক / লাইট মোড"
          >
            🌓
          </button>
          <button
            id="btnRefresh"
            aria-label="রিফ্রেশ"
            onClick={onRefresh}
            className={isRefreshing ? 'spinning' : ''}
            title="খবর রিফ্রেশ করুন"
          >
            ⟳
          </button>
        </div>
      </div>

      <div className="search-wrapper">
        <input
          id="search"
          type="search"
          placeholder="খবর খুঁজুন..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
        />
        {searchQuery && (
          <button
            type="button"
            className="search-clear"
            onClick={() => onSearchChange('')}
            aria-label="মুছে ফেলুন"
            title="মুছে ফেলুন"
          >
            ✕
          </button>
        )}
      </div>

      <div id="chips" className="chips">
        <button
          type="button"
          className={`chip ${selectedSource === 'all' ? 'on' : ''}`}
          onClick={() => onSelectSource('all')}
        >
          সব
        </button>
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chip ${selectedSource === s.id ? 'on' : ''}`}
            onClick={() => onSelectSource(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>
    </header>
  );
};
