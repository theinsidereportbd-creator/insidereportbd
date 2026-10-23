export interface NewsSource {
  id: string;
  name: string;
  url: string;
  color: string;
  type: string;
}

export interface NewsItem {
  source: string;
  title: string;
  link: string;
  date: number;
  summary: string;
  image: string;
}

export type ActiveTab = 'all' | 'saved';
export type ThemeMode = 'light' | 'dark';
