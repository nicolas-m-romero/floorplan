// frontend/src/lib/units.ts
// All unit conversion utilities. All dimensions are stored in cm.

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

// ── Real-world conversions ──────────────────────────────────────────────────

/** Centimeters → "X' Y"" (imperial display string) */
export function cmToImperial(cm: number): string {
  const totalInches = cm / CM_PER_INCH;
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = Math.round(totalInches % INCHES_PER_FOOT);
  return `${feet}' ${inches}"`;
}

/** Centimeters → metric display string ("1.20m" or "45cm") */
export function cmToMetric(cm: number): string {
  return cm >= 100 ? `${(cm / 100).toFixed(2)}m` : `${cm.toFixed(0)}cm`;
}

/** Display cm based on the active unit system */
export function cmToDisplay(cm: number, unitSystem: 'imperial' | 'metric'): string {
  return unitSystem === 'imperial' ? cmToImperial(cm) : cmToMetric(cm);
}

/** Feet + inches → cm */
export function imperialToCm(feet: number, inches: number): number {
  return (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;
}

/** Meters → cm */
export function mToCm(m: number): number {
  return m * 100;
}

/** cm → meters */
export function cmToM(cm: number): number {
  return cm / 100;
}

// ── Pixel ↔ real-world conversions ─────────────────────────────────────────

/** Convert pixel distance (at original image resolution) to centimeters */
export function pxToCm(px: number, pixelsPerCm: number): number {
  return px / pixelsPerCm;
}

/** Convert centimeters to pixel distance (at original image resolution) */
export function cmToPx(cm: number, pixelsPerCm: number): number {
  return cm * pixelsPerCm;
}

// ── Canvas display scale conversions ───────────────────────────────────────

/**
 * Convert a pixel position in the original floor plan image
 * to a pixel position on the Konva display canvas.
 */
export function imagePxToCanvasPx(imagePx: number, displayScale: number): number {
  return imagePx * displayScale;
}

/**
 * Convert a pixel position on the Konva display canvas
 * back to original floor plan image pixel coordinates.
 */
export function canvasPxToImagePx(canvasPx: number, displayScale: number): number {
  return canvasPx / displayScale;
}

/**
 * Convert a real-world dimension in cm to pixels on the Konva canvas.
 * pixelsPerCm is at original image resolution.
 * displayScale is the ratio of canvas display size to original image size.
 */
export function cmToCanvasPx(
  cm: number,
  pixelsPerCm: number,
  displayScale: number,
): number {
  return cm * pixelsPerCm * displayScale;
}

/**
 * Compute the display scale that fits a floor plan image inside a container,
 * preserving aspect ratio (object-fit: contain).
 */
export function computeDisplayScale(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): number {
  return Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
}

// ── Three.js (meters) ───────────────────────────────────────────────────────

/** Convert image pixels to Three.js world meters */
export function imagePxToMeters(px: number, pixelsPerCm: number): number {
  return px / pixelsPerCm / 100;
}

/** Convert cm to Three.js world meters */
export function cmToMeters(cm: number): number {
  return cm / 100;
}
