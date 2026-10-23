import React, { useState } from 'react';
import { NewsItem } from '../types';
import { formatTimeAgo, getSourceById } from '../constants';

interface NewsCardProps {
  item: NewsItem;
  isSaved: boolean;
  onToggleSave: (item: NewsItem) => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item, isSaved, onToggleSave }) => {
  const [imageError, setImageError] = useState(false);
  const sourceInfo = getSourceById(item.source);

  return (
    <div className="card">
      {item.image && !imageError && (
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      )}

      <div className="body">
        <div className="src" style={{ color: sourceInfo.color }}>
          {sourceInfo.name}
        </div>

        <div className="title" title={item.title}>
          {item.title}
        </div>

        {item.summary && (
          <div className="sum">
            {item.summary}
          </div>
        )}

        <div className="meta">
          <span>{formatTimeAgo(item.date)}</span>
          <div className="meta-actions">
            <a
              className="read"
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              মূল সাইটে পড়ুন ↗
            </a>
            <button
              type="button"
              className={isSaved ? 'saved' : ''}
              aria-label={isSaved ? 'সংরক্ষণ বাতিল' : 'সংরক্ষণ করুন'}
              title={isSaved ? 'সংরক্ষণ বাতিল' : 'সংরক্ষণ করুন'}
              onClick={(e) => {
                e.preventDefault();
                onToggleSave(item);
              }}
            >
              {isSaved ? '★' : '☆'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
