import type { FocusPage } from './types';
import { isPastDate, parseIsoDate, startOfToday } from './dates';

const modules = import.meta.glob<FocusPage>('../data/focus/*.json', {
  eager: true,
  import: 'default',
});

export function getAllFocusPages(): FocusPage[] {
  return Object.entries(modules)
    .filter(([path]) => !path.includes('_TEMPLATE'))
    .map(([, page]) => page);
}

export function getFocusPage(slug: string): FocusPage | undefined {
  return getAllFocusPages().find((p) => p.slug === slug);
}

export interface FocusGridItem {
  city: string;
  date: string;
  img: string;
  url: string;
  tag: string;
  sortDate: Date;
}

function toGridItem(page: FocusPage): FocusGridItem {
  return {
    city: page.city,
    date: page.gridDate,
    img: page.poster,
    url: `/focus/${page.slug}`,
    tag: page.year,
    sortDate: parseIsoDate(page.countdown),
  };
}

export function getFocusGridSplit(today = startOfToday()) {
  const items = getAllFocusPages().map(toGridItem);

  const upcoming = items
    .filter((item) => !isPastDate(item.sortDate, today))
    .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

  const archives = items
    .filter((item) => isPastDate(item.sortDate, today))
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  return { upcoming, archives };
}

/** @deprecated Utiliser getFocusGridSplit */
export function getFocusGridItems() {
  const { upcoming, archives } = getFocusGridSplit();
  return [...upcoming, ...archives];
}
