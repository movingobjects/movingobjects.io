<template>
  <canvas ref="canvasRef" class="background-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { lerp, norm, random, lerpGradient } from '~/utils/math'

interface Position {
  x: number
  y: number
}

interface Obj {
  radius: number
  color: string
  x: number
  y: number
  vx: number
  vy: number
  tail: Position[]
}

const CONFIG = {
  backgroundColor: '#126',
  objectCount: 10,
  objectRadiusMin: 5,
  objectRadiusMax: 25,
  objectColor: '#f67',
  objectSpeedMin: 3,
  objectSpeedMax: 8,
  tailLength: 100,
  tailLineWidthMin: 0.5,
  tailLineWidthMax: 1,
  tailGradient: [
    { position: 0.0, color: '#f47' },
    { position: 0.1, color: '#c37' },
    { position: 0.2, color: '#d2c' },
    { position: 0.3, color: '#62A' },
    { position: 0.5, color: '#237' },
    { position: 1.0, color: '#126' }
  ]
} as const

const canvasRef = ref<HTMLCanvasElement | null>(null)

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let animId: number | null = null
let objs: Obj[] = []

function createObjects(count: number): Obj[] {
  if (!canvas) return []

  const objs: Obj[] = []

  for (let i = 0; i < count; i++) {
    const sizeFactor = random()
    const radius = lerp(CONFIG.objectRadiusMin, CONFIG.objectRadiusMax, sizeFactor)
    const speed = lerp(CONFIG.objectSpeedMax, CONFIG.objectSpeedMin, sizeFactor)

    objs.push({
      radius,
      color: CONFIG.objectColor,
      x: random(0, canvas.width),
      y: random(0, canvas.height),
      vx: speed,
      vy: speed,
      tail: []
    })
  }

  return objs
}

function updateObject(obj: Obj): void {
  if (!canvas) return

  // Add current position to tail
  obj.tail.push({ x: obj.x, y: obj.y })
  if (obj.tail.length > CONFIG.tailLength) {
    obj.tail.shift()
  }

  // Update position
  obj.x += obj.vx
  obj.y += obj.vy

  // Bounce off edges
  const minX = obj.radius
  const minY = obj.radius
  const maxX = canvas.width - obj.radius
  const maxY = canvas.height - obj.radius

  if (obj.x < minX && obj.vx < 0) obj.vx *= -1
  if (obj.x > maxX && obj.vx > 0) obj.vx *= -1
  if (obj.y < minY && obj.vy < 0) obj.vy *= -1
  if (obj.y > maxY && obj.vy > 0) obj.vy *= -1
}

function drawTail(obj: Obj): void {
  if (!ctx || obj.tail.length < 2) return

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let i = 0; i < obj.tail.length - 1; i++) {
    const t = norm(i, 0, obj.tail.length)
    const lineWidth = 2 * obj.radius * lerp(CONFIG.tailLineWidthMin, CONFIG.tailLineWidthMax, t)
    const color = lerpGradient(1 - t, CONFIG.tailGradient)
    const start = obj.tail[i]!
    const end = obj.tail[i + 1]!

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  }
}

function drawObject(obj: Obj): void {
  if (!ctx) return

  drawTail(obj)

  // Draw main circle
  ctx.fillStyle = obj.color
  ctx.beginPath()
  ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2)
  ctx.fill()
}

function handleResize(): void {
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function clearCanvas(): void {
  if (!ctx || !canvas) return
  ctx.fillStyle = CONFIG.backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function animate(): void {
  if (!ctx || !canvas) return

  clearCanvas()

  objs.forEach(obj => {
    updateObject(obj)
    drawObject(obj)
  })

  animId = requestAnimationFrame(animate)
}

onMounted(() => {
  if (!canvasRef.value) return

  canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  if (!ctx) return

  handleResize()
  window.addEventListener('resize', handleResize)

  objs = createObjects(CONFIG.objectCount)
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
  width: 100vw;
  height: 100vh;
  z-index: -1;
}
</style>
