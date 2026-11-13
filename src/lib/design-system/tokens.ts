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
  { id: 'library', label: '1. Media Ingest', path: '/library', icon: 'Film' },
  { id: 'rules', label: '2. Rule Config', path: '/rules', icon: 'Sliders' },
  { id: 'analysis', label: '3. Heuristic Engine', path: '/analysis', icon: 'Cpu' },
  { id: 'candidates', label: '4. Clip Candidates', path: '/candidates', icon: 'Layers' },
  { id: 'editor', label: '5. Clip Editor (NLE)', path: '/editor', icon: 'Scissors' },
  { id: 'export', label: '6. Render Queue', path: '/export', icon: 'Download' },
  { id: 'publish', label: '7. Social Schedule', path: '/publish', icon: 'Calendar' },
] as const;

export type WorkspaceViewId = (typeof WORKSPACE_VIEWS)[number]['id'];
