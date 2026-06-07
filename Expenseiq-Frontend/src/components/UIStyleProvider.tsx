// Pure data registry for the 6 UI styles shown on the Appearance page.
// No DOM side effects — styles are applied only within the Appearance page
// via inline CSS on the sections, not globally.

export const UI_STYLES = [
  {
    value: 'basic',
    label: 'Basic',
    description: 'Flat & minimal',
    radius: '6px',
    shadow: 'none',
    blur: false,
    shine: false,
    borderOpacity: 0.15,
    cardBgOpacity: 1,
  },
  {
    value: 'robotic',
    label: 'Robotic',
    description: 'Sharp & technical',
    radius: '0px',
    shadow: 'none',
    blur: false,
    shine: false,
    borderOpacity: 0.25,
    cardBgOpacity: 1,
  },
  {
    value: 'modern',
    label: 'Modern',
    description: 'Clean & balanced',
    radius: '12px',
    shadow: '0 2px 16px rgba(0,0,0,0.14)',
    blur: false,
    shine: false,
    borderOpacity: 0.08,
    cardBgOpacity: 1,
  },
  {
    value: 'stylish',
    label: 'Stylish',
    description: 'Pill shapes & glow',
    radius: '20px',
    shadow: '0 4px 24px rgba(0,0,0,0.18)',
    blur: false,
    shine: false,
    borderOpacity: 0.12,
    cardBgOpacity: 1,
  },
  {
    value: 'glassy',
    label: 'Glassy',
    description: 'Frosted & translucent',
    radius: '14px',
    shadow: '0 8px 32px rgba(0,0,0,0.22)',
    blur: true,
    shine: false,
    borderOpacity: 0.18,
    cardBgOpacity: 0.55,
  },
  {
    value: 'glossy',
    label: 'Glossy',
    description: 'Gradient & vivid depth',
    radius: '14px',
    shadow: '0 6px 28px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
    blur: false,
    shine: true,
    borderOpacity: 0.12,
    cardBgOpacity: 1,
  },
] as const;

export type UIStyleValue = typeof UI_STYLES[number]['value'];
export type UIStyleDef = typeof UI_STYLES[number];

export function getUIStyle(value: UIStyleValue): UIStyleDef {
  return UI_STYLES.find((s) => s.value === value) ?? UI_STYLES[2];
}
