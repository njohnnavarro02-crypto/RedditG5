import {Post} from './types';

/** 12400 -> "12.4k", 8421 -> "8.4k", 245 -> "245" */
export function fmt(n: number): string {
  if (n >= 1000) {
    const v = (n / 1000).toFixed(1).replace(/\.0$/, '');
    return v + 'k';
  }
  return String(n);
}

/** Displayed score = base score + the user's active vote. */
export function scoreOf(p: Post): number {
  return p.score + (p.myVote ?? 0);
}
