// Chart theme utilities. Reads CSS variables at render time so charts
// recolor on theme flip — same approach as legacy chartTheme() (line 2348).

/**
 * Reads a CSS variable from :root at call time.
 * Returns the computed value or fallback.
 */
export function getCSSVar(name: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Returns the current theme's chart-relevant colors. */
export function getChartTheme() {
  return {
    text: getCSSVar('--text', '#e4e7f0'),
    text2: getCSSVar('--text-2', '#8b91a8'),
    text3: getCSSVar('--text-3', '#525870'),
    bg: getCSSVar('--bg', '#0b0d14'),
    bg2: getCSSVar('--bg-2', '#111420'),
    bg3: getCSSVar('--bg-3', '#181c2b'),
    card: getCSSVar('--card', '#151825'),
    cardBorder: getCSSVar('--card-border', 'rgba(255,255,255,0.07)'),
    accent: getCSSVar('--accent', '#7c6ff7'),
    accent2: getCSSVar('--accent-2', '#5ee8b0'),
    income: getCSSVar('--income', '#5ee8b0'),
    expense: getCSSVar('--expense', '#ff6b8a'),
    warning: getCSSVar('--warning', '#ffa940'),
  };
}

/** Category color palette — matches legacy CAT_COLORS (line 2044). */
export const CATEGORY_COLORS = [
  '#7c6ff7', '#5ee8b0', '#ff6b8a', '#ffa940', '#38bdf8',
  '#f472b6', '#a3e635', '#fb923c', '#66d9ef', '#c084fc',
  '#34d399', '#ef4444', '#fbbf24', '#06d6a0', '#8b5cf6',
  '#e879f9', '#22d3ee', '#f97316', '#84cc16', '#ec4899',
];

/** Returns a color from the palette by index (wraps). */
export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

/** Common font family for chart labels. */
export const CHART_FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

/** Formats a number as ₹ currency (Indian locale). */
export function formatCurrency(value: number): string {
  return '₹' + value.toLocaleString('en-IN');
}

/** Shared grid/tick/legend options derived from current theme. */
export function getChartDefaults() {
  const t = getChartTheme();
  return {
    font: { family: CHART_FONT_FAMILY, size: 11 },
    grid: { color: t.cardBorder, drawBorder: false },
    ticks: { color: t.text3, font: { family: CHART_FONT_FAMILY, size: 10 } },
    legend: { labels: { color: t.text2, font: { family: CHART_FONT_FAMILY, size: 11 } } },
  };
}
