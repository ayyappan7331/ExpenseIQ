import { ThemeTokens } from './types';

export const DARK_TOKENS: ThemeTokens = {
  bg: '#08090f', color: '#e4e7f0',
  cardBg: 'rgba(8,12,24,0.25)', cardBorder: 'rgba(255,255,255,0.15)',
  cardShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 24px rgba(124,111,247,0.08)',
  subtitle: 'rgba(255,255,255,0.4)', tagline: 'rgba(255,255,255,0.5)',
  taglineDot0: '#7c6ff7', taglineDot1: '#5ee8b0',
  dot0Shadow: '0 0 8px 2px rgba(124,111,247,0.7)', dot1Shadow: '0 0 8px 2px rgba(94,232,176,0.6)',
  tracker: 'rgba(255,255,255,0.35)',
  waveAlphaBase: 0.14, waveColors: [[124,111,247],[99,102,241]],
  glowA: 'rgba(124,111,247,0.07)', glowB: 'rgba(94,232,176,0.05)',
  inpBg: 'rgba(255,255,255,0.07)', inpBorder: 'rgba(255,255,255,0.18)',
  inpFocus: '0 0 0 3px rgba(124,111,247,0.35)', inpBlur: 'none',
  inpText: '#ffffff', inpPh: 'rgba(255,255,255,0.3)',
  linkColor: '#a78bfa', logoIQ: 'linear-gradient(135deg,#5ee8b0 0%,#38bdf8 100%)',
};

export const LIGHT_TOKENS: ThemeTokens = {
  bg: '#eeeaf4', color: '#1a1a2e',
  cardBg: 'rgba(250,250,255,0.28)', cardBorder: 'rgba(255,255,255,0.5)',
  cardShadow: '0 12px 40px rgba(0,0,0,0.08)',
  subtitle: 'rgba(30,30,60,0.5)', tagline: 'rgba(30,30,60,0.55)',
  taglineDot0: '#7c6ff7', taglineDot1: '#0ea5e9',
  dot0Shadow: '0 0 8px 2px rgba(124,111,247,0.45)', dot1Shadow: '0 0 8px 2px rgba(14,165,233,0.45)',
  tracker: 'rgba(30,30,60,0.4)',
  waveAlphaBase: 0.16, waveColors: [[148,120,255],[80,140,230]],
  glowA: 'rgba(124,111,247,0.08)', glowB: 'rgba(14,165,233,0.06)',
  inpBg: 'rgba(255,255,255,0.45)', inpBorder: 'rgba(120,120,160,0.12)',
  inpFocus: '0 0 0 3px rgba(109,82,216,0.22)', inpBlur: 'blur(8px)',
  inpText: '#1a1a2e', inpPh: 'rgba(30,30,60,0.35)',
  linkColor: '#6d52d8', logoIQ: 'linear-gradient(135deg,#5ee8b0 0%,#38bdf8 100%)',
};

export const LOGIN_THEME_KEY = 'expenseiq_login_theme';
