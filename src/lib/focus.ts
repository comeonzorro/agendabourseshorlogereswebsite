import type { FocusPage } from './types';

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

export function getFocusGridItems() {
  return getAllFocusPages()
    .map((p) => ({
      city: p.city,
      date: p.gridDate,
      img: p.poster,
      url: `/focus/${p.slug}`,
      tag: p.year,
    }))
    .sort((a, b) => (a.tag === b.tag ? 0 : a.tag > b.tag ? -1 : 1));
}
