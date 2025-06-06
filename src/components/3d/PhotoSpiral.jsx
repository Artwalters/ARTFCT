import React, { useRef, useMemo, useEffect, useState, useCallback, useImperativeHandle } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Code karakters voor dissolve effect (zelfde als ParticleScene)
const CODE_CHARACTERS = [
    '[', ']', '{', '}', '(', ')', '<', '>', '/', '\\', 
    ':', ';', ',', '.', '*', '!', '?', '@', '#', '$',
    '%', '^', '&', '=', '+', '-', '_', '|', '~', '"',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D'
]

// Creëer character atlas (gekopieerd van ParticleScene)
function createCharacterAtlas() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const charSize = 64
    const cols = 10
    const rows = Math.ceil(CODE_CHARACTERS.length / cols)
    
    canvas.width = charSize * cols
    canvas.height = charSize * rows
    
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const getVSCodeColor = (char) => {
        if ('[]'.includes(char)) return '#FFD700'
        if ('{}'.includes(char)) return '#FFA500'
        if ('()'.includes(char)) return '#DA70D6'
        if ('<>'.includes(char)) return '#808080'
        if ('+-'.includes(char)) return '#569CD6'
        if ('*/'.includes(char)) return '#4EC9B0'
        if ('%='.includes(char)) return '#4FC1FF'
        if ('&|'.includes(char)) return '#C586C0'
        if ('!~^'.includes(char)) return '#FF6B6B'
        if (':'.includes(char)) return '#FFFFFF'
        if (';'.includes(char)) return '#D4D4D4'
        if (',.'.includes(char)) return '#808080'
        if ('_'.includes(char)) return '#9CDCFE'
        if ('@'.includes(char)) return '#DCDCAA'
        if ('#'.includes(char)) return '#608B4E'
        if ('$'.includes(char)) return '#9CDCFE'
        if ('"'.includes(char)) return '#CE9178'
        if ('0123456789'.includes(char)) return '#B5CEA8'
        
        const letterColors = ['#9CDCFE', '#C586C0', '#DCDCAA', '#4EC9B0', '#CE9178', '#D7BA7D']
        if ('abcdefghijklmnopqrstuvwxyz'.includes(char.toLowerCase())) {
            const index = char.charCodeAt(0) % letterColors.length
            return letterColors[index]
        }
        
        return '#D4D4D4'
    }
    
    CODE_CHARACTERS.forEach((char, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = col * charSize + charSize / 2
        const y = row * charSize + charSize / 2
        
        const color = getVSCodeColor(char)
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = 10
        ctx.fillText(char, x, y)
        
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

// Enhanced vertex shader with Cosmos-style features
const vertexShader = /* glsl */ `
uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;

varying vec2 vUv;
varying vec3 vWorldPosition;

uniform vec3 uPosition;
uniform float uRotation;
uniform float uScale;
uniform float uSpeedMultiplier;
uniform float uMouseSpeedMultiplier;
uniform float uCameraMultiplier;

mat2 rotation2d(float angle){
    float s=sin(angle);
    float c=cos(angle);
    
    return mat2(
        c,-s,
        s,c
    );
}

vec2 rotate(vec2 v,float angle){
    return rotation2d(angle)*v;
}

void main(){
    vec3 p=position;
    
    // Apply rotation (Cosmos style)
    p.xy=rotate(p.xy,uRotation);
    
    // Apply scale with speed influence
    float dynamicScale = uScale * (1.0 + uSpeedMultiplier * 0.1);
    p.xyz *= dynamicScale;
    
    // Apply position
    p += uPosition;
    
    // Add subtle movement for liveliness (like Cosmos)
    float timeOffset = iTime + uRotation * 10.0;
    p.x += sin(timeOffset * 0.5 + uPosition.z * 0.1) * 0.02;
    p.y += cos(timeOffset * 0.7 + uPosition.z * 0.1) * 0.02;
    
    // Store world position for fragment shader
    vWorldPosition = p;
    
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    vUv=uv;
}
`;

const fragmentShader = /* glsl */ `
uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;

varying vec2 vUv;
varying vec3 vWorldPosition;

uniform sampler2D iChannel0;
uniform float uOpacity;
uniform vec3 uTintColor;
uniform float uDissolveProgress;
uniform float uSpeedMultiplier;
uniform float uMouseSpeedMultiplier;
uniform float uModeProgress;
uniform float uFadeInProgress;
uniform float uYPosMultiplier;
uniform sampler2D uCharAtlas;
uniform float uAtlasColumns;
uniform float uAtlasRows;

// Enhanced noise function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 3D noise for organic movement
float noise3D(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
}

// Multiple noise layers for complex dissolve
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main(){
    vec2 uv = vUv;
    
    // Sample original texture
    vec4 tex = texture(iChannel0, uv);
    vec3 col = tex.xyz * uTintColor;
    
    // Calculate distance from center for effects
    float distFromCenter = length(vWorldPosition.xy);
    
    // Cosmos-style opacity calculation
    float baseOpacity = uOpacity;
    
    // Speed-based effects (like Cosmos mouse drag)
    float speedEffect = 1.0 + uMouseSpeedMultiplier * 10.0;
    baseOpacity *= speedEffect;
    
    // Grid-based dissolve system - foto wordt blokje voor blokje opgegeten
    float finalAlpha = baseOpacity;
    
    if (uDissolveProgress > 0.01) {
        // Grid voor smooth blokjes overgang
        vec2 gridSize = vec2(8.0, 10.0); // Minder blokjes
        vec2 gridUV = fract(uv * gridSize);
        vec2 gridCell = floor(uv * gridSize);
        float cellRandom = random(gridCell);
        
        // Dissolve threshold per blokje - elk blokje heeft eigen timing
        float dissolveThreshold = cellRandom * 0.7 + 0.2; // Spread van 0.2 tot 0.9
        
        // Check of dit blokje al opgegeten moet worden
        float blockDissolveProgress = (uDissolveProgress - dissolveThreshold) / (1.0 - dissolveThreshold);
        blockDissolveProgress = clamp(blockDissolveProgress, 0.0, 1.0);
        
        if (blockDissolveProgress > 0.0) {
            // Dit blokje wordt opgegeten
            
            // Pick character voor dit blokje
            float charIndex = mod(cellRandom * 70.0 + floor(iTime * 2.0), 70.0);
            float charCol = mod(charIndex, uAtlasColumns);
            float charRow = floor(charIndex / uAtlasColumns);
            
            // Deformation voor depth - particles bewegen
            float deformTime = iTime + cellRandom * 6.28;
            vec2 deformation = vec2(
                sin(deformTime * 1.5) * 0.1,
                cos(deformTime * 1.2) * 0.1
            );
            
            // Z-depth simulatie door scaling
            float depthScale = 0.8 + sin(deformTime * 2.0 + cellRandom * 3.14) * 0.2;
            vec2 deformedUV = (gridUV - 0.5) * depthScale + 0.5 + deformation;
            
            // Sample character van atlas
            vec2 charCellUV = vec2(
                (charCol + clamp(deformedUV.x, 0.0, 1.0)) / uAtlasColumns,
                1.0 - (charRow + 1.0 - clamp(deformedUV.y, 0.0, 1.0)) / uAtlasRows
            );
            
            vec4 charColor = texture(uCharAtlas, charCellUV);
            
            // Smooth overgang van foto naar particle
            if (charColor.r > 0.1 || charColor.g > 0.1 || charColor.b > 0.1) {
                // Flickering voor particles
                float flicker = 0.8 + sin(iTime * 10.0 + cellRandom * 20.0) * 0.2;
                
                // Mix tussen originele foto en particle
                vec3 particleColor = charColor.rgb * flicker;
                
                // Depth-based brightness
                float depthBrightness = 0.7 + depthScale * 0.3;
                particleColor *= depthBrightness;
                
                // Make particles brighter to compensate for dark background
                particleColor *= 2.5; // Extra bright particles (1.5 + 1.0 = 2.5x)
                
                // Smooth blending - eerst glow, dan overgang
                float transitionProgress = smoothstep(0.0, 1.0, blockDissolveProgress);
                
                // Glow effect aan begin van overgang
                float glowIntensity = 1.0 - transitionProgress;
                vec3 glowColor = col * (1.0 + glowIntensity * 2.0);
                
                // Mix: foto -> glow -> particle
                if (transitionProgress < 0.3) {
                    // Glow fase
                    col = mix(col, glowColor, transitionProgress / 0.3);
                } else {
                    // Overgang naar particle
                    float particleBlend = (transitionProgress - 0.3) / 0.7;
                    col = mix(glowColor, particleColor, particleBlend);
                }
            } else {
                // Geen character - fade naar zwart
                float fadeProgress = smoothstep(0.0, 1.0, blockDissolveProgress);
                col = mix(col, vec3(0.0), fadeProgress);
                finalAlpha *= (1.0 - fadeProgress * 0.7);
            }
        }
        // Als blokje nog niet opgegeten wordt, houd originele foto
    }
    
    // Dark mode support (like Cosmos)
    if (uModeProgress > 0.0) {
        col = mix(col, col * 0.3, uModeProgress);
    }
    
    // Enhanced flickering based on speed
    float flickerIntensity = 0.05 + uSpeedMultiplier * 0.1;
    float flicker = sin(iTime * 3.0 + vWorldPosition.x * 10.0) * flickerIntensity;
    finalAlpha *= (1.0 + flicker);
    
    // Fade-in effect based on Y position and progress
    if (uFadeInProgress < 1.0) {
        // Normalize Y position (adjust based on your curve's Y range)
        float normalizedY = (vWorldPosition.y + 2.0) / 4.0; // Assuming Y range is roughly -2 to 2
        
        // Create sine wave for smooth fade
        float yPosSin = sin(normalizedY * 3.14159 * uYPosMultiplier);
        
        // Combine Y position with fade progress for wave effect
        float fadeInAlpha = uFadeInProgress + yPosSin * (1.0 - uFadeInProgress) * 0.3;
        
        // Apply smooth fade-in
        finalAlpha *= smoothstep(0.0, 1.0, fadeInAlpha);
    }
    
    // Discard fully transparent pixels
    if (finalAlpha < 0.01) discard;
    
    gl_FragColor = vec4(col, finalAlpha);
}
`;

// Enhanced Photo component with Cosmos features
function CosmosPhoto({ index, curve, offset, speed = 1, rotationCurve, scaleCurve, opacityCurve, imageUrl, tweenParams, isPaused, characterAtlas }) {
    const meshRef = useRef()
    const progressRef = useRef(offset)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageTexture, setImageTexture] = useState(null)
    
    // Detect mobile device for performance optimizations
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    // Create fallback colored texture
    const fallbackTexture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 400   // 5:4 aspect ratio fallback
        canvas.height = 320  // 5:4 ratio (400/320 = 1.25 = 5:4)
        const ctx = canvas.getContext('2d')
        
        const colors = ['#ff6600', '#ff0066', '#6600ff', '#00ff66', '#ffff00', '#00ffff', '#ff00ff', '#888888']
        const color = colors[index % colors.length]
        
        ctx.fillStyle = color
        ctx.fillRect(0, 0, 400, 320)
        
        ctx.fillStyle = 'white'
        ctx.font = 'bold 18px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('Loading...', 200, 140)   // Center in 5:4 canvas
        ctx.fillText(`Photo ${index + 1}`, 200, 180)
        
        return new THREE.CanvasTexture(canvas)
    }, [index])
    
    // Load actual image
    useEffect(() => {
        if (imageUrl) {
            const loader = new THREE.TextureLoader()
            let cancelled = false
            
            // Create smaller texture for mobile
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            img.onload = () => {
                if (cancelled) return
                
                // Resize image for mobile performance
                const maxSize = isMobile ? 512 : 1024
                let width = img.width
                let height = img.height
                
                if (width > maxSize || height > maxSize) {
                    const scale = Math.min(maxSize / width, maxSize / height)
                    width *= scale
                    height *= scale
                }
                
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                
                const texture = new THREE.CanvasTexture(canvas)
                texture.minFilter = THREE.LinearFilter
                texture.magFilter = THREE.LinearFilter
                texture.wrapS = THREE.ClampToEdgeWrapping
                texture.wrapT = THREE.ClampToEdgeWrapping
                texture.flipY = false
                
                // Calculate UV offset and scale to maintain aspect ratio
                const imageAspect = texture.image.width / texture.image.height
                const targetAspect = 5 / 4 // Our target 5:4 aspect ratio
                
                if (imageAspect > targetAspect) {
                    // Image is wider than target - fit height, crop sides
                    const scale = targetAspect / imageAspect
                    texture.offset.set((1 - scale) / 2, 0)
                    texture.repeat.set(scale, 1)
                } else {
                    // Image is taller than target - fit width, crop top/bottom
                    const scale = imageAspect / targetAspect
                    texture.offset.set(0, (1 - scale) / 2)
                    texture.repeat.set(1, scale)
                }
                
                setImageTexture(texture)
                setImageLoaded(true)
            }
            
            img.onerror = (error) => {
                if (!cancelled) {
                    console.warn(`Failed to load image: ${imageUrl}`, error)
                    setImageLoaded(false)
                }
            }
            
            img.src = imageUrl
            
            return () => {
                cancelled = true
                if (imageTexture) {
                    imageTexture.dispose()
                }
            }
        }
    }, [imageUrl])
    
    const texture = imageLoaded && imageTexture ? imageTexture : fallbackTexture
    
    // Enhanced shader material with Cosmos uniforms
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
            uniforms: {
                iTime: { value: 0 },
                iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
                iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
                iChannel0: { value: fallbackTexture },
                uPosition: { value: new THREE.Vector3(0, 0, 0) },
                uRotation: { value: 0 },
                uScale: { value: 1 },
                uOpacity: { value: 1 },
                uTintColor: { value: new THREE.Color("#808080") }, // Darker tint for background effect
                uDissolveProgress: { value: 0 },
                uSpeedMultiplier: { value: 0 },
                uMouseSpeedMultiplier: { value: 0 },
                uCameraMultiplier: { value: 0 },
                uModeProgress: { value: 0 },
                uFadeInProgress: { value: 1 },
                uYPosMultiplier: { value: 2.5 },
                uCharAtlas: { value: characterAtlas?.texture || null },
                uAtlasColumns: { value: characterAtlas?.cols || 10 },
                uAtlasRows: { value: characterAtlas?.rows || 7 }
            }
        })
    }, [fallbackTexture, characterAtlas])
    
    // Update material uniforms when texture changes
    useEffect(() => {
        if (material && material.uniforms) {
            material.uniforms.iChannel0.value = texture
            material.needsUpdate = true
        }
    }, [texture, material])
    
    useFrame((state, delta) => {
        if (!meshRef.current || !material.uniforms || isPaused) return
        
        // Update shader time uniform
        material.uniforms.iTime.value = state.clock.elapsedTime
        
        // Cosmos-style progress update with DRAMATIC speed multipliers
        const normalizedDelta = delta / 0.016
        const baseSpeed = 0.0018  // Base kokomi speed
        const speedMultiplier = tweenParams.speedMultiplier || 0
        const mouseSpeedMultiplier = tweenParams.mouseSpeedMultiplier || 0
        
        // COSMOS EFFECT: Much more dramatic speed calculation
        const totalSpeed = baseSpeed + (speedMultiplier * 20) + (mouseSpeedMultiplier * 15)
        
        progressRef.current += totalSpeed * normalizedDelta * speed
        if (progressRef.current > 1) progressRef.current = 0
        
        // Get current progress plus offset for staggered animation
        let i = progressRef.current + offset
        i = i % 1
        
        // Power-based progression (like Cosmos: Math.pow(progress, 1.7))
        const i2 = Math.pow(i, 1.7)
        
        // Update all uniforms with current values
        const position = curve.getPointAt(i2)
        material.uniforms.uPosition.value.copy(position)
        
        const rotationPoint = new THREE.Vector2()
        rotationCurve.getPointAt(i, rotationPoint)
        material.uniforms.uRotation.value = rotationPoint.y
        
        const scalePoint = new THREE.Vector2()
        scaleCurve.getPointAt(i2, scalePoint)
        material.uniforms.uScale.value = 1 - scalePoint.y
        
        const opacityPoint = new THREE.Vector2()
        opacityCurve.getPointAt(i, opacityPoint)
        material.uniforms.uOpacity.value = opacityPoint.y * (tweenParams.opacityMultiplier || 1)
        
        // Pass speed multipliers to shader
        material.uniforms.uSpeedMultiplier.value = speedMultiplier
        material.uniforms.uMouseSpeedMultiplier.value = mouseSpeedMultiplier
        material.uniforms.uCameraMultiplier.value = tweenParams.cameraMultiplier || 0
        
        // Calculate fade-in progress for beginning of animation
        // Photos fade in during first 15% of their journey (0.0 to 0.15)
        const fadeInDuration = 0.15
        const fadeInProgress = Math.min(1.0, i / fadeInDuration)
        material.uniforms.uFadeInProgress.value = fadeInProgress
        
        // Dynamic opacity curve shift for leegloop effect
        // Shift the opacity curve based on leegloop progress to create fade-out
        const leegloopShift = (tweenParams.leegloopProgress || 0) * 0.8 // Max shift 80%
        const adjustedOpacityProgress = Math.max(0, i - leegloopShift)
        
        // Recalculate opacity with shifted curve
        const shiftedOpacityPoint = new THREE.Vector2()
        opacityCurve.getPointAt(Math.min(1, adjustedOpacityProgress), shiftedOpacityPoint)
        
        // Override the normal opacity calculation when leegloop is active
        if (tweenParams.leegloopProgress > 0) {
            material.uniforms.uOpacity.value = shiftedOpacityPoint.y * (tweenParams.opacityMultiplier || 1)
        }
        
        // Enhanced dissolve calculation with speed-based triggering
        const dissolveStart = 0.72
        
        // COSMOS EFFECT: Speed burst can also trigger dissolve
        const speedBasedDissolve = speedMultiplier > 0.01 ? speedMultiplier * 2 : 0
        
        if (i2 > dissolveStart || speedBasedDissolve > 0) {
            if (speedBasedDissolve > 0) {
                // Speed-triggered dissolve (immediate)
                material.uniforms.uDissolveProgress.value = Math.min(1, speedBasedDissolve)
            } else {
                // Normal position-based dissolve
                const dissolveRange = 1.0 - dissolveStart
                const dissolveProgress = (i2 - dissolveStart) / dissolveRange
                material.uniforms.uDissolveProgress.value = Math.max(0, Math.pow(dissolveProgress, 0.8))
            }
        } else {
            material.uniforms.uDissolveProgress.value = 0
        }
    })
    
    // Calculate geometry size - vertical orientation, 20% larger
    const geometrySize = useMemo(() => {
        // Vertical orientation (portrait)
        const baseWidth = 1.0   // Portrait width
        const baseHeight = 1.25 // Portrait height (4:5 aspect ratio)
        const scale = 1.43      // 30% larger: 1.30 * 1.1 = 1.43
        
        return [baseWidth * scale, baseHeight * scale]
    }, [])

    return (
        <mesh ref={meshRef} material={material} renderOrder={-1}>
            <planeGeometry args={geometrySize} />
        </mesh>
    )
}

// Enhanced PhotoSpiral with Cosmos features and Long Hold
const PhotoSpiralCosmos = React.forwardRef(({ images = [], speed = 1, onLongHoldProgress }, ref) => {
    const groupRef = useRef()
    const { camera } = useThree()
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const targetRotation = useRef({ x: 0, y: 0 })
    const currentRotation = useRef({ x: 0, y: 0 })
    
    // Detect mobile device for performance optimizations (early declaration)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    // Create character atlas once
    const characterAtlas = useMemo(() => createCharacterAtlas(), [])
    
    // Cosmos-style state management
    const [isPaused, setIsPaused] = useState(false)
    const [isLongHoldActive, setIsLongHoldActive] = useState(false)
    const longHoldTimeoutRef = useRef(null)
    const speedBurstTimeoutRef = useRef(null)
    
    // Mouse drag tracking (like Cosmos)
    const [mouseDown, setMouseDown] = useState(false)
    const startPoint = useRef({ x: 0, y: 0 })
    const currentTime = useRef(Date.now())
    const prevTime = useRef(Date.now())
    const dragDistance = useRef(0)
    
    // Cosmos-style tween parameters
    const tweenParams = useRef({
        speedMultiplier: 0,
        opacityMultiplier: 1,
        groupScale: 1,
        mouseSpeedMultiplier: 0,
        cameraMultiplier: 0,
        leegloopProgress: 0  // Voor opacity curve shift effect
    })
    
    // Expose methods for external control (wheel navigation)
    useImperativeHandle(ref, () => ({
        triggerSpeedBurst: () => {
            console.log('🚀 PhotoSpiral: External speed burst triggered!')
            setIsLongHoldActive(true)
            
            // EXACT SAME TIMING AS PARTICLE VACUUM: 1.6 seconds with power2.inOut
            gsap.to(tweenParams.current, {
                speedMultiplier: 0.05,
                opacityMultiplier: 0,
                groupScale: 0,
                leegloopProgress: 1,  // Shift opacity curve for fade-out
                duration: 1.6,  // Same as particle vacuum
                ease: "power2.inOut"  // Same easing as particle vacuum
            })
            
            // Pause exactly when particle vacuum completes
            speedBurstTimeoutRef.current = setTimeout(() => {
                setIsPaused(true)
                tweenParams.current.speedMultiplier = 0
            }, 1600)  // Match 1.6 second duration
        },
        
        resetSpiral: () => {
            console.log('🔄 PhotoSpiral: External reset triggered!')
            setIsLongHoldActive(false)
            setIsPaused(false)
            
            // EXACT SAME TIMING AS PARTICLE RETURN: 1.8 seconds with power2.inOut
            gsap.to(tweenParams.current, {
                speedMultiplier: 0,
                opacityMultiplier: 1,
                groupScale: 1,
                leegloopProgress: 0,  // Reset opacity curve shift
                duration: 1.8,  // Same as particle return
                ease: "power2.inOut"  // Same easing as particle return
            })
            
            // Clear any pending timeout
            if (speedBurstTimeoutRef.current) {
                clearTimeout(speedBurstTimeoutRef.current)
                speedBurstTimeoutRef.current = null
            }
        }
    }), [tweenParams])
    
    // 3D curve (scaled down for mobile)
    const curve = useMemo(() => {
        const scale = isMobile ? 0.8 : 1.0 // 20% smaller on mobile
        
        const curvePoints = [
            new THREE.Vector3(-7 * scale, -1 * scale, -8),
            new THREE.Vector3(-6.8 * scale, -0.2 * scale, -7),
            new THREE.Vector3(-6.4 * scale, 0.3 * scale, -6),
            new THREE.Vector3(-5.9 * scale, 0.7 * scale, -5),
            new THREE.Vector3(-5.4 * scale, 1 * scale, -4),
            new THREE.Vector3(-4.8 * scale, 1.2 * scale, -3),
            new THREE.Vector3(-3.9 * scale, 1.3 * scale, -1.8),
            new THREE.Vector3(-2.8 * scale, 1 * scale, -1),
            new THREE.Vector3(-1.5 * scale, 0.6 * scale, 0),
            new THREE.Vector3(-1 * scale, 0.4 * scale, 0)
        ]
        
        const smoothCurve = new THREE.CatmullRomCurve3(curvePoints)
        smoothCurve.curveType = 'catmullrom'
        smoothCurve.tension = 0.5
        
        return smoothCurve
    }, [isMobile])

    // Curves (same as original)
    const rotationCurve = useMemo(() => {
        return new THREE.SplineCurve([
            new THREE.Vector2(0, THREE.MathUtils.degToRad(-5)),
            new THREE.Vector2(1, THREE.MathUtils.degToRad(45))
        ])
    }, [])

    const scaleCurve = useMemo(() => {
        return new THREE.CubicBezierCurve(
            new THREE.Vector2(0, 0),          // Start: scale 0
            new THREE.Vector2(0.55, 0),       // 55% progress: still scale 0
            new THREE.Vector2(1, 0.35),       // End: scale 0.35 (was 0.45, now 10% larger)
            new THREE.Vector2(1, 0.9)         // Keep 10% of size (was 1, now 0.9)
        )
    }, [])

    const opacityCurve = useMemo(() => {
        return new THREE.CubicBezierCurve(
            new THREE.Vector2(0, 0),        // Start: volledig onzichtbaar
            new THREE.Vector2(0.8, 0),      // Tot 80% onzichtbaar blijven
            new THREE.Vector2(0.85, 0.5),   // Snelle overgang beginnen bij 85%
            new THREE.Vector2(1, 1)         // Volledig zichtbaar bij 100%
        )
    }, [])
    
    // Photo instances met randomized volgorde
    const photoInstances = useMemo(() => {
        const spiralImageCount = 10 // Same amount on all devices
        const instances = []
        
        // Randomize image indices voor organische volgorde
        const shuffledIndices = [...Array(spiralImageCount)].map((_, i) => i)
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]]
        }
        
        for (let i = 0; i < spiralImageCount; i++) {
            instances.push({
                index: shuffledIndices[i], // Use randomized index
                offset: i / spiralImageCount
            })
        }
        
        return instances
    }, [])
    
    // Cosmos-style mouse tracking with drag detection (desktop only)
    useEffect(() => {
        // Skip mouse events on mobile
        if (isMobile) return
        
        const handleMouseDown = (e) => {
            setMouseDown(true)
            startPoint.current = { x: e.clientX, y: e.clientY }
            prevTime.current = Date.now()
        }
        
        const handleMouseUp = () => {
            setMouseDown(false)
            startPoint.current = { x: 0, y: 0 }
            
            // Gradually reduce mouse speed multiplier
            gsap.to(tweenParams.current, {
                mouseSpeedMultiplier: 0,
                duration: 2,
                ease: "power2.out"
            })
        }
        
        const handleMouseMove = (e) => {
            // Normalize mouse position to -1 to 1
            const x = (e.clientX / window.innerWidth) * 2 - 1
            const y = -(e.clientY / window.innerHeight) * 2 + 1
            setMousePosition({ x, y })
            
            // Update target rotation (more subtle than original)
            targetRotation.current = {
                x: y * 0.08,
                y: x * 0.12
            }
            
            // Cosmos-style drag speed calculation
            if (mouseDown) {
                const deltaX = e.clientX - startPoint.current.x
                const deltaY = e.clientY - startPoint.current.y
                
                currentTime.current = Date.now()
                const deltaTime = currentTime.current - prevTime.current
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
                
                if (deltaTime > 0) {
                    const dragSpeed = distance * 2 / deltaTime * 2
                    const mouseSpeedMultiplier = Math.abs(distance) * dragSpeed * 1e-7
                    
                    // Clamp like Cosmos
                    tweenParams.current.mouseSpeedMultiplier = Math.min(0.01, mouseSpeedMultiplier)
                    tweenParams.current.cameraMultiplier += tweenParams.current.mouseSpeedMultiplier * 0.09
                }
                
                prevTime.current = currentTime.current
            }
        }
        
        window.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mouseup', handleMouseUp)
        window.addEventListener('mousemove', handleMouseMove)
        
        return () => {
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            window.removeEventListener('mousemove', handleMouseMove)
        }
    }, [mouseDown, isMobile])
    
    // Cosmos-style long hold integration with dramatic effects
    useEffect(() => {
        const handlePointerDown = (e) => {
            console.log('🖱️ PhotoSpiral: Pointer down detected!') // Debug log
            
            // Start long hold timer (1 second like your existing menu)
            longHoldTimeoutRef.current = setTimeout(() => {
                console.log('⏰ PhotoSpiral: Long hold activated - starting speed burst!') // Debug log
                setIsLongHoldActive(true)
                
                // COSMOS EFFECT: Dramatic speed increase during long hold
                gsap.to(tweenParams.current, {
                    speedMultiplier: 0.05,  // Much higher like Cosmos (was 1.0 in ref)
                    opacityMultiplier: 0,   // Fade to invisible
                    groupScale: 0,          // Shrink to nothing
                    leegloopProgress: 1,    // Shift opacity curve for fade-out
                    duration: 0.8,
                    ease: "expo.in"
                })
                
                // PAUSE SPAWNING after speed burst (like Cosmos pausedRaf)
                speedBurstTimeoutRef.current = setTimeout(() => {
                    setIsPaused(true)
                    tweenParams.current.speedMultiplier = 0
                    console.log('⏸️ PhotoSpiral: Paused animation after speed burst') // Debug log
                }, 800)
                
            }, 1000) // 1 second hold like your menu system
        }
        
        const handlePointerUp = () => {
            console.log('🖱️ PhotoSpiral: Pointer up - stopping long hold') // Debug log
            
            // Clear long hold timer
            if (longHoldTimeoutRef.current) {
                clearTimeout(longHoldTimeoutRef.current)
                longHoldTimeoutRef.current = null
            }
            
            // If long hold was active, reset everything
            if (isLongHoldActive) {
                setIsLongHoldActive(false)
                setIsPaused(false)
                
                console.log('▶️ PhotoSpiral: Resuming animation after long hold') // Debug log
                
                // Reset and fade back in (like Cosmos buildIntro)
                gsap.to(tweenParams.current, {
                    speedMultiplier: 0,
                    opacityMultiplier: 1,
                    groupScale: 1,
                    leegloopProgress: 0,  // Reset opacity curve shift
                    duration: 2,
                    ease: "power1.inOut"
                })
            }
            
            // Clear speed burst timeout
            if (speedBurstTimeoutRef.current) {
                clearTimeout(speedBurstTimeoutRef.current)
                speedBurstTimeoutRef.current = null
            }
        }
        
        // Add event listeners for both mouse and touch
        window.addEventListener('mousedown', handlePointerDown)
        window.addEventListener('mouseup', handlePointerUp)
        window.addEventListener('mouseleave', handlePointerUp) // Also stop on mouse leave
        window.addEventListener('touchstart', handlePointerDown)
        window.addEventListener('touchend', handlePointerUp)
        window.addEventListener('touchcancel', handlePointerUp)
        
        console.log('🎯 PhotoSpiral: Long hold listeners added') // Debug log
        
        return () => {
            window.removeEventListener('mousedown', handlePointerDown)
            window.removeEventListener('mouseup', handlePointerUp)
            window.removeEventListener('mouseleave', handlePointerUp)
            window.removeEventListener('touchstart', handlePointerDown)
            window.removeEventListener('touchend', handlePointerUp)
            window.removeEventListener('touchcancel', handlePointerUp)
            
            if (longHoldTimeoutRef.current) {
                clearTimeout(longHoldTimeoutRef.current)
            }
            if (speedBurstTimeoutRef.current) {
                clearTimeout(speedBurstTimeoutRef.current)
            }
        }
    }, [isLongHoldActive])
    
    // Optional callback for parent component (long hold progress)
    useEffect(() => {
        if (onLongHoldProgress) {
            // Report long hold state instead of scroll progress
            const progress = isLongHoldActive ? 1 : 0
            onLongHoldProgress(progress)
        }
    }, [isLongHoldActive, onLongHoldProgress])
    
    // No camera manipulation - use Canvas camera as-is
    
    // Cosmos-style camera animation (desktop only)
    useFrame((state, delta) => {
        if (groupRef.current) {
            // Only do mouse-based animations on desktop
            if (!isMobile) {
                // Smooth rotation lerp (like Cosmos)
                currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.1
                currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.1
                
                // Apply rotation to group
                groupRef.current.rotation.x = currentRotation.current.x
                groupRef.current.rotation.y = currentRotation.current.y
                
                // Cosmos-style position offset based on mouse
                groupRef.current.position.x = mousePosition.x * 0.2
                groupRef.current.position.y = mousePosition.y * 0.1
                
                // Gradually reduce camera multiplier (like Cosmos lerp)
                tweenParams.current.cameraMultiplier *= 0.95
            }
            
            // Apply group scaling (both mobile and desktop)
            groupRef.current.scale.setScalar(tweenParams.current.groupScale)
        }
    })
    
    const spiralCount = 5 // Always 5 spirals
    
    return (
        <group ref={groupRef} position={[0, 0, 5]} renderOrder={-1}>
            {[...Array(spiralCount)].map((_, spiralIndex) => (
                <group 
                    key={spiralIndex} 
                    rotation={[0, 0, (Math.PI * 2 / spiralCount) * spiralIndex]}
                >
                    {photoInstances.map((instance, idx) => {
                        const imageUrl = images && images.length > 0 
                            ? images[instance.index % images.length] 
                            : null
                        
                        // Verschuif elke curve voor organische dissolve timing
                        const curveOffset = spiralIndex * 0.01 // 1% per curve
                        const adjustedOffset = (instance.offset + curveOffset) % 1.0
                        
                        return (
                            <CosmosPhoto
                                key={`${spiralIndex}-${idx}`}
                                index={instance.index}
                                curve={curve}
                                offset={adjustedOffset}
                                speed={speed}
                                rotationCurve={rotationCurve}
                                scaleCurve={scaleCurve}
                                opacityCurve={opacityCurve}
                                imageUrl={imageUrl}
                                tweenParams={tweenParams.current}
                                isPaused={isPaused}
                                characterAtlas={characterAtlas}
                            />
                        )
                    })}
                </group>
            ))}
        </group>
    )
})

export default PhotoSpiralCosmos