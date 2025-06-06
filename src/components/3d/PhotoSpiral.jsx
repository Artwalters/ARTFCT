import React, { useRef, useMemo, useEffect, useState, useCallback, useImperativeHandle } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

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

// Enhanced noise function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
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
    
    // Enhanced dissolve system (more like Cosmos particles)
    float finalAlpha = baseOpacity;
    
    if (uDissolveProgress > 0.01) {
        // Multiple dissolve layers for complexity
        vec2 gridSize1 = vec2(12.0, 12.0);
        vec2 gridSize2 = vec2(8.0, 8.0);
        vec2 gridSize3 = vec2(16.0, 16.0);
        
        // Primary grid dissolution
        vec2 gridUV1 = fract(uv * gridSize1);
        vec2 gridCell1 = floor(uv * gridSize1);
        float cellRandom1 = random(gridCell1);
        
        // Secondary grid for more complex pattern
        vec2 gridUV2 = fract(uv * gridSize2 + 0.5);
        vec2 gridCell2 = floor(uv * gridSize2 + 0.5);
        float cellRandom2 = random(gridCell2 + vec2(100.0, 100.0));
        
        // Tertiary grid for fine details
        vec2 gridUV3 = fract(uv * gridSize3 + 0.25);
        vec2 gridCell3 = floor(uv * gridSize3 + 0.25);
        float cellRandom3 = random(gridCell3 + vec2(200.0, 200.0));
        
        // Combine multiple dissolve patterns
        float dissolveThreshold = uDissolveProgress;
        float dissolvePattern = mix(
            mix(cellRandom1, cellRandom2, 0.6),
            cellRandom3,
            0.3
        );
        
        // More sophisticated particle shapes
        float gapSize = 0.08;
        float particleMask1 = 1.0;
        if (gridUV1.x < gapSize || gridUV1.x > 1.0 - gapSize || 
            gridUV1.y < gapSize || gridUV1.y > 1.0 - gapSize) {
            particleMask1 = 0.0;
        }
        
        float particleMask2 = 1.0;
        if (gridUV2.x < gapSize * 0.7 || gridUV2.x > 1.0 - gapSize * 0.7 || 
            gridUV2.y < gapSize * 0.7 || gridUV2.y > 1.0 - gapSize * 0.7) {
            particleMask2 = 0.0;
        }
        
        // Combine particle masks
        float combinedMask = max(particleMask1 * 0.8, particleMask2 * 0.6);
        
        // Determine if particle should be kept
        float keepParticle = step(dissolveThreshold, dissolvePattern);
        
        // Enhanced VS Code colors with more variety
        if (keepParticle > 0.0 && dissolvePattern < dissolveThreshold + 0.2) {
            float glowStrength = 1.0 - (dissolvePattern - dissolveThreshold) / 0.2;
            
            // More sophisticated color selection
            float colorSeed = random(gridCell1 + gridCell2 * 0.5);
            vec3 particleColor;
            
            float colorIndex = floor(colorSeed * 8.0);
            
            if (colorIndex == 0.0) {
                particleColor = vec3(0.61, 0.86, 0.996); // #9CDCFE lichtblauw
            } else if (colorIndex == 1.0) {
                particleColor = vec3(0.773, 0.525, 0.753); // #C586C0 paars
            } else if (colorIndex == 2.0) {
                particleColor = vec3(0.863, 0.855, 0.667); // #DCDCAA geel
            } else if (colorIndex == 3.0) {
                particleColor = vec3(0.306, 0.788, 0.69); // #4EC9B0 turquoise
            } else if (colorIndex == 4.0) {
                particleColor = vec3(0.808, 0.569, 0.471); // #CE9178 oranje
            } else if (colorIndex == 5.0) {
                particleColor = vec3(0.843, 0.733, 0.49); // #D7BA7D licht oranje
            } else if (colorIndex == 6.0) {
                particleColor = vec3(0.569, 0.792, 0.349); // #91CA59 groen
            } else {
                particleColor = vec3(0.831, 0.831, 0.831); // #D4D4D4 wit
            }
            
            // Apply glow effect
            col = mix(col, particleColor, glowStrength * 0.7);
            col *= 1.0 + glowStrength * 1.2;
        }
        
        // Apply sophisticated dissolve transition
        float dissolveTransition = smoothstep(0.0, 0.3, uDissolveProgress);
        finalAlpha *= mix(1.0, combinedMask * keepParticle, dissolveTransition);
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
function CosmosPhoto({ index, curve, offset, speed = 1, rotationCurve, scaleCurve, opacityCurve, imageUrl, tweenParams, isPaused }) {
    const meshRef = useRef()
    const progressRef = useRef(offset)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageTexture, setImageTexture] = useState(null)
    
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
            
            loader.load(
                imageUrl,
                (texture) => {
                    if (!cancelled) {
                        texture.minFilter = THREE.LinearFilter
                        texture.magFilter = THREE.LinearFilter
                        texture.wrapS = THREE.ClampToEdgeWrapping
                        texture.wrapT = THREE.ClampToEdgeWrapping
                        texture.flipY = false
                        
                        // Prevent squeezing by maintaining aspect ratio
                        const imageAspect = texture.image.width / texture.image.height
                        const targetAspect = 5 / 4 // Our target 5:4 aspect ratio
                        
                        // Calculate UV offset and scale to maintain aspect ratio
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
                },
                undefined,
                (error) => {
                    if (!cancelled) {
                        console.warn(`Failed to load image: ${imageUrl}`, error)
                        setImageLoaded(false)
                    }
                }
            )
            
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
                uTintColor: { value: new THREE.Color("#d0d0d0") },
                uDissolveProgress: { value: 0 },
                uSpeedMultiplier: { value: 0 },
                uMouseSpeedMultiplier: { value: 0 },
                uCameraMultiplier: { value: 0 },
                uModeProgress: { value: 0 },
                uFadeInProgress: { value: 1 },
                uYPosMultiplier: { value: 2.5 }
            }
        })
    }, [fallbackTexture])
    
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
        const dissolveStart = 0.82
        
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
        const scale = 1.30      // 20% larger: 1.08 * 1.2 = 1.296 ≈ 1.30
        
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
    
    // 3D curve (same as original)
    const curve = useMemo(() => {
        const curvePoints = [
            new THREE.Vector3(-7, -1, -8),
            new THREE.Vector3(-6.8, -0.2, -7),
            new THREE.Vector3(-6.4, 0.3, -6),
            new THREE.Vector3(-5.9, 0.7, -5),
            new THREE.Vector3(-5.4, 1, -4),
            new THREE.Vector3(-4.8, 1.2, -3),
            new THREE.Vector3(-3.9, 1.3, -1.8),
            new THREE.Vector3(-2.8, 1, -1),
            new THREE.Vector3(-1.5, 0.6, 0),
            new THREE.Vector3(-1, 0.4, 0)
        ]
        
        const smoothCurve = new THREE.CatmullRomCurve3(curvePoints)
        smoothCurve.curveType = 'catmullrom'
        smoothCurve.tension = 0.5
        
        return smoothCurve
    }, [])

    // Curves (same as original)
    const rotationCurve = useMemo(() => {
        return new THREE.SplineCurve([
            new THREE.Vector2(0, THREE.MathUtils.degToRad(-5)),
            new THREE.Vector2(1, THREE.MathUtils.degToRad(45))
        ])
    }, [])

    const scaleCurve = useMemo(() => {
        return new THREE.CubicBezierCurve(
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.55, 0),
            new THREE.Vector2(1, 0.45),
            new THREE.Vector2(1, 1)
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
    
    // Photo instances
    const photoInstances = useMemo(() => {
        const spiralImageCount = 10
        const instances = []
        
        for (let i = 0; i < spiralImageCount; i++) {
            instances.push({
                index: i,
                offset: i / spiralImageCount
            })
        }
        
        return instances
    }, [])
    
    // Cosmos-style mouse tracking with drag detection
    useEffect(() => {
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
    }, [mouseDown])
    
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
    
    // Cosmos-style camera animation
    useFrame((state, delta) => {
        if (groupRef.current) {
            // Smooth rotation lerp (like Cosmos)
            currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.1
            currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.1
            
            // Apply rotation to group
            groupRef.current.rotation.x = currentRotation.current.x
            groupRef.current.rotation.y = currentRotation.current.y
            
            // Cosmos-style position offset based on mouse
            groupRef.current.position.x = mousePosition.x * 0.2
            groupRef.current.position.y = mousePosition.y * 0.1
            
            // Apply group scaling
            groupRef.current.scale.setScalar(tweenParams.current.groupScale)
        }
        
        // Gradually reduce camera multiplier (like Cosmos lerp)
        tweenParams.current.cameraMultiplier *= 0.95
    })
    
    const spiralCount = 5
    
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
                        
                        return (
                            <CosmosPhoto
                                key={`${spiralIndex}-${idx}`}
                                index={instance.index}
                                curve={curve}
                                offset={instance.offset}
                                speed={speed}
                                rotationCurve={rotationCurve}
                                scaleCurve={scaleCurve}
                                opacityCurve={opacityCurve}
                                imageUrl={imageUrl}
                                tweenParams={tweenParams.current}
                                isPaused={isPaused}
                            />
                        )
                    })}
                </group>
            ))}
        </group>
    )
})

export default PhotoSpiralCosmos