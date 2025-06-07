import { useRef, useEffect, useMemo, useState, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { MODELS_3D as MODELS } from '../../data/projects'
import { CODE_CHARACTERS } from '../../constants/particles'
import { createCharacterAtlas } from '../../utils/characterAtlas'
import { sampleMultipleGeometriesToPoints } from '../../utils/geometryHelpers'
// import { particleVertexShader, particleFragmentShader } from '../../utils/shaders'
import { logoVertexShader, logoFragmentShader } from '../../utils/logoShaders'

function LogoParticles({ modelIndex = 0, particleCount = 10000 }) {
    const meshRef = useRef()
    const materialRef = useRef()
    const [modelLoaded, setModelLoaded] = useState(false)
    const { viewport, camera } = useThree()
    
    // Mouse tracking state
    const mousePosition = useRef(new THREE.Vector3(0, 0, 0))
    const prevMousePosition = useRef(new THREE.Vector3(0, 0, 0))
    const mouseVelocity = useRef(new THREE.Vector3(0, 0, 0))
    const mouseInfluence = useRef(0)
    const isMouseDown = useRef(false)
    
    // Physics system
    const particleVelocities = useRef(null)
    const originalPositions = useRef(null)
    const currentPositions = useRef(null)
    const particleDensities = useRef(null) // How "deep" each particle is in the model
    const particleReturnSpeeds = useRef(null) // How fast each particle returns to original position
    
    // Create character atlas once
    const characterAtlas = useMemo(() => createCharacterAtlas(), [])
    
    // Get model info from MODELS array
    const modelInfo = MODELS[modelIndex]
    const color = modelInfo.color
    
    // Load all models
    const hd = useGLTF(MODELS[0].path)
    const mae = useGLTF(MODELS[1].path)
    const omni = useGLTF(MODELS[2].path)
    const walters = useGLTF(MODELS[3].path)
    
    // Select the current model based on index
    const models = [hd, mae, omni, walters]
    const model = models[modelIndex]
    
    // Create geometry with model positions
    const geometry = useMemo(() => {
        if (!model) return null
        
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
        
        // Target size for all models (same as original)
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        const targetSize = isMobile ? 0.14 : 0.16
        
        // Collect all geometries from model
        const geometries = []
        model.scene.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const clonedGeometry = child.geometry.clone()
                // Check if model needs rotation (some models are lying down)
                if (modelIndex === 1 || modelIndex === 2 || modelIndex === 3) {
                    clonedGeometry.rotateX(Math.PI / 2)
                }
                geometries.push(clonedGeometry)
            }
        })
        
        if (geometries.length === 0) return null
        
        // Calculate bounding box and normalize scale (same as original)
        const boundingBox = calculateBoundingBox(geometries)
        const modelSize = boundingBox.getSize(new THREE.Vector3()).length()
        
        // Calculate scale based on model index (same scaling as original)
        let calculatedScale
        if (modelIndex === 0) {
            calculatedScale = (targetSize / modelSize) * MODELS[modelIndex].scale * 0.5
        } else {
            calculatedScale = (targetSize / modelSize) * MODELS[modelIndex].scale * 0.8
        }
        
        // Sample points from geometry
        const targetPositions = sampleMultipleGeometriesToPoints(
            geometries,
            particleCount,
            calculatedScale
        )
        
        // Set the target positions for all 4 models (but we only use one)
        // The shader expects aTargetPosition0, 1, 2, 3
        geo.setAttribute('aTargetPosition0', new THREE.BufferAttribute(targetPositions, 3))
        geo.setAttribute('aTargetPosition1', new THREE.BufferAttribute(targetPositions, 3))
        geo.setAttribute('aTargetPosition2', new THREE.BufferAttribute(targetPositions, 3))
        geo.setAttribute('aTargetPosition3', new THREE.BufferAttribute(targetPositions, 3))
        
        // Initialize physics arrays
        originalPositions.current = new Float32Array(targetPositions)
        currentPositions.current = new Float32Array(targetPositions)
        particleVelocities.current = new Float32Array(particleCount * 3)
        particleDensities.current = new Float32Array(particleCount)
        particleReturnSpeeds.current = new Float32Array(particleCount)
        
        // Calculate particle density (how many neighbors each particle has)
        const densityRadius = 0.08 // Smaller radius for more accurate surface detection
        let maxNeighbors = 0
        const neighborCounts = new Array(particleCount)
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3
            const px = targetPositions[i3]
            const py = targetPositions[i3 + 1]
            const pz = targetPositions[i3 + 2]
            
            let neighborCount = 0
            for (let j = 0; j < particleCount; j++) {
                if (i === j) continue
                const j3 = j * 3
                const dx = px - targetPositions[j3]
                const dy = py - targetPositions[j3 + 1]
                const dz = pz - targetPositions[j3 + 2]
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
                
                if (dist < densityRadius) {
                    neighborCount++
                }
            }
            
            neighborCounts[i] = neighborCount
            maxNeighbors = Math.max(maxNeighbors, neighborCount)
        }
        
        // Normalize based on actual max neighbors found
        for (let i = 0; i < particleCount; i++) {
            particleDensities.current[i] = maxNeighbors > 0 ? neighborCounts[i] / maxNeighbors : 0
        }
        
        // Initialize random return speeds for each particle - EXTREME differences
        for (let i = 0; i < particleCount; i++) {
            particleReturnSpeeds.current[i] = 0.0001 + Math.random() * 0.0999 // Range: 0.0001 to 0.1 (1000x difference in return speed!)
        }
        
        console.log('Max neighbors found:', maxNeighbors, 'Surface particles:', neighborCounts.filter(n => n < maxNeighbors * 0.3).length)
        
        // Set initial positions to target positions
        positions.set(targetPositions)
        
        // Random values
        const randoms = new Float32Array(particleCount)
        for (let i = 0; i < particleCount; i++) {
            randoms[i] = Math.random()
        }
        geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
        
        // Character indices
        const charIndices = new Float32Array(particleCount)
        for (let i = 0; i < particleCount; i++) {
            charIndices[i] = Math.floor(Math.random() * CODE_CHARACTERS.length)
        }
        geo.setAttribute('aCharIndex', new THREE.BufferAttribute(charIndices, 1))
        
        // Colors
        const colors = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3
            colors[idx] = 0.9
            colors[idx + 1] = 0.9
            colors[idx + 2] = 0.9
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        
        setModelLoaded(true)
        return geo
    }, [model, particleCount, modelIndex])
    
    // Use shaders from utils but with simplified uniforms (no morph/interaction)
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMorphProgress: { value: 0 }, // Always 0 (no morphing)
                uCurrentModel: { value: modelIndex },
                uTargetModel: { value: modelIndex }, // Same as current (no morphing)
                uGlowColor: { value: new THREE.Color(color) },
                uCharAtlas: { value: characterAtlas.texture },
                uAtlasColumns: { value: characterAtlas.cols },
                uAtlasRows: { value: characterAtlas.rows },
                uCircleMorphProgress: { value: 0 }, // Always 0 (no suction effect)
                uMousePosition: { value: new THREE.Vector3(0, 0, 0) },
                uMouseVelocity: { value: new THREE.Vector3(0, 0, 0) },
                uMouseInfluence: { value: 0 },
                uIsGrabbing: { value: 0 },
                uMagneticForce: { value: 0.03 } // Gentle return force for smoke effect
            },
            vertexShader: logoVertexShader,
            fragmentShader: logoFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        })
    }, [characterAtlas, color, modelIndex])
    
    // Mouse tracking
    useEffect(() => {
        const handleMouseMove = (event) => {
            // Store previous position for velocity calculation
            prevMousePosition.current.copy(mousePosition.current)
            
            // Convert screen coordinates to normalized device coordinates
            const x = (event.clientX / window.innerWidth) * 2 - 1
            const y = -(event.clientY / window.innerHeight) * 2 + 1
            
            // Convert to world coordinates using camera position and viewport
            const vector = new THREE.Vector3(x, y, 0.5)
            vector.unproject(camera)
            
            // Calculate direction from camera to mouse point
            const direction = vector.sub(camera.position).normalize()
            
            // Find intersection with z=0 plane (where our model rotates around)
            const distance = -camera.position.z / direction.z
            const intersection = camera.position.clone().add(direction.multiplyScalar(distance))
            
            mousePosition.current.copy(intersection)
            
            // Calculate mouse velocity (movement direction and speed)
            mouseVelocity.current.subVectors(mousePosition.current, prevMousePosition.current)
            mouseVelocity.current.multiplyScalar(10) // Amplify velocity for effect
            
            mouseInfluence.current = 1.0 // Mouse is active
        }
        
        const handleMouseDown = () => {
            isMouseDown.current = true
        }
        
        const handleMouseUp = () => {
            isMouseDown.current = false
        }
        
        const handleMouseLeave = () => {
            mouseInfluence.current = 0 // Mouse is not active
            isMouseDown.current = false
        }
        
        // Immediate effect on mount
        const rect = window.getBoundingClientRect ? document.body.getBoundingClientRect() : { left: 0, top: 0 }
        const initialX = (window.innerWidth / 2 - rect.left) / window.innerWidth * 2 - 1
        const initialY = -(window.innerHeight / 2 - rect.top) / window.innerHeight * 2 + 1
        
        const initialVector = new THREE.Vector3(initialX, initialY, 0.5)
        initialVector.unproject(camera)
        const initialDirection = initialVector.sub(camera.position).normalize()
        const initialDistance = -camera.position.z / initialDirection.z
        const initialIntersection = camera.position.clone().add(initialDirection.multiplyScalar(initialDistance))
        
        mousePosition.current.copy(initialIntersection)
        mouseInfluence.current = 1.0
        
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mouseup', handleMouseUp)
        window.addEventListener('mouseleave', handleMouseLeave)
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            window.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [camera])
    
    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value += delta
        }
        
        // Physics update
        if (geometry && particleVelocities.current && originalPositions.current && currentPositions.current) {
            const positionAttr = geometry.getAttribute('position')
            const positions = positionAttr.array
            const velocities = particleVelocities.current
            const originals = originalPositions.current
            const currents = currentPositions.current
            
            const mousePos = mousePosition.current
            const mouseVel = mouseVelocity.current
            const pushRadius = 1.0 // Smaller, more precise brush
            const pushStrength = 2.0 // Much more subtle effect
            const damping = 0.98
            
            // Debug: Log mouse info occasionally
            if (Math.random() < 0.01) {
                console.log('Mouse pos:', mousePos, 'Influence:', mouseInfluence.current, 'Velocity:', mouseVel.length())
            }
            
            let particlesAffected = 0
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3
                
                // Current particle position
                const px = currents[i3]
                const py = currents[i3 + 1] 
                const pz = currents[i3 + 2]
                
                // Distance to mouse (only X-Y plane, ignore Z)
                const dx = px - mousePos.x
                const dy = py - mousePos.y
                const dist = Math.sqrt(dx * dx + dy * dy) // No Z component
                
                // Mouse push effect
                if (dist < pushRadius && mouseInfluence.current > 0) {
                    particlesAffected++
                    
                    // Use particle density for resistance: more neighbors = harder to move
                    const density = particleDensities.current[i]
                    
                    // Add random resistance variation for natural movement - MASSIVE differences
                    const randomFactor = 0.001 + Math.random() * 49.999 // Range: 0.001 to 50.0 random multiplier (50,000x difference!)
                    
                    const baseResistance = 0.05 + (1.0 - density) * 0.45 // Range: 0.05 (deep) to 0.5 (surface)
                    const resistanceFactor = baseResistance * randomFactor
                    
                    // Speed-based intensity: faster mouse = stronger effect
                    const mouseSpeed = Math.sqrt(mouseVel.x * mouseVel.x + mouseVel.y * mouseVel.y)
                    const speedMultiplier = 1.0 + Math.min(mouseSpeed * 2.0, 5.0) // 1x to 6x intensity based on speed
                    
                    const influence = 1.0 - (dist / pushRadius)
                    const pushForce = influence * pushStrength * delta * resistanceFactor * speedMultiplier
                    
                    // Simply drag particles in mouse movement direction (only X-Y plane)
                    const velLength = Math.sqrt(mouseVel.x * mouseVel.x + mouseVel.y * mouseVel.y)
                    if (velLength > 0.01) {
                        // Move particles in the same direction as mouse movement
                        velocities[i3] += mouseVel.x * pushForce * 0.15
                        velocities[i3 + 1] += mouseVel.y * pushForce * 0.15
                        // Z velocity unchanged: velocities[i3 + 2] += 0
                    }
                }
                
                // Return to original position (random speed per particle)
                const returnDx = originals[i3] - currents[i3]
                const returnDy = originals[i3 + 1] - currents[i3 + 1]
                const returnDz = originals[i3 + 2] - currents[i3 + 2]
                
                const particleReturnSpeed = particleReturnSpeeds.current[i]
                velocities[i3] += returnDx * particleReturnSpeed
                velocities[i3 + 1] += returnDy * particleReturnSpeed
                velocities[i3 + 2] += returnDz * particleReturnSpeed
                
                // Apply damping
                velocities[i3] *= damping
                velocities[i3 + 1] *= damping
                velocities[i3 + 2] *= damping
                
                // Update positions
                currents[i3] += velocities[i3] * delta
                currents[i3 + 1] += velocities[i3 + 1] * delta
                currents[i3 + 2] += velocities[i3 + 2] * delta
                
                // Copy to geometry
                positions[i3] = currents[i3]
                positions[i3 + 1] = currents[i3 + 1]
                positions[i3 + 2] = currents[i3 + 2]
            }
            
            // Debug log particles affected
            if (particlesAffected > 0 && Math.random() < 0.1) {
                console.log('Particles affected:', particlesAffected)
            }
            
            positionAttr.needsUpdate = true
        }
        
        // Update random characters periodically
        const time = state.clock.getElapsedTime()
        if (geometry && Math.floor(time * 2) !== Math.floor((time - delta) * 2)) {
            const charAttr = geometry.getAttribute('aCharIndex')
            const charIndices = charAttr.array
            
            const changeCount = Math.floor(particleCount * 0.05)
            for (let i = 0; i < changeCount; i++) {
                const index = Math.floor(Math.random() * particleCount)
                charIndices[index] = Math.floor(Math.random() * CODE_CHARACTERS.length)
            }
            charAttr.needsUpdate = true
        }
    })
    
    if (!geometry) return null
    
    return (
        <points ref={meshRef} geometry={geometry} material={material}>
            <primitive object={geometry} />
            <primitive object={material} ref={materialRef} />
        </points>
    )
}

// Preload all models
MODELS.forEach(model => {
    useGLTF.preload(model.path)
})

export default function LogoParticleScene({ 
    modelIndex = 0, // 0: HD, 1: Mae, 2: Omni, 3: Walters
    particleCount = 10000,
    position = [0, 0, 0],
    rotation = [0, 0, 0]
}) {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    const adjustedParticleCount = isMobile ? Math.floor(particleCount * 0.5) : particleCount
    
    return (
        <group position={position} rotation={rotation}>
            <Suspense fallback={null}>
                <LogoParticles 
                    modelIndex={modelIndex}
                    particleCount={adjustedParticleCount}
                />
            </Suspense>
        </group>
    )
}