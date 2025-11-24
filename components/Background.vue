<template>
  <canvas ref="canvasRef" class="background-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { lerp, norm, random, lerpGradient } from '~/utils/math'
import { THEME } from '~/config/theme'

interface Position {
  x: number
  y: number
}

interface Target {
  x: number
  y: number
  strength: number
}

interface Tube {
  radius: number
  x: number
  y: number
  vx: number
  vy: number
  tail: Position[]
}

const CONFIG = {
  bgColor: THEME.colors.bg,
  tubeCount: 15,
  tubeRadiusMin: 25,
  tubeRadiusMax: 25,
  tubeRimWidth: 7,
  tailLength: 200,
  tailLineWidthMin: 0.75,
  tailLineWidthMax: 1,
  tailGradient: [
    { position: 0.0, color: '#40d' },
    { position: 0.5, color: '#40d' },
    { position: 1.0, color: '#292969' }
  ],
  tailGradientHeatmap: [
    { position: 0.0, color: '#f77' },
    { position: 0.1, color: '#c37' },
    { position: 0.2, color: '#d29' },
    { position: 0.3, color: '#62a' },
    { position: 0.5, color: '#337' },
    { position: 1.0, color: '#292969' }
  ],
  targetCount: 5,
  targetRadius: 20,
  targetStrength: 10,
  friction: 0.99,
  maxSpeed: 10,
  repulsionStrength: 50,
  repulsionDistance: 50
} as const

const canvasRef = ref<HTMLCanvasElement | null>(null)

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let animId: number | null = null
let tubes: Tube[] = []
let targets: Target[] = []

function createTubes(count: number): Tube[] {
  if (!canvas) return []

  const tubes: Tube[] = []

  for (let i = 0; i < count; i++) {
    const sizeFactor = random()
    const radius = lerp(CONFIG.tubeRadiusMin, CONFIG.tubeRadiusMax, sizeFactor)

    tubes.push({
      radius,
      x: random(0, canvas.width),
      y: random(0, canvas.height),
      vx: 0,
      vy: 0,
      tail: []
    })
  }

  return tubes
}

function applyGravity(obj: Tube): void {
  if (!canvas || targets.length === 0) return

  // Find the nearest target
  let nearestTarget = targets[0]!
  let nearestDistance = Infinity

  targets.forEach(target => {
    const dx = target.x - obj.x
    const dy = target.y - obj.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestTarget = target
    }
  })

  // Only apply gravity from the nearest target
  if (nearestDistance > 1) {
    const dx = nearestTarget.x - obj.x
    const dy = nearestTarget.y - obj.y

    // Use distance squared for smoother falloff, with a minimum distance to prevent extreme forces
    const minDistance = 50
    const effectiveDistance = Math.max(nearestDistance, minDistance)
    const force = nearestTarget.strength / effectiveDistance

    obj.vx += (dx / nearestDistance) * force
    obj.vy += (dy / nearestDistance) * force
  }
}

function applyRepulsion(obj: Tube): void {
  tubes.forEach(otherTube => {
    if (obj === otherTube) return

    const dx = obj.x - otherTube.x
    const dy = obj.y - otherTube.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Only apply repulsion if tubes are within repulsion distance
    if (distance < CONFIG.repulsionDistance && distance > 0) {
      // Stronger repulsion when closer
      const force = CONFIG.repulsionStrength / Math.max(25, distance * distance)

      obj.vx += (dx / distance) * force
      obj.vy += (dy / distance) * force
    }
  })
}

function updateTubeect(obj: Tube): void {
  if (!canvas) return

  // Add current position to tail
  obj.tail.push({ x: obj.x, y: obj.y })
  if (obj.tail.length > CONFIG.tailLength) {
    obj.tail.shift()
  }

  // Apply gravity from targets
  applyGravity(obj)

  // Apply repulsion from other tubes
  applyRepulsion(obj)

  // Apply friction
  obj.vx *= CONFIG.friction
  obj.vy *= CONFIG.friction

  // Limit max speed
  const speed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy)
  if (speed > CONFIG.maxSpeed) {
    obj.vx = (obj.vx / speed) * CONFIG.maxSpeed
    obj.vy = (obj.vy / speed) * CONFIG.maxSpeed
  }

  // Update position
  obj.x += obj.vx
  obj.y += obj.vy
}

function drawTailSegment(obj: Tube, segmentIndex: number): void {
  if (!ctx || obj.tail.length < 2 || segmentIndex >= obj.tail.length - 1) return

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const t = norm(segmentIndex, 0, obj.tail.length)
  const lineWidth = 2 * obj.radius * lerp(CONFIG.tailLineWidthMin, CONFIG.tailLineWidthMax, t)
  const color = lerpGradient(1 - t, CONFIG.tailGradient)
  const start = obj.tail[segmentIndex]!
  const end = obj.tail[segmentIndex + 1]!

  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()
}

function drawTubeectHead(obj: Tube): void {
  if (!ctx) return

  // Draw main circle
  ctx.fillStyle = lerpGradient(0, CONFIG.tailGradient)
  ctx.beginPath()
  ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2)
  ctx.fill()

  // Draw main circle
  ctx.fillStyle = CONFIG.bgColor
  ctx.beginPath()
  ctx.arc(obj.x, obj.y, obj.radius - CONFIG.tubeRimWidth, 0, Math.PI * 2)
  ctx.fill()
}

function drawAllTailsLayered(): void {
  if (!ctx) return

  // Find the maximum tail length among all tubes
  let maxTailLength = 0
  tubes.forEach(obj => {
    if (obj.tail.length > maxTailLength) {
      maxTailLength = obj.tail.length
    }
  })

  // Draw tail segments from oldest to newest across all tubes
  for (let segmentIndex = 0; segmentIndex < maxTailLength - 1; segmentIndex++) {
    tubes.forEach(obj => {
      if (segmentIndex < obj.tail.length - 1) {
        drawTailSegment(obj, segmentIndex)
      }
    })
  }
}

function drawAllTubeectHeads(): void {
  tubes.forEach(obj => {
    drawTubeectHead(obj)
  })
}

function handleResize(): void {
  if (!canvas) return

  const width = window.visualViewport?.width || window.innerWidth
  const height = window.visualViewport?.height || window.innerHeight

  canvas.width = width
  canvas.height = height
}

function createTargets(count: number): Target[] {
  if (!canvas) return []

  const targets: Target[] = []

  const xMin = canvas.width * 0.25
  const xMax = canvas.width * 0.75
  const yMin = canvas.height * 0.25
  const yMax = canvas.height * 0.75

  for (let i = 0; i < count; i++) {
    targets.push({
      x: random(xMin, xMax),
      y: random(yMin, yMax),
      strength: CONFIG.targetStrength
    })
  }
  return targets
}

function relocateTarget(target: Target): void {
  if (!canvas) return

  // Middle portion of screen
  const xMin = canvas.width * 0.15
  const xMax = canvas.width * 0.85
  const yMin = canvas.height * 0.15
  const yMax = canvas.height * 0.85

  target.x = random(xMin, xMax)
  target.y = random(yMin, yMax)
}

function checkTargetCollisions(): void {
  tubes.forEach(obj => {
    targets.forEach(target => {
      const dx = target.x - obj.x
      const dy = target.y - obj.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Check if tube is within 1 radius of target
      if (distance <= obj.radius + CONFIG.targetRadius) {
        relocateTarget(target)
      }
    })
  })
}


function clearCanvas(): void {
  if (!ctx || !canvas) return
  ctx.fillStyle = CONFIG.bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function animate(): void {
  if (!ctx || !canvas) return

  clearCanvas()

  // Check for target collisions
  checkTargetCollisions()

  // Update all tubes
  tubes.forEach(obj => {
    updateTubeect(obj)
  })

  // Draw all tails with proper layering (oldest to newest)
  drawAllTailsLayered()

  // Draw all tube heads on top
  drawAllTubeectHeads()

  animId = requestAnimationFrame(animate)
}

onMounted(() => {
  if (!canvasRef.value) return

  canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  if (!ctx) return

  handleResize()
  window.addEventListener('resize', handleResize)

  tubes = createTubes(CONFIG.tubeCount)
  targets = createTargets(CONFIG.targetCount)

  animate()
})

onUnmounted(() => {
  if (animId !== null) cancelAnimationFrame(animId)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.background-canvas {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
}
</style>
