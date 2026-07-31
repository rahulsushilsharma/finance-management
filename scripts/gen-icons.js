/**
 * Generates PWA icons and screenshots using @napi-rs/canvas.
 * Run: bun scripts/gen-icons.js
 */
import { createCanvas } from '@napi-rs/canvas'
import { writeFileSync } from 'fs'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })
mkdirSync('public/screenshots', { recursive: true })

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const r = size * 0.22

  // Background
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#6366f1')
  grad.addColorStop(1, '#8b5cf6')
  ctx.fillStyle = grad

  // Rounded rect
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Dollar sign
  ctx.fillStyle = 'white'
  ctx.font = `bold ${size * 0.52}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('₹', size / 2, size / 2 + size * 0.03)

  return canvas.toBuffer('image/png')
}

function drawScreenshot(width, height, label) {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, width, height)

  // Fake hero card
  const grad = ctx.createLinearGradient(0, 0, width, 0)
  grad.addColorStop(0, '#6366f1')
  grad.addColorStop(1, '#8b5cf6')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(24, 80, width - 48, 160, 20)
  ctx.fill()

  // Text on card
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `${width * 0.035}px Arial`
  ctx.textAlign = 'left'
  ctx.fillText('NET WORTH', 48, 130)
  ctx.fillStyle = 'white'
  ctx.font = `bold ${width * 0.09}px Arial`
  ctx.fillText('₹1,52,891', 48, 185)

  // Fake nav bar
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, height - 70, width, 70)
  ctx.fillStyle = '#6366f1'
  ctx.font = `${width * 0.028}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('Home  History  Budget  Analytics  Settings', width / 2, height - 30)

  // App name
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = `${width * 0.03}px Arial`
  ctx.fillText(label, width / 2, 50)

  return canvas.toBuffer('image/png')
}

// Icons
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, drawIcon(size))
  console.log(`  ✓ public/icons/icon-${size}.png`)
}

// Screenshots: mobile (narrow) + desktop (wide)
writeFileSync('public/screenshots/mobile.png', drawScreenshot(390, 844, 'FinanceApp — Family Finance Tracker'))
console.log('  ✓ public/screenshots/mobile.png')

writeFileSync('public/screenshots/desktop.png', drawScreenshot(1280, 800, 'FinanceApp — Family Finance Tracker'))
console.log('  ✓ public/screenshots/desktop.png')

console.log('Done.')
