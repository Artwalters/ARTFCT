import { useRef, useEffect, useMemo, useCallback, useState, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

const vertexShader = `
    attribute vec3 aTargetPosition0;
    attribute vec3 aTargetPosition1;
    attribute vec3 aTargetPosition2;
    attribute vec3 aTargetPosition3;
    attribute float aRandom;
    
    uniform float uMorphProgress;
    uniform float uTime;
    uniform int uCurrentModel;
    uniform int uTargetModel;
    
    varying vec3 vColor;
    varying float vRandom;
    
    vec3 getModelPosition(int modelIndex, vec3 pos0, vec3 pos1, vec3 pos2, vec3 pos3) {
        if (modelIndex == 0) return pos0;
        else if (modelIndex == 1) return pos1;
        else if (modelIndex == 2) return pos2;
        else return pos3;
    }
    
    void main() {
        vColor = color;
        vRandom = aRandom;
        
        vec3 currentPos = getModelPosition(uCurrentModel, aTargetPosition0, aTargetPosition1, aTargetPosition2, aTargetPosition3);
        vec3 targetPos = getModelPosition(uTargetModel, aTargetPosition0, aTargetPosition1, aTargetPosition2, aTargetPosition3);
        
        vec3 morphedPosition = mix(currentPos, targetPos, uMorphProgress);
        
        // Add some movement
        float timeOffset = uTime + aRandom * 6.28318;
        morphedPosition += sin(timeOffset) * 0.0;
        
        vec4 mvPosition = modelViewMatrix * vec4(morphedPosition, 1.0);
        
        float size = 2.0;
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
        alpha = pow(alpha, 3.0);
        
        float sparkle = sin(vRandom * 100.0) * 0.3 + 0.7;
        
        vec3 finalColor = mix(vColor, uGlowColor, 0.2) * sparkle;
        
        gl_FragColor = vec4(finalColor, alpha);
    }
`

const MODELS = [
    { name: 'HD', path: './hd.glb', color: 0x00CED1, scale: 50.0 },
    { name: 'Mae', path: './mae.glb', color: 0xFF69B4, scale: 50.0 },
    { name: 'Omni', path: './omni.glb', color: 0xFFD700, scale: 50.0 },
    { name: 'Walters', path: './walters.glb', color: 0x32CD32, scale: 50.0 }
]

// Helper function to sample points from multiple geometries
function sampleMultipleGeometriesToPoints(geometries, targetCount, scale = 1) {
    if (!Array.isArray(geometries)) {
        geometries = [geometries]
    }
    
    console.log(`Sampling from ${geometries.length} geometries with scale ${scale}`)
    
    // First, merge all geometries into one
    const mergedGeometry = new THREE.BufferGeometry()
    const allPositions = []
    const allIndices = []
    let vertexOffset = 0
    
    // Collect all positions and indices from all geometries
    for (let i = 0; i < geometries.length; i++) {
        const geometry = geometries[i]
        if (!geometry || !geometry.attributes || !geometry.attributes.position) {
            console.warn(`Skipping geometry ${i} without position attribute`)
            continue
        }
        
        const positionAttribute = geometry.attributes.position
        const positions = positionAttribute.array
        console.log(`Geometry ${i}: ${positions.length / 3} vertices`)
        
        // Add positions
        for (let j = 0; j < positions.length; j += 3) {
            allPositions.push(
                positions[j] * scale,
                positions[j + 1] * scale,
                positions[j + 2] * scale
            )
        }
        
        // Add indices if they exist
        if (geometry.index) {
            const indices = geometry.index.array
            for (let j = 0; j < indices.length; j++) {
                allIndices.push(indices[j] + vertexOffset)
            }
        } else {
            // Create indices for non-indexed geometry
            const vertexCount = positions.length / 3
            for (let j = 0; j < vertexCount; j++) {
                allIndices.push(j + vertexOffset)
            }
        }
        
        vertexOffset += positions.length / 3
    }
    
    console.log(`Total vertices collected: ${allPositions.length / 3}`)
    console.log(`Total indices: ${allIndices.length}`)
    
    if (allPositions.length === 0) {
        console.warn('No positions found, returning zeros')
        return new Float32Array(targetCount * 3)
    }
    
    // Create merged geometry
    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allPositions), 3))
    if (allIndices.length > 0) {
        mergedGeometry.setIndex(allIndices)
    }
    
    // Now sample from the merged geometry
    return sampleGeometryToPoints(mergedGeometry, targetCount, 1) // scale already applied
}

// Helper function to sample points from geometry
function sampleGeometryToPoints(geometry, targetCount, scale = 1) {
    const positions = []
    
    // Check if geometry exists
    if (!geometry || !geometry.attributes) {
        console.warn('No geometry found, returning empty positions')
        return new Float32Array(targetCount * 3) // Return zeros
    }
    
    // Get position attribute
    const positionAttribute = geometry.attributes.position
    if (!positionAttribute) return new Float32Array(targetCount * 3)
    
    // If geometry has indices (indexed geometry)
    if (geometry.index) {
        const indices = geometry.index.array
        const vertices = positionAttribute.array
        
        // Calculate total surface area for weighted sampling
        const triangleAreas = []
        let totalArea = 0
        
        for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i] * 3
            const i2 = indices[i + 1] * 3
            const i3 = indices[i + 2] * 3
            
            const v1 = new THREE.Vector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2])
            const v2 = new THREE.Vector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2])
            const v3 = new THREE.Vector3(vertices[i3], vertices[i3 + 1], vertices[i3 + 2])
            
            // Calculate triangle area
            const edge1 = v2.clone().sub(v1)
            const edge2 = v3.clone().sub(v1)
            const area = edge1.cross(edge2).length() * 0.5
            
            triangleAreas.push(area)
            totalArea += area
        }
        
        // Sample points based on triangle areas
        for (let i = 0; i < targetCount; i++) {
            // Pick a random triangle weighted by area
            let randomArea = Math.random() * totalArea
            let triangleIndex = 0
            let currentArea = 0
            
            for (let j = 0; j < triangleAreas.length; j++) {
                currentArea += triangleAreas[j]
                if (currentArea >= randomArea) {
                    triangleIndex = j
                    break
                }
            }
            
            // Get triangle vertices
            const i1 = indices[triangleIndex * 3] * 3
            const i2 = indices[triangleIndex * 3 + 1] * 3
            const i3 = indices[triangleIndex * 3 + 2] * 3
            
            const v1 = new THREE.Vector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2])
            const v2 = new THREE.Vector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2])
            const v3 = new THREE.Vector3(vertices[i3], vertices[i3 + 1], vertices[i3 + 2])
            
            // Random point on triangle
            const r1 = Math.random()
            const r2 = Math.random()
            const sqrtR1 = Math.sqrt(r1)
            
            const a = 1 - sqrtR1
            const b = sqrtR1 * (1 - r2)
            const c = sqrtR1 * r2
            
            const point = new THREE.Vector3()
                .addScaledVector(v1, a)
                .addScaledVector(v2, b)
                .addScaledVector(v3, c)
                .multiplyScalar(scale)
            
            positions.push(point.x, point.y, point.z)
        }
    } else {
        // Non-indexed geometry
        const vertices = positionAttribute.array
        const vertexCount = vertices.length / 3
        
        // Simple sampling for non-indexed geometry
        for (let i = 0; i < targetCount; i++) {
            const index = Math.floor(Math.random() * vertexCount) * 3
            positions.push(
                vertices[index] * scale,
                vertices[index + 1] * scale,
                vertices[index + 2] * scale
            )
        }
    }
    
    return new Float32Array(positions)
}

function ScrollMorph3DParticles({ particleCount = 25000 }) {
    const meshRef = useRef()
    const materialRef = useRef()
    const { camera } = useThree()
    const [modelsLoaded, setModelsLoaded] = useState(false)
    
    const currentModelRef = useRef(0)
    const scrollProgressRef = useRef(0)
    const isTransitioningRef = useRef(false)
    const animatedProgressRef = useRef(0)
    const scrollTimeoutRef = useRef(null)
    
    // Detect mobile for camera distance
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    const initialZ = isMobile ? 12 : 10
    
    // Load all models
    const hd = useGLTF(MODELS[0].path)
    const mae = useGLTF(MODELS[1].path)  
    const omni = useGLTF(MODELS[2].path)
    const walters = useGLTF(MODELS[3].path)
    
    // Set initial camera position
    useEffect(() => {
        camera.position.set(0, 0, initialZ)
        camera.updateProjectionMatrix()
    }, [camera, initialZ])
    
    // Create geometry with model positions
    const geometry = useMemo(() => {
        if (!hd || !mae || !omni || !walters) return null
        
        const geo = new THREE.BufferGeometry()
        
        // Initial positions (all at origin)
        const positions = new Float32Array(particleCount * 3)
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        
        // Helper function to calculate bounding box for all geometries
        const calculateBoundingBox = (geometries) => {
            const box = new THREE.Box3()
            geometries.forEach(geometry => {
                geometry.computeBoundingBox()
                box.union(geometry.boundingBox)
            })
            return box
        }
        
        // Target size for all models (based on Mae)
        const targetSize = 0.16 // Adjust this to make all models bigger/smaller
        
        // Sample points from each model's geometry
        // For HD - collect ALL meshes and merge them
        const hdGeometries = []
        console.log('HD model structure:')
        hd.scene.traverse((child) => {
            console.log('- Child:', child.type, child.name)
            if (child.isMesh && child.geometry) {
                console.log('  Found mesh with', child.geometry.attributes.position?.count, 'vertices')
                // Clone geometry - HD doesn't need rotation
                const clonedGeometry = child.geometry.clone()
                // No rotation for HD - it's already upright
                hdGeometries.push(clonedGeometry)
            }
        })
        console.log('Total HD geometries:', hdGeometries.length)
        
        // For Mae - collect ALL meshes and merge them
        const maeGeometries = []
        console.log('Mae model structure:')
        mae.scene.traverse((child) => {
            console.log('- Child:', child.type, child.name)
            if (child.isMesh && child.geometry) {
                console.log('  Found mesh with', child.geometry.attributes.position?.count, 'vertices')
                // Clone geometry and rotate it to stand upright
                const clonedGeometry = child.geometry.clone()
                clonedGeometry.rotateX(Math.PI / 2) // Rotate 90 degrees around X axis
                maeGeometries.push(clonedGeometry)
            }
        })
        console.log('Total Mae geometries:', maeGeometries.length)
        
        // For Omni - collect ALL meshes and merge them
        const omniGeometries = []
        console.log('Omni model structure:')
        omni.scene.traverse((child) => {
            console.log('- Child:', child.type, child.name)
            if (child.isMesh && child.geometry) {
                console.log('  Found mesh with', child.geometry.attributes.position?.count, 'vertices')
                // Clone geometry and rotate it to stand upright
                const clonedGeometry = child.geometry.clone()
                clonedGeometry.rotateX(Math.PI / 2) // Rotate 90 degrees around X axis
                omniGeometries.push(clonedGeometry)
            }
        })
        console.log('Total Omni geometries:', omniGeometries.length)
        
        // For Walters - collect ALL meshes and merge them
        const waltersGeometries = []
        console.log('Walters model structure:')
        walters.scene.traverse((child) => {
            console.log('- Child:', child.type, child.name)
            if (child.isMesh && child.geometry) {
                console.log('  Found mesh with', child.geometry.attributes.position?.count, 'vertices')
                // Clone geometry and rotate it to stand upright
                const clonedGeometry = child.geometry.clone()
                clonedGeometry.rotateX(Math.PI / 2) // Rotate 90 degrees around X axis
                waltersGeometries.push(clonedGeometry)
            }
        })
        console.log('Total Walters geometries:', waltersGeometries.length)
        
        // Calculate bounding boxes and normalize scales
        const hdBox = calculateBoundingBox(hdGeometries)
        const maeBox = calculateBoundingBox(maeGeometries)
        const omniBox = calculateBoundingBox(omniGeometries)
        const waltersBox = calculateBoundingBox(waltersGeometries)
        
        // Calculate scale factors to normalize all models to the same size
        const hdSize = hdBox.getSize(new THREE.Vector3()).length()
        const maeSize = maeBox.getSize(new THREE.Vector3()).length()
        const omniSize = omniBox.getSize(new THREE.Vector3()).length()
        const waltersSize = waltersBox.getSize(new THREE.Vector3()).length()
        
        // Use Mae as reference size
        const referenceSize = maeSize
        
        const hdScale = (targetSize / hdSize) * MODELS[0].scale * 0.5  // HD is half size
        const maeScale = (targetSize / maeSize) * MODELS[1].scale
        const omniScale = (targetSize / omniSize) * MODELS[2].scale
        const waltersScale = (targetSize / waltersSize) * MODELS[3].scale
        
        console.log('Model sizes:', { hdSize, maeSize, omniSize, waltersSize })
        console.log('Calculated scales:', { hdScale, maeScale, omniScale, waltersScale })
        
        const targetPositions0 = sampleMultipleGeometriesToPoints(
            hdGeometries,
            particleCount,
            hdScale
        )
        
        const targetPositions1 = sampleMultipleGeometriesToPoints(
            maeGeometries,
            particleCount,
            maeScale
        )
        
        const targetPositions2 = sampleMultipleGeometriesToPoints(
            omniGeometries,
            particleCount,
            omniScale
        )
        
        const targetPositions3 = sampleMultipleGeometriesToPoints(
            waltersGeometries,
            particleCount,
            waltersScale
        )
        
        // Set attributes for each model's positions
        geo.setAttribute('aTargetPosition0', new THREE.BufferAttribute(targetPositions0, 3))
        geo.setAttribute('aTargetPosition1', new THREE.BufferAttribute(targetPositions1, 3))
        geo.setAttribute('aTargetPosition2', new THREE.BufferAttribute(targetPositions2, 3))
        geo.setAttribute('aTargetPosition3', new THREE.BufferAttribute(targetPositions3, 3))
        
        // Random values
        const randoms = new Float32Array(particleCount)
        for (let i = 0; i < particleCount; i++) {
            randoms[i] = Math.random()
        }
        geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
        
        // Colors
        const colors = new Float32Array(particleCount * 3)
        const baseColor = new THREE.Color(MODELS[0].color)
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3
            colors[idx] = baseColor.r + Math.random() * 0.1
            colors[idx + 1] = baseColor.g + Math.random() * 0.1
            colors[idx + 2] = baseColor.b + Math.random() * 0.1
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        
        setModelsLoaded(true)
        return geo
    }, [hd, mae, omni, walters, particleCount])
    
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMorphProgress: { value: 0 },
                uCurrentModel: { value: 0 },
                uTargetModel: { value: 1 },
                uGlowColor: { value: new THREE.Color(MODELS[0].color) }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        })
    }, [])
    
    const updateColors = useCallback((modelIndex) => {
        if (!geometry) return
        
        const colorAttr = geometry.getAttribute('color')
        const color = new THREE.Color(MODELS[modelIndex].color)
        const colors = colorAttr.array
        
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3
            const variation = Math.random() * 0.1
            colors[idx] = color.r + variation
            colors[idx + 1] = color.g + variation
            colors[idx + 2] = color.b + variation
        }
        colorAttr.needsUpdate = true
        
        const newColor = new THREE.Color(MODELS[modelIndex].color)
        gsap.to(materialRef.current.uniforms.uGlowColor.value, {
            r: newColor.r,
            g: newColor.g,
            b: newColor.b,
            duration: 0.5
        })
    }, [geometry, particleCount])
    
    const completeTransition = useCallback(() => {
        // Calculate next models
        const nextCurrent = (currentModelRef.current + 1) % MODELS.length
        const nextTarget = (nextCurrent + 1) % MODELS.length
        
        // Update model references
        currentModelRef.current = nextCurrent
        
        // Update uniforms for new current model
        materialRef.current.uniforms.uCurrentModel.value = nextCurrent
        materialRef.current.uniforms.uTargetModel.value = nextTarget
        materialRef.current.uniforms.uMorphProgress.value = 0
        
        updateColors(nextCurrent)
        
        const counter = document.getElementById('model-counter')
        if (counter) {
            counter.textContent = `Model ${nextCurrent + 1} / ${MODELS.length}: ${MODELS[nextCurrent].name}`
        }
    }, [updateColors])
    
    const resetToStart = useCallback(() => {
        const scrollContainer = document.getElementById('scroll-wrapper')
        if (scrollContainer) {
            scrollContainer.style.overflow = 'hidden'
            scrollContainer.scrollTop = 0
            setTimeout(() => {
                scrollContainer.style.overflow = 'auto'
            }, 100)
        } else {
            window.scrollTo(0, 0)
        }
        scrollProgressRef.current = 0
        
        const progressBar = document.getElementById('progressBar')
        if (progressBar) {
            progressBar.style.height = "0%"
        }
        
        ScrollTrigger.refresh()
    }, [])
    
    useEffect(() => {
        if (!modelsLoaded) return
        
        const initScrollTrigger = () => {
            const scrollContainer = document.getElementById('scroll-wrapper')
            
            ScrollTrigger.create({
                trigger: scrollContainer ? ".scroll-content" : "body",
                start: "top top",
                end: "bottom bottom",
                scrub: true,
                scroller: scrollContainer || undefined,
                onUpdate: (self) => {
                    const progress = self.progress
                    scrollProgressRef.current = progress
                    
                    if (scrollTimeoutRef.current) {
                        clearTimeout(scrollTimeoutRef.current)
                    }
                    
                    let morphProgress
                    if (progress < 0.7) {
                        morphProgress = progress * 0.2 / 0.7
                    } else {
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
                        
                        completeTransition()
                        
                        setTimeout(() => {
                            resetToStart()
                            setTimeout(() => {
                                isTransitioningRef.current = false
                            }, 500)
                        }, 800)
                    } else if (progress < 1.0 && progress > 0.02) {
                        scrollTimeoutRef.current = setTimeout(() => {
                            const scrollContainer = document.getElementById('scroll-wrapper')
                            gsap.to(scrollContainer || window, {
                                scrollTo: { y: 0 },
                                duration: 1.5,
                                ease: "power2.inOut"
                            })
                            
                            const progressBar = document.getElementById('progressBar')
                            if (progressBar) {
                                gsap.to(progressBar.style, {
                                    height: "0%",
                                    duration: 1.5,
                                    ease: "power2.inOut"
                                })
                            }
                        }, 600)
                    }
                }
            })
        }
        
        setTimeout(initScrollTrigger, 100)
        
        return () => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill())
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current)
            }
        }
    }, [modelsLoaded, completeTransition, resetToStart])
    
    useFrame((_, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value += delta
        }
        
        // Removed rotation - models stay static
    })
    
    if (!geometry) return null
    
    return (
        <points ref={meshRef} geometry={geometry} material={material}>
            <primitive object={geometry} />
            <primitive object={material} ref={materialRef} />
        </points>
    )
}

function ScrollMorph3DUI() {
    useEffect(() => {
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
        `
        document.head.appendChild(style)
        
        const ui = document.createElement('div')
        ui.className = 'scroll-morph-ui'
        ui.innerHTML = `
            <div class="progress-bar-container">
                <div class="progress-bar" id="progressBar"></div>
            </div>
            
            <div class="model-counter" id="model-counter">
                Model 1 / 4: ${MODELS[0].name}
            </div>
            
            <div class="scroll-indicator">
                ↓ Scroll to morph between 3D models ↓<br>
                <small>100% scroll = next model</small>
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

function LoadingFallback() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ff6600" />
        </mesh>
    )
}

// Preload all models
MODELS.forEach(model => {
    useGLTF.preload(model.path)
})

export default function ScrollMorphScene3D({ onSceneStart }) {
    const particleCount = useMemo(() => {
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        return isMobile ? 15000 : 25000
    }, [])
    
    useEffect(() => {
        const scrollContainer = document.getElementById('scroll-wrapper')
        if (scrollContainer) {
            scrollContainer.scrollTop = 0
        } else {
            window.scrollTo(0, 0)
        }
        
        const progressBar = document.getElementById('progressBar')
        if (progressBar) {
            progressBar.style.height = "0%"
        }
        
        ScrollTrigger.refresh()
        
        if (onSceneStart) onSceneStart()
        console.log(`ScrollMorphScene3D initialized with ${particleCount} particles and 3D models`)
    }, [onSceneStart, particleCount])
    
    return (
        <>
            <Suspense fallback={<LoadingFallback />}>
                <ScrollMorph3DParticles particleCount={particleCount} />
            </Suspense>
            <ScrollMorph3DUI />
        </>
    )
}