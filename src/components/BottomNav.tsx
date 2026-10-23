import React from 'react';
import { ActiveTab } from '../types';
import { toBengaliNumber } from '../constants';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  savedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, savedCount }) => {
  return (
    <nav>
      <button
        id="tabAll"
        type="button"
        className={activeTab === 'all' ? 'active' : ''}
        onClick={() => onTabChange('all')}
      >
        <span>সব খবর</span>
      </button>

      <button
        id="tabSaved"
        type="button"
        className={activeTab === 'saved' ? 'active' : ''}
        onClick={() => onTabChange('saved')}
      >
        <span>সংরক্ষিত</span>
        {savedCount > 0 && (
          <span className="badge">{toBengaliNumber(savedCount)}</span>
        )}
      </button>
    </nav>
  );
};
