// frontend/src/lib/tokens.ts
// Design tokens mirrored in JS for Three.js usage.
// Keep in sync with src/styles/tokens.css.

export const tokens = {
  // Colors
  colorGround:         '#0E0E0E',
  colorSurface:        '#161616',
  colorBorder:         '#2A2A2A',
  colorBorderStrong:   '#404040',
  colorTextPrimary:    '#F0EDE8',
  colorTextSecondary:  '#8A8A8A',
  colorTextMuted:      '#4A4A4A',
  colorAccent:         '#4A7FD4',
  colorAccentDim:      '#1E3A5F',
  colorSuccess:        '#3D7A5F',
  colorWarning:        '#8A6A2A',
  colorError:          '#8A3A3A',

  // Three.js material colors (as hex integers)
  threeGround:         0x0E0E0E,
  threeSurface:        0x161616,
  threeBorder:         0x2A2A2A,
  threeBorderStrong:   0x404040,
  threeTextPrimary:    0xF0EDE8,
  threeAccent:         0x4A7FD4,
  threeAccentDim:      0x1E3A5F,

  // 3D hero material colors
  threeWalls:          0x2A2A2A,
  threeFloor:          0x161616,
  threeAccentEdge:     0x4A7FD4,
  threeGrid:           0x0E0E0E,
} as const;

export type Tokens = typeof tokens;
