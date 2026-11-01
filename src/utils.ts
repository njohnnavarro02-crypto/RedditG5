import {Post} from './types';

/** 12400 -> "12.4k", 8421 -> "8.4k", 245 -> "245" */
export function fmt(n: number): string {
  if (n >= 1000) {
    const v = (n / 1000).toFixed(1).replace(/\.0$/, '');
    return v + 'k';
  }
  return String(n);
}

/** Displayed score of the post (already includes all applied votes). */
export function scoreOf(p: Post): number {
  return p.score;
}
