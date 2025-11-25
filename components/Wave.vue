<template>
  <canvas ref="canvasRef" class="wave-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { THEME } from '~/config/theme'

const CONFIG = {
  amplitude: 45,
  wavelength: 25,
  thickness: 5,
  cycles: 2.5,
  speed: 2.0
} as const

// Animation constants
const SECTIONS_PER_WAVELENGTH = 4
const SPEED_SCALE_FACTOR = 100
const SAMPLES_PER_WAVELENGTH = 400
const FPS_NORMALIZATION = 60 // Normalize to 60fps for consistent speed

const canvasRef = ref<HTMLCanvasElement | null>(null)

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let animId: number | null = null
let normalizedPhase = 0
let lastTime = 0

/**
 * Normalizes parameter t to position within one wavelength (0 to wavelength)
 * Handles negative values correctly using modulo arithmetic
 */
function normalizeParameter(parameterT: number, wavelength: number): number {
  return ((parameterT % wavelength) + wavelength) % wavelength
}

/**
 * Calculates section boundaries based on arc lengths for constant speed movement
 */
function calculateSectionBoundaries(wavelength: number, amplitude: number) {
  const radius = wavelength / SECTIONS_PER_WAVELENGTH
  const verticalLength = 2 * amplitude
  const arcLength = Math.PI * radius
  const totalArcLength = 2 * verticalLength + 2 * arcLength

  return {
    section1End: verticalLength,
    section2End: verticalLength + arcLength,
    section3End: 2 * verticalLength + arcLength,
    section4End: totalArcLength,
    totalArcLength,
    verticalLength,
    arcLength,
  }
}

/**
 * Calculates the X position for a given parameter t
 * Parametric function where both X and Y are functions of parameter t
 */
function getWaveX(parameterT: number): number {
  if (!canvas) return 0

  const { wavelength, amplitude, thickness } = CONFIG
  const radius = wavelength / SECTIONS_PER_WAVELENGTH
  const effectiveAmplitude = amplitude - thickness / 2
  const waveAmplitude = (effectiveAmplitude - 2 * radius) / 2

  const normalizedT = normalizeParameter(parameterT, wavelength)
  const sections = calculateSectionBoundaries(wavelength, waveAmplitude)

  // Map parameter t to actual arc length position
  const arcPosition = (normalizedT / wavelength) * sections.totalArcLength

  if (arcPosition < sections.section1End) {
    // Section 1: Vertical rise - X stays at 0
    return 0
  } else if (arcPosition < sections.section2End) {
    // Section 2: Top circular arc - X goes from 0 to 2*radius
    const sectionProgress = (arcPosition - sections.section1End) / sections.arcLength
    const angle = Math.PI * (1 - sectionProgress)
    return radius + radius * Math.cos(angle)
  } else if (arcPosition < sections.section3End) {
    // Section 3: Vertical fall - X stays at 2*radius
    return 2 * radius
  } else {
    // Section 4: Bottom circular arc - X goes from 2*radius to 4*radius (wavelength)
    const sectionProgress = (arcPosition - sections.section3End) / sections.arcLength
    const angle = Math.PI * (1 - sectionProgress)
    return 3 * radius + radius * Math.cos(angle)
  }
}

/**
 * Calculates the Y position for a given parameter t
 * Parametric function where both X and Y are functions of parameter t
 */
function getWaveY(parameterT: number, canvasHeight: number): number {
  if (!canvas) return 0

  const { wavelength, amplitude, thickness } = CONFIG
  const canvasCenterY = canvasHeight / 2
  const radius = wavelength / SECTIONS_PER_WAVELENGTH
  const effectiveAmplitude = amplitude - thickness / 2
  const waveAmplitude = (effectiveAmplitude - 2 * radius) / 2

  const normalizedT = normalizeParameter(parameterT, wavelength)
  const sections = calculateSectionBoundaries(wavelength, waveAmplitude)

  // Map parameter t to actual arc length position
  const arcPosition = (normalizedT / wavelength) * sections.totalArcLength

  if (arcPosition < sections.section1End) {
    // Section 1: Vertical rise - Y goes from bottom to top
    const sectionProgress = arcPosition / sections.verticalLength
    return canvasCenterY + waveAmplitude - (2 * waveAmplitude * sectionProgress)
  } else if (arcPosition < sections.section2End) {
    // Section 2: Top circular arc - bulges upward
    const sectionProgress = (arcPosition - sections.section1End) / sections.arcLength
    const angle = Math.PI * sectionProgress
    return canvasCenterY - waveAmplitude - radius * Math.sin(angle)
  } else if (arcPosition < sections.section3End) {
    // Section 3: Vertical fall - Y goes from top to bottom
    const sectionProgress = (arcPosition - sections.section2End) / sections.verticalLength
    return canvasCenterY - waveAmplitude + (2 * waveAmplitude * sectionProgress)
  } else {
    // Section 4: Bottom circular arc - bulges downward
    const sectionProgress = (arcPosition - sections.section3End) / sections.arcLength
    const angle = Math.PI * sectionProgress
    return canvasCenterY + waveAmplitude + radius * Math.sin(angle)
  }
}

/**
 * Draws the wave on the canvas
 */
function drawWave(phase: number): void {
  if (!canvas || !ctx) return

  const { wavelength, cycles, thickness } = CONFIG

  // Use CSS dimensions for drawing, not the scaled canvas dimensions
  const canvasWidth = canvas.getBoundingClientRect().width
  const canvasHeight = canvas.getBoundingClientRect().height

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  if (cycles <= 0) return

  // Calculate the total length to draw (in parameter space)
  const totalParameterLength = cycles * wavelength

  // Calculate where to center the wave horizontally on the canvas
  const canvasCenterX = canvasWidth / 2

  // Calculate adaptive sample interval to ensure smooth curves
  const adaptiveSampleInterval = wavelength / SAMPLES_PER_WAVELENGTH

  // Draw the wave by sampling parameter t
  ctx.beginPath()
  ctx.strokeStyle = THEME.colors.secondary;
  ctx.lineWidth = thickness
  ctx.lineCap = 'round'

  let isFirstPoint = true

  // Sample points from phase to phase + totalParameterLength
  for (let parameterT = phase; parameterT <= phase + totalParameterLength; parameterT += adaptiveSampleInterval) {
    // Get parametric positions (uses modulo internally for repeating pattern)
    const waveXInCycle = getWaveX(parameterT)
    const waveY = getWaveY(parameterT, canvasHeight)

    // Calculate absolute X position across multiple cycles
    const cycleNumber = Math.floor(parameterT / wavelength)
    const absoluteWaveX = cycleNumber * wavelength + waveXInCycle

    // Center the wave: shift so the middle of displayed portion is at canvas center
    const canvasX = canvasCenterX + absoluteWaveX - phase - totalParameterLength / 2
    const canvasY = waveY

    // Draw all points - canvas will naturally clip anything outside bounds
    if (isFirstPoint) {
      ctx.moveTo(canvasX, canvasY)
      isFirstPoint = false
    } else {
      ctx.lineTo(canvasX, canvasY)
    }
  }

  ctx.stroke()
}

/**
 * Animation loop
 */
function animate(timestamp: number): void {
  if (!canvas || !ctx) return

  const { wavelength, speed } = CONFIG

  // Calculate delta time in seconds
  if (lastTime === 0) {
    lastTime = timestamp
  }
  const deltaTime = (timestamp - lastTime) / 1000
  lastTime = timestamp

  // Update normalized phase (wavelength-independent)
  normalizedPhase += (speed / SPEED_SCALE_FACTOR) * deltaTime * FPS_NORMALIZATION

  // Convert normalized phase to actual phase by multiplying with current wavelength
  const actualPhase = normalizedPhase * wavelength

  drawWave(actualPhase)
  animId = requestAnimationFrame(animate)
}

onMounted(() => {
  if (!canvasRef.value) return

  canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  if (!ctx) return

  // Set canvas size for high-DPI displays
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr

  // Scale context to match device pixel ratio
  ctx.scale(dpr, dpr)

  // Store the CSS dimensions for drawing calculations
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'

  // Start animation
  lastTime = 0
  animId = requestAnimationFrame(animate)
})

onUnmounted(() => {
  if (animId !== null) {
    cancelAnimationFrame(animId)
  }
})
</script>

<style scoped>
.wave-canvas {
  position: fixed;
  bottom: 3em;
  left: 3em;
  width: 100px;
  height: 100px;
  vertical-align: baseline;
}
</style>
