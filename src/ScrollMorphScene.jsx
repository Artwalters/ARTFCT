import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

const vertexShader = `
    attribute vec3 aRandom3;
    attribute float aRandom;
    
    uniform float uMorphProgress;
    uniform float uTime;
    uniform int uCurrentShape;
    uniform int uTargetShape;
    
    varying vec3 vColor;
    varying float vRandom;
    
    vec3 getSphere(float index, float total) {
        float golden = 3.14159 * (3.0 - sqrt(5.0));
        float y = 1.0 - (index / (total - 1.0)) * 2.0;
        float radiusAtY = sqrt(1.0 - y * y) * 2.2;
        float theta = golden * index;
        
        return vec3(
            cos(theta) * radiusAtY,
            y * 2.2,
            sin(theta) * radiusAtY
        );
    }
    
    vec3 getCube(vec3 random) {
        return (random - 0.5) * 3.0;
    }
    
    vec3 getTorus(vec3 random) {
        float u = random.x * 6.28318;
        float v = random.y * 6.28318;
        float major = 1.8;
        float minor = 0.6;
        
        return vec3(
            (major + minor * cos(v)) * cos(u),
            minor * sin(v),
            (major + minor * cos(v)) * sin(u)
        );
    }
    
    vec3 getPyramid(vec3 random) {
        float level = random.x;
        float angle = random.y * 6.28318;
        float radius = (1.0 - level) * 1.5;
        
        return vec3(
            radius * cos(angle),
            level * 3.0 - 1.5,
            radius * sin(angle)
        );
    }
    
    vec3 getSpiral(vec3 random) {
        float t = random.x;
        float angle = t * 6.28318 * 4.0;
        float r = 1.5 * (1.0 - t * 0.3);
        
        return vec3(
            r * cos(angle),
            (t - 0.5) * 3.5,
            r * sin(angle)
        );
    }
    
    vec3 getShapePosition(int shapeIndex, float index, float total, vec3 random) {
        if (shapeIndex == 0) return getSphere(index, total);
        else if (shapeIndex == 1) return getCube(random);
        else if (shapeIndex == 2) return getTorus(random);
        else if (shapeIndex == 3) return getPyramid(random);
        else return getSpiral(random);
    }
    
    void main() {
        vColor = color;
        vRandom = aRandom;
        
        float index = float(gl_VertexID);
        float total = 25000.0;
        
        vec3 currentPos = getShapePosition(uCurrentShape, index, total, aRandom3);
        vec3 targetPos = getShapePosition(uTargetShape, index, total, aRandom3);
        
        vec3 morphedPosition = mix(currentPos, targetPos, uMorphProgress);
        
        float timeOffset = uTime + aRandom * 6.28318;
        morphedPosition += sin(timeOffset) * 0.01;
        
        vec4 mvPosition = modelViewMatrix * vec4(morphedPosition, 1.0);
        
        float size = 4.0;
        gl_PointSize = size * (200.0 / -mvPosition.z);
        
        gl_Position = projectionMatrix * mvPosition;
    }
`

const fragmentShader = `
    uniform vec3 uGlowColor;
    
    varying vec3 vColor;
    varying float vRandom;
    
    void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha = pow(alpha, 1.2);
        
        float sparkle = sin(vRandom * 100.0) * 0.3 + 0.7;
        
        vec3 finalColor = mix(vColor, uGlowColor, 0.6) * sparkle;
        
        gl_FragColor = vec4(finalColor, alpha);
    }
`

const SHAPES = [
    { name: 'Sphere', color: 0x8A2BE2 },
    { name: 'Cube', color: 0xFF8C00 },
    { name: 'Torus', color: 0x00CED1 },
    { name: 'Pyramid', color: 0x32CD32 },
    { name: 'Spiral', color: 0xFF1493 }
]

function ScrollMorphParticles({ particleCount = 25000 }) {
    const meshRef = useRef()
    const materialRef = useRef()
    const { camera } = useThree()
    
    const currentShapeRef = useRef(0)
    const scrollProgressRef = useRef(0)
    const isTransitioningRef = useRef(false)
    const transitionCompleteRef = useRef(false)
    const scrollTimeoutRef = useRef(null)
    const animatedProgressRef = useRef(0)
    
    // Detect mobile for camera distance
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    const initialZ = isMobile ? 12 : 10
    
    const baseCameraZ = useRef(initialZ)
    const currentCameraZ = useRef(initialZ)
    
    // Set initial camera position and handle scene start
    useEffect(() => {
        // Force camera to correct position
        camera.position.set(0, 0, initialZ)
        currentCameraZ.value = initialZ
        
        // Also update the current position ref from Experience.jsx
        camera.updateProjectionMatrix()
    }, [camera, initialZ])
    
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry()
        
        const positions = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount * 3; i++) {
            positions[i] = 0
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        
        const randoms = new Float32Array(particleCount)
        const randoms3 = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount; i++) {
            randoms[i] = Math.random()
            randoms3[i * 3] = Math.random()
            randoms3[i * 3 + 1] = Math.random()
            randoms3[i * 3 + 2] = Math.random()
        }
        geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
        geo.setAttribute('aRandom3', new THREE.BufferAttribute(randoms3, 3))
        
        const colors = new Float32Array(particleCount * 3)
        const baseColor = new THREE.Color(SHAPES[0].color)
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3
            colors[idx] = baseColor.r + Math.random() * 0.1
            colors[idx + 1] = baseColor.g + Math.random() * 0.1
            colors[idx + 2] = baseColor.b + Math.random() * 0.1
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        
        return geo
    }, [particleCount])
    
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMorphProgress: { value: 0 },
                uCurrentShape: { value: 0 },
                uTargetShape: { value: 1 },
                uGlowColor: { value: new THREE.Color(SHAPES[0].color) }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        })
    }, [])
    
    const updateColors = useCallback((shapeIndex) => {
        const colorAttr = geometry.getAttribute('color')
        const color = new THREE.Color(SHAPES[shapeIndex].color)
        const colors = colorAttr.array
        
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3
            const variation = Math.random() * 0.1
            colors[idx] = color.r + variation
            colors[idx + 1] = color.g + variation
            colors[idx + 2] = color.b + variation
        }
        colorAttr.needsUpdate = true
        
        const newColor = new THREE.Color(SHAPES[shapeIndex].color)
        gsap.to(materialRef.current.uniforms.uGlowColor.value, {
            r: newColor.r,
            g: newColor.g,
            b: newColor.b,
            duration: 0.5
        })
    }, [geometry, particleCount])
    
    const completeTransition = useCallback(() => {
        // Calculate next shapes
        const nextCurrent = (currentShapeRef.current + 1) % SHAPES.length
        const nextTarget = (nextCurrent + 1) % SHAPES.length
        
        // Update shape references
        currentShapeRef.current = nextCurrent
        
        // Update uniforms for new current shape
        materialRef.current.uniforms.uCurrentShape.value = nextCurrent
        materialRef.current.uniforms.uTargetShape.value = nextTarget
        materialRef.current.uniforms.uMorphProgress.value = 0
        
        updateColors(nextCurrent)
        
        const counter = document.getElementById('model-counter')
        if (counter) {
            counter.textContent = `Model ${nextCurrent + 1} / ${SHAPES.length}: ${SHAPES[nextCurrent].name}`
        }
    }, [updateColors])
    
    const resetToStart = useCallback(() => {
        // Instant scroll reset to prevent showing intermediate shapes
        window.scrollTo(0, 0)
        scrollProgressRef.current = 0
        
        // Reset progress bar instantly
        const progressBar = document.getElementById('progressBar')
        if (progressBar) {
            progressBar.style.height = "0%"
        }
        
        // Refresh ScrollTrigger after instant scroll
        ScrollTrigger.refresh()
    }, [])
    
    useEffect(() => {
        ScrollTrigger.create({
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: (self) => {
                const progress = self.progress
                scrollProgressRef.current = progress
                
                // Clear timeout on new scroll
                if (scrollTimeoutRef.current) {
                    clearTimeout(scrollTimeoutRef.current)
                }
                
                // Subtle morphing from start, stronger at the end
                let morphProgress
                if (progress < 0.7) {
                    // 0-70%: subtle morph (0 to 0.2)
                    morphProgress = progress * 0.2 / 0.7
                } else {
                    // 70-100%: strong morph (0.2 to 1.0)
                    morphProgress = 0.2 + ((progress - 0.7) / 0.3) * 0.8
                }
                animatedProgressRef.current = morphProgress
                
                if (materialRef.current) {
                    materialRef.current.uniforms.uMorphProgress.value = morphProgress
                }
                
                const progressBar = document.getElementById('progressBar')
                if (progressBar) {
                    progressBar.style.height = `${Math.round(progress * 100)}%`
                }
                
                if (progress >= 1.0 && !isTransitioningRef.current) {
                    isTransitioningRef.current = true
                    
                    // Complete transition immediately
                    completeTransition()
                    
                    // Reset scroll after brief delay to show completed transition
                    setTimeout(() => {
                        resetToStart()
                        isTransitioningRef.current = false
                    }, 500)
                } else if (progress < 1.0 && progress > 0.02) {
                    // Set timeout to ease back if scroll is incomplete
                    scrollTimeoutRef.current = setTimeout(() => {
                        // Animate both scroll and morph back to 0
                        gsap.to(window, {
                            scrollTo: { y: 0 },
                            duration: 1.5,
                            ease: "power2.inOut"
                        })
                        
                        // Progress bar animation
                        const progressBar = document.getElementById('progressBar')
                        if (progressBar) {
                            gsap.to(progressBar.style, {
                                height: "0%",
                                duration: 1.5,
                                ease: "power2.inOut"
                            })
                        }
                    }, 600) // Wait 600ms before easing back
                }
            }
        })
        
        return () => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill())
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current)
            }
        }
    }, [completeTransition, resetToStart])
    
    useFrame((_, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value += delta
        }
        
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.001
        }
    })
    
    return (
        <points ref={meshRef} geometry={geometry} material={material}>
            <primitive object={geometry} />
            <primitive object={material} ref={materialRef} />
        </points>
    )
}

function ScrollMorphUI() {
    useEffect(() => {
        // Handle viewport height changes on mobile
        const setVH = () => {
            const vh = window.innerHeight * 0.01
            document.documentElement.style.setProperty('--vh', `${vh}px`)
        }
        
        setVH()
        window.addEventListener('resize', setVH)
        window.addEventListener('orientationchange', setVH)
        
        const style = document.createElement('style')
        style.textContent = `
            .scroll-morph-ui {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 100;
            }
            
            .progress-bar-container {
                position: absolute;
                top: 50%;
                right: 30px;
                transform: translateY(-50%);
                width: 8px;
                height: 200px;
                background: rgba(20, 20, 20, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .progress-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 0%;
                background: linear-gradient(to top, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4));
                border-radius: 2px;
                transition: height 0.05s ease-out;
            }
            
            .model-counter {
                position: absolute;
                top: 30px;
                left: 50%;
                transform: translateX(-50%);
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 600;
                background: rgba(0, 0, 0, 0.6);
                padding: 12px 24px;
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
            }
            
            .scroll-indicator {
                position: absolute;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                color: rgba(255, 255, 255, 0.7);
                font-size: 14px;
                text-align: center;
                animation: float 2s ease-in-out infinite;
                pointer-events: auto;
            }
            
            @keyframes float {
                0%, 100% { transform: translateX(-50%) translateY(0px); }
                50% { transform: translateX(-50%) translateY(-10px); }
            }
            
            
            body {
                height: 500vh;
                overflow-y: scroll;
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE and Edge */
            }
            
            body::-webkit-scrollbar {
                display: none; /* Chrome, Safari and Opera */
            }
        `
        document.head.appendChild(style)
        
        const ui = document.createElement('div')
        ui.className = 'scroll-morph-ui'
        ui.innerHTML = `
            <div class="progress-bar-container">
                <div class="progress-bar" id="progressBar"></div>
            </div>
            
            <div class="model-counter" id="model-counter">
                Model 1 / 5: Sphere
            </div>
            
            <div class="scroll-indicator">
                ↓ Scroll naar beneden om te morphen ↓<br>
                <small>100% scroll = bevestig transitie</small>
            </div>
            
        `
        
        document.body.appendChild(ui)
        
        return () => {
            document.head.removeChild(style)
            if (document.body.contains(ui)) {
                document.body.removeChild(ui)
            }
            window.removeEventListener('resize', setVH)
            window.removeEventListener('orientationchange', setVH)
        }
    }, [])
    
    return null
}

export default function ScrollMorphScene({ onSceneStart }) {
    const particleCount = useMemo(() => {
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        return isMobile ? 15000 : 25000
    }, [])
    
    useEffect(() => {
        // Reset scroll position when scene starts
        window.scrollTo(0, 0)
        
        // Reset progress bar
        const progressBar = document.getElementById('progressBar')
        if (progressBar) {
            progressBar.style.height = "0%"
        }
        
        // Refresh ScrollTrigger
        ScrollTrigger.refresh()
        
        if (onSceneStart) onSceneStart()
        console.log(`ScrollMorphScene initialized with ${particleCount} particles`)
    }, [onSceneStart, particleCount])
    
    return (
        <>
            <ScrollMorphParticles particleCount={particleCount} />
            <ScrollMorphUI />
        </>
    )
}