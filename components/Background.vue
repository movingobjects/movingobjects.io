<template>
  <canvas ref="canvasRef" class="background-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { lerp, norm, random, map, lerpGradient } from '~/utils/math'
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
  age: number // frames since spawn
  dying: boolean // whether tube is fading out
  deathAge: number // frames since marked as dying
}

const CONFIG = {
  bgColor: THEME.colors.bg,
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
  repulsionDistance: 50,
  spawnInterval: 250, // milliseconds between spawns
  fadeInDuration: 60, // frames for fade-in (60 frames = 1 second at 60fps)
  fadeOutDuration: 180 // frames for fade-out (60 frames = 1 second at 60fps)
} as const

// Calculate max tube count based on viewport size
function getMaxTubeCount(): number {
  const viewportSize = window.innerWidth + window.innerHeight
  const count = map(viewportSize, 1000, 2500, 5, 15);
  return Math.max(5, Math.min(20, Math.round(count)))
}

const canvasRef = ref<HTMLCanvasElement | null>(null)

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let animId: number | null = null
let spawnIntervalId: number | null = null
let tubes: Tube[] = []
let targets: Target[] = []
let maxTubeCount = 15 // Will be calculated on mount and resize

function createTube(): Tube | null {
  if (!canvas) return null

  const sizeFactor = random()
  const radius = lerp(CONFIG.tubeRadiusMin, CONFIG.tubeRadiusMax, sizeFactor)

  return {
    radius,
    x: random(0, canvas.width),
    y: random(0, canvas.height),
    vx: 0,
    vy: 0,
    tail: [],
    age: 0,
    dying: false,
    deathAge: 0
  }
}

function spawnTube(): void {
  if (tubes.length >= maxTubeCount) return

  const newTube = createTube()
  if (newTube) {
    tubes.push(newTube)
  }
}

function despawnTube(): void {
  // Find the first tube that isn't already dying
  const tubeToKill = tubes.find(tube => !tube.dying)
  if (tubeToKill) {
    tubeToKill.dying = true
    tubeToKill.deathAge = 0
  }
}

function startSpawning(): void {
  // Spawn tubes gradually
  spawnIntervalId = window.setInterval(() => {
    if (tubes.length < maxTubeCount) {
      spawnTube()
    } else if (tubes.length > maxTubeCount) {
      despawnTube();
    }
  }, CONFIG.spawnInterval)
}

function stopSpawning(): void {
  if (spawnIntervalId !== null) {
    clearInterval(spawnIntervalId)
    spawnIntervalId = null
  }
}

function applyGravity(tube: Tube): void {
  if (!canvas || targets.length === 0) return

  // Find the nearest target
  let nearestTarget = targets[0]!
  let nearestDistance = Infinity

  targets.forEach(target => {
    const dx = target.x - tube.x
    const dy = target.y - tube.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestTarget = target
    }
  })

  // Only apply gravity from the nearest target
  if (nearestDistance > 1) {
    const dx = nearestTarget.x - tube.x
    const dy = nearestTarget.y - tube.y

    // Use distance squared for smoother falloff, with a minimum distance to prevent extreme forces
    const minDistance = 50
    const effectiveDistance = Math.max(nearestDistance, minDistance)
    const force = nearestTarget.strength / effectiveDistance

    tube.vx += (dx / nearestDistance) * force
    tube.vy += (dy / nearestDistance) * force
  }
}

function applyRepulsion(tube: Tube): void {
  tubes.forEach(otherTube => {
    if (tube === otherTube) return

    const dx = tube.x - otherTube.x
    const dy = tube.y - otherTube.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Only apply repulsion if tubes are within repulsion distance
    if (distance < CONFIG.repulsionDistance && distance > 0) {
      // Stronger repulsion when closer
      const force = CONFIG.repulsionStrength / Math.max(25, distance * distance)

      tube.vx += (dx / distance) * force
      tube.vy += (dy / distance) * force
    }
  })
}

function updateTubeect(tube: Tube): void {
  if (!canvas) return

  // Increment age
  tube.age++

  // If dying, increment death age
  if (tube.dying) {
    tube.deathAge++
  }

  // Add current position to tail
  tube.tail.push({ x: tube.x, y: tube.y })
  if (tube.tail.length > CONFIG.tailLength) {
    tube.tail.shift()
  }

  // Apply gravity from targets
  applyGravity(tube)

  // Apply repulsion from other tubes
  applyRepulsion(tube)

  // Apply friction
  tube.vx *= CONFIG.friction
  tube.vy *= CONFIG.friction

  // Limit max speed
  const speed = Math.sqrt(tube.vx * tube.vx + tube.vy * tube.vy)
  if (speed > CONFIG.maxSpeed) {
    tube.vx = (tube.vx / speed) * CONFIG.maxSpeed
    tube.vy = (tube.vy / speed) * CONFIG.maxSpeed
  }

  // Update position
  tube.x += tube.vx
  tube.y += tube.vy
}

function drawTailSegment(tube: Tube, segmentIndex: number): void {
  if (!ctx || tube.tail.length < 2 || segmentIndex >= tube.tail.length - 1) return

  // Calculate opacity based on tube state
  let opacity = 1

  if (tube.dying) {
    // Fade out
    const fadeOutProgress = Math.min(tube.deathAge / CONFIG.fadeOutDuration, 1)
    opacity = 1 - fadeOutProgress
  } else {
    // Fade in
    opacity = Math.min(tube.age / CONFIG.fadeInDuration, 1)
  }

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const t = norm(segmentIndex, 0, tube.tail.length)
  const lineWidth = 2 * tube.radius * lerp(CONFIG.tailLineWidthMin, CONFIG.tailLineWidthMax, t)
  const color = lerpGradient(1 - t, CONFIG.tailGradient)
  const start = tube.tail[segmentIndex]!
  const end = tube.tail[segmentIndex + 1]!

  ctx.globalAlpha = opacity
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawTubeectHead(tube: Tube): void {
  if (!ctx) return

  // Calculate opacity based on tube state
  let opacity = 1

  if (tube.dying) {
    // Fade out
    const fadeOutProgress = Math.min(tube.deathAge / CONFIG.fadeOutDuration, 1)
    opacity = 1 - fadeOutProgress
  } else {
    // Fade in
    opacity = Math.min(tube.age / CONFIG.fadeInDuration, 1)
  }

  // Draw outer circle
  ctx.globalAlpha = opacity
  ctx.fillStyle = lerpGradient(0, CONFIG.tailGradient)
  ctx.beginPath()
  ctx.arc(tube.x, tube.y, tube.radius, 0, Math.PI * 2)
  ctx.fill()

  // Draw inner circle (background color)
  ctx.globalAlpha = 1 // Inner circle always fully opaque
  ctx.fillStyle = CONFIG.bgColor
  ctx.beginPath()
  ctx.arc(tube.x, tube.y, tube.radius - CONFIG.tubeRimWidth, 0, Math.PI * 2)
  ctx.fill()
}

function drawAllTailsLayered(): void {
  if (!ctx) return

  // Find the maximum tail length among all tubes
  let maxTailLength = 0
  tubes.forEach(tube => {
    if (tube.tail.length > maxTailLength) {
      maxTailLength = tube.tail.length
    }
  })

  // Draw tail segments from oldest to newest across all tubes
  for (let segmentIndex = 0; segmentIndex < maxTailLength - 1; segmentIndex++) {
    tubes.forEach(tube => {
      if (segmentIndex < tube.tail.length - 1) {
        drawTailSegment(tube, segmentIndex)
      }
    })
  }
}

function drawAllTubeectHeads(): void {
  tubes.forEach(tube => {
    drawTubeectHead(tube)
  })
}

function handleResize(): void {
  if (!canvas) return

  const width = window.visualViewport?.width || window.innerWidth
  const height = window.visualViewport?.height || window.innerHeight

  canvas.width = width
  canvas.height = height

  // Update max tube count based on new viewport size
  maxTubeCount = getMaxTubeCount()
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
  tubes.forEach(tube => {
    targets.forEach(target => {
      const dx = target.x - tube.x
      const dy = target.y - tube.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Check if tube is within 1 radius of target
      if (distance <= tube.radius + CONFIG.targetRadius) {
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
  tubes.forEach(tube => {
    updateTubeect(tube)
  })

  // Remove tubes that have finished fading out
  tubes = tubes.filter(tube => {
    if (tube.dying && tube.deathAge >= CONFIG.fadeOutDuration) {
      return false // Remove this tube
    }
    return true // Keep this tube
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

  // Calculate initial max tube count
  maxTubeCount = getMaxTubeCount()

  handleResize()
  window.addEventListener('resize', handleResize)

  // Start with no tubes
  tubes = []
  targets = createTargets(CONFIG.targetCount)

  // Start spawning tubes gradually
  startSpawning()

  animate()
})

onUnmounted(() => {
  if (animId !== null) cancelAnimationFrame(animId)
  stopSpawning()
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
