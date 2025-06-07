import { useRef, useEffect, useMemo, useCallback, useState, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import gsap from 'gsap'
import { MODELS_3D as MODELS, projects } from '../../data/projects'
import { CODE_CHARACTERS } from '../../constants/particles'
import { createCharacterAtlas } from '../../utils/characterAtlas'
import { sampleMultipleGeometriesToPoints, sampleGeometryToPoints } from '../../utils/geometryHelpers'
import { isMobile } from '../../utils/deviceDetection'
import { particleVertexShader, particleFragmentShader } from '../../utils/shaders'




function ScrollMorph3DParticles({ particleCount = 25000, onModelChange, photoSpiralRef }) {
    const meshRef = useRef()
    const materialRef = useRef()
    const { camera } = useThree()
    const [modelsLoaded, setModelsLoaded] = useState(false)
    
    // Creëer character atlas een keer bij component mount
    const characterAtlas = useMemo(() => createCharacterAtlas(), [])
    
    const currentModelRef = useRef(0)
    const isTransitioningRef = useRef(false)
    
    // Long hold states
    const isHoldingRef = useRef(false)
    const holdTimeoutRef = useRef(null)
    const circleMorphTweenRef = useRef(null)
    const menuActiveRef = useRef(false)
    const selectedModelRef = useRef(0)
    const isDraggingRef = useRef(false)
    
    // Mouse movement tracking
    const mouseRef = useRef({ x: 0, y: 0 })
    const targetRotationRef = useRef({ x: 0, y: 0 })
    const currentRotationRef = useRef({ x: 0, y: 0 })
    const dragStartPos = useRef({ x: 0, y: 0 })
    
    // Load all models
    const hd = useGLTF(MODELS[0].path)
    const mae = useGLTF(MODELS[1].path)  
    const omni = useGLTF(MODELS[2].path)
    const walters = useGLTF(MODELS[3].path)
    
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
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        const targetSize = isMobile ? 0.14 : 0.16 // Slightly smaller on mobile
        
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
        
        const hdScale = (targetSize / hdSize) * MODELS[0].scale * 0.5 // HD is half size
        const maeScale = (targetSize / maeSize) * MODELS[1].scale * 0.8 // HD is half size
        const omniScale = (targetSize / omniSize) * MODELS[2].scale * 0.8 // HD is half size
        const waltersScale = (targetSize / waltersSize) * MODELS[3].scale * 0.8 // HD is half size
        
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
        
        // Character indices - random karakter voor elke particle
        const charIndices = new Float32Array(particleCount)
        for (let i = 0; i < particleCount; i++) {
            charIndices[i] = Math.floor(Math.random() * CODE_CHARACTERS.length)
        }
        geo.setAttribute('aCharIndex', new THREE.BufferAttribute(charIndices, 1))
        
        // Colors - wit/neutraal zodat texture kleuren goed zichtbaar zijn
        const colors = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3
            // Licht grijze tint voor alle particles
            colors[idx] = 0.9     // R
            colors[idx + 1] = 0.9 // G
            colors[idx + 2] = 0.9 // B
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
                uGlowColor: { value: new THREE.Color(MODELS[0].color) },
                uCharAtlas: { value: characterAtlas.texture },
                uAtlasColumns: { value: characterAtlas.cols },
                uAtlasRows: { value: characterAtlas.rows },
                uCircleMorphProgress: { value: 0 }
            },
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        })
    }, [characterAtlas])
    
    const updateColors = useCallback((modelIndex) => {
        if (!geometry) return
        
        // Update alleen de glow color, behoud de groene Matrix kleuren
        const newColor = new THREE.Color(MODELS[modelIndex].color)
        gsap.to(materialRef.current.uniforms.uGlowColor.value, {
            r: newColor.r,
            g: newColor.g,
            b: newColor.b,
            duration: 0.5
        })
    }, [geometry])
    
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
        
        // Update View Project button
        const projectButton = document.getElementById('view-project-button')
        if (projectButton) {
            projectButton.setAttribute('data-url', MODELS[nextCurrent].projectUrl)
        }
        
        // Notify parent component about model change
        if (onModelChange) {
            onModelChange(nextCurrent)
        }
    }, [updateColors])
    
    
    // New wheel-based navigation system (with mobile touch support)
    useEffect(() => {
        if (!modelsLoaded) return
        
        let isTransitioning = false
        let lastWheelTime = 0
        const wheelCooldown = 1000 // 1 second cooldown between transitions
        
        // Touch handling for mobile
        let touchStartY = 0
        let touchStartTime = 0
        
        // Common navigation logic
        const navigateToModel = (direction) => {
            const currentTime = Date.now()
            if (isTransitioning || currentTime - lastWheelTime < wheelCooldown) {
                return
            }
            
            lastWheelTime = currentTime
            isTransitioning = true
            
            // Trigger PhotoSpiral speed burst
            if (photoSpiralRef?.current?.triggerSpeedBurst) {
                photoSpiralRef.current.triggerSpeedBurst()
            }
            
            // Start vacuum/suction effect like long hold
            if (materialRef.current) {
                if (circleMorphTweenRef.current) {
                    circleMorphTweenRef.current.kill()
                }
                
                circleMorphTweenRef.current = gsap.to(materialRef.current.uniforms.uCircleMorphProgress, {
                    value: 1,
                    duration: 1.6,
                    ease: "power2.inOut",
                    onComplete: () => {
                        // Determine target model based on direction
                        let targetModel
                        if (direction > 0) {
                            // Next model
                            targetModel = (currentModelRef.current + 1) % MODELS.length
                        } else {
                            // Previous model
                            targetModel = (currentModelRef.current - 1 + MODELS.length) % MODELS.length
                        }
                        
                        // Update to target model
                        const oldModel = currentModelRef.current
                        currentModelRef.current = targetModel
                        
                        // Update material uniforms
                        if (materialRef.current) {
                            materialRef.current.uniforms.uCurrentModel.value = targetModel
                            materialRef.current.uniforms.uTargetModel.value = (targetModel + 1) % MODELS.length
                            materialRef.current.uniforms.uMorphProgress.value = 0
                        }
                        
                        // Update colors
                        updateColors(targetModel)
                        
                        // Update UI
                        const projectButton = document.getElementById('view-project-button')
                        if (projectButton) {
                            projectButton.setAttribute('data-url', MODELS[targetModel].projectUrl)
                        }
                        
                        // Notify parent about model change
                        if (onModelChange) {
                            onModelChange(targetModel)
                        }
                        
                        // Reset PhotoSpiral IMMEDIATELY when particle return starts
                        if (photoSpiralRef?.current?.resetSpiral) {
                            photoSpiralRef.current.resetSpiral()
                        }
                        
                        // Return particles to model shape
                        gsap.to(materialRef.current.uniforms.uCircleMorphProgress, {
                            value: 0,
                            duration: 1.8,
                            ease: "power2.inOut",
                            onComplete: () => {
                                isTransitioning = false
                            }
                        })
                    }
                })
            }
        }
        
        // Wheel handler for desktop
        const handleWheel = (e) => {
            e.preventDefault()
            const direction = e.deltaY > 0 ? 1 : -1
            navigateToModel(direction)
        }
        
        // Touch handlers for mobile
        const handleTouchStart = (e) => {
            touchStartY = e.touches[0].clientY
            touchStartTime = Date.now()
        }
        
        const handleTouchEnd = (e) => {
            const touchEndY = e.changedTouches[0].clientY
            const touchEndTime = Date.now()
            const deltaY = touchStartY - touchEndY
            const deltaTime = touchEndTime - touchStartTime
            
            // Minimum swipe distance and maximum time for swipe detection
            const minSwipeDistance = 50
            const maxSwipeTime = 500
            
            if (Math.abs(deltaY) > minSwipeDistance && deltaTime < maxSwipeTime) {
                e.preventDefault()
                const direction = deltaY > 0 ? 1 : -1 // Swipe up = next, swipe down = previous
                navigateToModel(direction)
            }
        }
        
        // Add event listeners
        window.addEventListener('wheel', handleWheel, { passive: false })
        window.addEventListener('touchstart', handleTouchStart, { passive: true })
        window.addEventListener('touchend', handleTouchEnd, { passive: false })
        
        return () => {
            window.removeEventListener('wheel', handleWheel)
            window.removeEventListener('touchstart', handleTouchStart)
            window.removeEventListener('touchend', handleTouchEnd)
        }
    }, [modelsLoaded, updateColors, onModelChange])
    
    // Show menu function
    const showMenu = useCallback(() => {
        const menu = document.getElementById('model-menu')
        if (!menu) return
        
        menuActiveRef.current = true
        menu.classList.add('active')
        
        // Update selected model indicator
        const options = menu.querySelectorAll('.model-option')
        options.forEach((option, index) => {
            option.classList.toggle('selected', index === currentModelRef.current)
        })
        
        // GSAP animation to show menu
        gsap.to(menu, {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: "back.out(1.7)"
        })
        
        // Start vacuum/suction effect - particles get sucked backwards (faster out)
        if (materialRef.current) {
            if (circleMorphTweenRef.current) {
                circleMorphTweenRef.current.kill()
            }
            
            circleMorphTweenRef.current = gsap.to(materialRef.current.uniforms.uCircleMorphProgress, {
                value: 1,
                duration: 1.6, // Iets sneller weggaan: 2.4 -> 1.6 seconds 
                ease: "power2.inOut"
            })
        }
    }, [])
    
    // Hide menu function
    const hideMenu = useCallback(() => {
        const menu = document.getElementById('model-menu')
        if (!menu) return
        
        menuActiveRef.current = false
        
        // GSAP animation to hide menu
        gsap.to(menu, {
            opacity: 0,
            scale: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => {
                menu.classList.remove('active')
            }
        })
        
        // Stop suction effect - particles return to model shape (slow return)
        if (materialRef.current) {
            if (circleMorphTweenRef.current) {
                circleMorphTweenRef.current.kill()
            }
            
            circleMorphTweenRef.current = gsap.to(materialRef.current.uniforms.uCircleMorphProgress, {
                value: 0,
                duration: 1.8, // 3x slower: 0.6 * 3 = 1.8 seconds
                ease: "power2.inOut"
            })
        }
    }, [])
    
    // Long hold event handlers
    const handlePointerDown = useCallback((e) => {
        if (!materialRef.current) return
        
        isHoldingRef.current = true
        dragStartPos.current = { x: e.clientX || e.touches?.[0]?.clientX || 0, y: e.clientY || e.touches?.[0]?.clientY || 0 }
        
        // Start timer for 1 second
        holdTimeoutRef.current = setTimeout(() => {
            if (isHoldingRef.current && !isDraggingRef.current) {
                console.log('Long hold detected - showing menu')
                showMenu()
            }
        }, 1000) // 1 second hold
    }, [showMenu])
    
    const handlePointerMove = useCallback((e) => {
        if (!isHoldingRef.current) return
        
        const currentPos = { 
            x: e.clientX || e.touches?.[0]?.clientX || 0, 
            y: e.clientY || e.touches?.[0]?.clientY || 0 
        }
        
        const distance = Math.sqrt(
            Math.pow(currentPos.x - dragStartPos.current.x, 2) + 
            Math.pow(currentPos.y - dragStartPos.current.y, 2)
        )
        
        // If moved more than 10px, consider it a drag
        if (distance > 10) {
            isDraggingRef.current = true
            
            // Clear hold timeout
            if (holdTimeoutRef.current) {
                clearTimeout(holdTimeoutRef.current)
                holdTimeoutRef.current = null
            }
        }
        
        // Handle drag over menu options
        if (menuActiveRef.current) {
            const menu = document.getElementById('model-menu')
            const options = menu?.querySelectorAll('.model-option')
            
            options?.forEach(option => {
                const rect = option.getBoundingClientRect()
                const isOver = currentPos.x >= rect.left && 
                               currentPos.x <= rect.right && 
                               currentPos.y >= rect.top && 
                               currentPos.y <= rect.bottom
                
                option.classList.toggle('drag-over', isOver)
            })
        }
    }, [])
    
    const handlePointerUp = useCallback(() => {
        if (!materialRef.current) return
        
        isHoldingRef.current = false
        isDraggingRef.current = false
        
        // Clear timeout if still waiting
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current)
            holdTimeoutRef.current = null
        }
        
        // If menu is active, handle selection and hide menu
        if (menuActiveRef.current) {
            // Check if mouse is over a model option
            const menu = document.getElementById('model-menu')
            const options = menu?.querySelectorAll('.model-option')
            let selectedIndex = -1
            
            options?.forEach((option, index) => {
                if (option.classList.contains('drag-over')) {
                    selectedIndex = parseInt(option.dataset.model)
                    option.classList.remove('drag-over')
                }
            })
            
            // If a model was selected, switch to it
            if (selectedIndex >= 0 && selectedIndex !== currentModelRef.current) {
                console.log('Switching to model:', selectedIndex, MODELS[selectedIndex].name)
                
                // Update current model
                const oldModel = currentModelRef.current
                currentModelRef.current = selectedIndex
                
                // Update material uniforms
                if (materialRef.current) {
                    materialRef.current.uniforms.uCurrentModel.value = selectedIndex
                    materialRef.current.uniforms.uTargetModel.value = (selectedIndex + 1) % MODELS.length
                    materialRef.current.uniforms.uMorphProgress.value = 0
                }
                
                // Update colors
                updateColors(selectedIndex)
                
                // Update View Project button
                const projectButton = document.getElementById('view-project-button')
                if (projectButton) {
                    projectButton.setAttribute('data-url', MODELS[selectedIndex].projectUrl)
                }
                
                // Notify parent component about model change
                if (onModelChange) {
                    onModelChange(selectedIndex)
                }
            }
            
            hideMenu()
        }
    }, [hideMenu])
    
    // Mouse movement tracking (desktop only)
    useEffect(() => {
        // Skip mouse tracking on mobile
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        if (isMobile) return
        
        const handleMouseMove = (e) => {
            // Normalize mouse position to -1 to 1
            mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
            mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
            
            // Update target rotation with GSAP for smooth animation
            gsap.to(targetRotationRef.current, {
                x: mouseRef.current.y * 0.2, // Vertical mouse = X rotation
                y: mouseRef.current.x * 0.3, // Horizontal mouse = Y rotation
                duration: 0.5,
                ease: "power2.out"
            })
        }
        
        window.addEventListener('mousemove', handleMouseMove)
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
        }
    }, [])
    
    // Add event listeners (optimized for mobile/desktop)
    useEffect(() => {
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        
        if (isMobile) {
            // Mobile: only touch events
            window.addEventListener('touchstart', handlePointerDown)
            window.addEventListener('touchend', handlePointerUp)
            window.addEventListener('touchcancel', handlePointerUp)
            window.addEventListener('touchmove', handlePointerMove)
        } else {
            // Desktop: only mouse events
            window.addEventListener('mousedown', handlePointerDown)
            window.addEventListener('mouseup', handlePointerUp)
            window.addEventListener('mouseleave', handlePointerUp)
            window.addEventListener('mousemove', handlePointerMove)
        }
        
        return () => {
            if (isMobile) {
                window.removeEventListener('touchstart', handlePointerDown)
                window.removeEventListener('touchend', handlePointerUp)
                window.removeEventListener('touchcancel', handlePointerUp)
                window.removeEventListener('touchmove', handlePointerMove)
            } else {
                window.removeEventListener('mousedown', handlePointerDown)
                window.removeEventListener('mouseup', handlePointerUp)
                window.removeEventListener('mouseleave', handlePointerUp)
                window.removeEventListener('mousemove', handlePointerMove)
            }
            
            // Clean up timeouts and tweens
            if (holdTimeoutRef.current) {
                clearTimeout(holdTimeoutRef.current)
            }
            if (circleMorphTweenRef.current) {
                circleMorphTweenRef.current.kill()
            }
        }
    }, [handlePointerDown, handlePointerUp, handlePointerMove])
    
    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value += delta
        }
        
        // Only do mouse-based animations on desktop
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        if (!isMobile) {
            // Smooth rotation lerp
            currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.1
            currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.1
            
            // Apply rotation to mesh
            if (meshRef.current) {
                meshRef.current.rotation.x = currentRotationRef.current.x
                meshRef.current.rotation.y = currentRotationRef.current.y
                
                // Also add some position offset based on mouse
                meshRef.current.position.x = mouseRef.current.x * 0.5
                meshRef.current.position.y = mouseRef.current.y * 0.3
            }
        }
        
        // Update random karakters elke 0.5 seconde voor dynamisch effect
        const time = state.clock.getElapsedTime()
        if (geometry && Math.floor(time * 2) !== Math.floor((time - delta) * 2)) {
            const charAttr = geometry.getAttribute('aCharIndex')
            const charIndices = charAttr.array
            
            // Verander 5% van de karakters
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

function ScrollMorph3DUI() {
    const navigate = useNavigate()
    
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
            
            
            .wheel-indicator {
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
            
            .hold-indicator {
                position: absolute;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                color: rgba(255, 255, 255, 0.9);
                font-size: 16px;
                font-weight: 600;
                background: rgba(100, 100, 255, 0.3);
                padding: 10px 20px;
                border-radius: 20px;
                border: 2px solid rgba(100, 100, 255, 0.6);
            }
            
            .model-menu {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0);
                z-index: 1000;
                opacity: 0;
                pointer-events: none;
                transition: none;
            }
            
            .model-menu.active {
                pointer-events: auto;
            }
            
            .model-menu-container {
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 20px;
                backdrop-filter: blur(15px);
                min-width: 200px;
            }
            
            .model-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .model-option {
                background: transparent;
                border: none;
                border-radius: 8px;
                padding: 12px 16px;
                color: rgba(255, 255, 255, 0.7);
                font-family: 'Courier New', monospace;
                font-size: 14px;
                font-weight: 500;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
                border: 1px solid transparent;
            }
            
            .model-option:hover {
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.9);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateX(4px);
            }
            
            .model-option.selected {
                background: rgba(255, 255, 255, 0.15);
                color: rgba(255, 255, 255, 1);
                border-color: rgba(255, 255, 255, 0.4);
                font-weight: 600;
            }
            
            .model-option.drag-over {
                background: rgba(100, 255, 100, 0.2);
                color: rgba(255, 255, 255, 1);
                border-color: rgba(100, 255, 100, 0.6);
                transform: translateX(8px);
            }
            
            @keyframes float {
                0%, 100% { transform: translateX(-50%) translateY(0px); }
                50% { transform: translateX(-50%) translateY(-10px); }
            }
            
            .view-project-button {
                position: absolute;
                bottom: 140px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: rgba(255, 255, 255, 0.9);
                padding: 12px 30px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                font-family: 'Courier New', monospace;
                cursor: pointer;
                transition: all 0.3s ease;
                pointer-events: auto;
                backdrop-filter: blur(10px);
                text-decoration: none;
                display: inline-block;
            }
            
            .view-project-button:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.6);
                transform: translateX(-50%) scale(1.05);
                box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
            }
        `
        document.head.appendChild(style)
        
        const ui = document.createElement('div')
        ui.className = 'scroll-morph-ui'
        ui.innerHTML = `
            <button class="view-project-button" id="view-project-button" data-url="${MODELS[0].projectUrl}">
                View Project
            </button>
        `
        
        document.body.appendChild(ui)
        
        // Add model selection menu
        const menu = document.createElement('div')
        menu.className = 'model-menu'
        menu.id = 'model-menu'
        menu.innerHTML = `
            <div class="model-menu-container">
                <div class="model-list">
                    <div class="model-option" data-model="2">Omni</div>
                    <div class="model-option" data-model="0">Heerlen</div>
                    <div class="model-option" data-model="3">Walters</div>
                    <div class="model-option" data-model="1">Move Adapt Evolve</div>
                </div>
            </div>
        `
        
        document.body.appendChild(menu)
        
        // Add click handler for View Project button
        const viewProjectButton = document.getElementById('view-project-button')
        if (viewProjectButton) {
            viewProjectButton.addEventListener('click', () => {
                const url = viewProjectButton.getAttribute('data-url')
                if (url) {
                    navigate(url)
                }
            })
        }
        
        return () => {
            document.head.removeChild(style)
            if (document.body.contains(ui)) {
                document.body.removeChild(ui)
            }
            if (document.body.contains(menu)) {
                document.body.removeChild(menu)
            }
            window.removeEventListener('resize', setVH)
            window.removeEventListener('orientationchange', setVH)
        }
    }, [navigate])
    
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

export default function ParticleScene({ onModelChange, onReady, photoSpiralRef }) {
    const particleCount = useMemo(() => {
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        return isMobile ? 2000 : 5000 // Reduced mobile particles for better performance
    }, [])
    
    useEffect(() => {
        console.log(`ParticleScene initialized with ${particleCount} particles`)
        
        // Notify parent when ready
        if (onReady) onReady()
    }, [onReady, particleCount])
    
    return (
        <>
            <Suspense fallback={<LoadingFallback />}>
                <ScrollMorph3DParticles 
                    particleCount={particleCount} 
                    onModelChange={onModelChange}
                    photoSpiralRef={photoSpiralRef}
                />
            </Suspense>
            <ScrollMorph3DUI />
        </>
    )
}