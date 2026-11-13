/**
 * Kroma Clip Professional Design System Tokens
 * Strictly adhering to:
 * - Background: #111315
 * - Surface: #191C20
 * - Elevated surface: #20242A
 * - Border: #292E34
 * - Primary text: #E7E9EC
 * - Secondary text: #9299A3
 * - Accent: #B6F36B (Lime highlight)
 *
 * Anti-slop discipline: No decorative pulsing dots, no code-comment headers,
 * no static pill enclosures, no fake cocktail scoreboards.
 */

export const THEME_COLORS = {
  bg: '#111315',
  surface: '#191C20',
  surfaceElevated: '#20242A',
  surfaceHover: '#262B32',
  border: '#292E34',
  borderMuted: '#383F47',
  textPrimary: '#E7E9EC',
  textSecondary: '#9299A3',
  textTertiary: '#626871',
  accent: '#B6F36B',
  accentHover: '#A5E456',
  accentMuted: 'rgba(182, 243, 107, 0.12)',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
} as const;

export const TYPOGRAPHY = {
  fontSans: "'Plus Jakarta Sans', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
} as const;

export const WORKSPACE_VIEWS = [
  { id: 'library', label: 'Media Ingest', icon: 'Film' },
  { id: 'rules', label: 'Clipping Rules', icon: 'Sliders' },
  { id: 'analysis', label: 'Analysis Engine', icon: 'Cpu' },
  { id: 'candidates', label: 'Clip Candidates', icon: 'Layers' },
  { id: 'editor', label: 'Clip Editor', icon: 'Scissors' },
  { id: 'export', label: 'Render Queue', icon: 'Download' },
  { id: 'publish', label: 'Social Schedule', icon: 'Calendar' },
] as const;

export type WorkspaceViewId = (typeof WORKSPACE_VIEWS)[number]['id'];
