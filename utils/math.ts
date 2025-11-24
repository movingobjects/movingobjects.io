/**
 * Linear interpolation between two values
 * @param start - Starting value
 * @param end - Ending value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Normalize a value to a 0-1 range
 * @param value - Value to normalize
 * @param min - Minimum of range
 * @param max - Maximum of range
 * @returns Normalized value (0-1)
 */
export function norm(value: number, min: number, max: number): number {
  return (value - min) / (max - min)
}

/**
 * Map a value from one range to another
 * @param value - Value to map
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Mapped value
 */
export function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return lerp(outMin, outMax, norm(value, inMin, inMax))
}

/**
 * Generate a random number between two values
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Random number in range
 */
export function random(min: number = 0, max: number = 1): number {
  return Math.random() * (max - min) + min
}

/**
 * Generate a random integer between two values
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer in range
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Interpolate between colors in a gradient
 * @param t - Position in gradient (0-1)
 * @param stops - Array of color stops, each with position (0-1) and color (hex string)
 * @returns Interpolated color as hex string
 */
export function lerpGradient(t: number, stops: readonly { readonly position: number, readonly color: string }[]): string {
  // Clamp t to 0-1
  t = Math.max(0, Math.min(1, t))

  // Find the two stops we're between
  let stopIndex = 0
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i]!.position && t <= stops[i + 1]!.position) {
      stopIndex = i
      break
    }
  }

  const startStop = stops[stopIndex]!
  const endStop = stops[stopIndex + 1]!

  // Normalize t between the two stops
  const localT = norm(t, startStop.position, endStop.position)

  // Parse hex colors
  const parseHex = (hex: string) => {
    let cleaned = hex.replace('#', '')

    // Expand 3-char hex to 6-char (e.g., "f57" -> "ff5577")
    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map(c => c + c).join('')
    }

    return {
      r: parseInt(cleaned.substring(0, 2), 16),
      g: parseInt(cleaned.substring(2, 4), 16),
      b: parseInt(cleaned.substring(4, 6), 16)
    }
  }

  const startColor = parseHex(startStop.color)
  const endColor = parseHex(endStop.color)

  // Interpolate each channel
  const r = Math.round(lerp(startColor.r, endColor.r, localT))
  const g = Math.round(lerp(startColor.g, endColor.g, localT))
  const b = Math.round(lerp(startColor.b, endColor.b, localT))

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  const val = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  return val;
}
