export interface ThemeTokens {
  bg: string;
  color: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  subtitle: string;
  tagline: string;
  taglineDot0: string;
  taglineDot1: string;
  dot0Shadow: string;
  dot1Shadow: string;
  tracker: string;
  waveAlphaBase: number;
  waveColors: [number[], number[]];
  glowA: string;
  glowB: string;
  inpBg: string;
  inpBorder: string;
  inpFocus: string;
  inpBlur: string;
  inpText: string;
  inpPh: string;
  linkColor: string;
  logoIQ: string;
}

export type ViewState =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'passwordless-login';

export interface TooltipState {
  lines: string[];
  x: number;
  y: number;
  visible: boolean;
}

export interface SharedFormProps {
  theme: 'dark' | 'light';
  onSwitchView: (view: ViewState) => void;
  showTooltip: (el: HTMLElement, fieldKey: string) => void;
  hideTooltip: () => void;
  fieldErrs: Record<string, string>;
  setFieldErrs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
}
