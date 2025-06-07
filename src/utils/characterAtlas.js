import * as THREE from 'three'
import { CODE_CHARACTERS, getVSCodeColor } from '../constants/particles'
import { isMobile } from './deviceDetection'

// Create texture atlas with all characters
export function createCharacterAtlas() {
    console.log('Creating character atlas with VS Code colors')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const charSize = isMobile() ? 32 : 64 // Smaller texture on mobile
    const cols = 10
    const rows = Math.ceil(CODE_CHARACTERS.length / cols)
    
    canvas.width = charSize * cols
    canvas.height = charSize * rows
    
    // Zwarte achtergrond voor betere contrast
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const fontSize = isMobile() ? 24 : 48
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    CODE_CHARACTERS.forEach((char, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = col * charSize + charSize / 2
        const y = row * charSize + charSize / 2
        
        // VS Code kleur voor dit karakter
        const color = getVSCodeColor(char)
        ctx.fillStyle = color
        
        // Teken karakter met glow effect
        ctx.shadowColor = color
        ctx.shadowBlur = 10
        ctx.fillText(char, x, y)
        
        // Extra glow laag
        ctx.shadowBlur = 20
        ctx.globalAlpha = 0.5
        ctx.fillText(char, x, y)
        ctx.globalAlpha = 1.0
    })
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    
    return { texture, cols, rows }
}