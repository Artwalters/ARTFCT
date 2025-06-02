import { Perf } from 'r3f-perf'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import LogoAndTerminal from './LogoAndTerminal'
import ScrollMorphScene from './ScrollMorphScene'

export default function Experience()
{
    const { camera, scene } = useThree()
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [cameraZoom, setCameraZoom] = useState(0)
    const [currentScene, setCurrentScene] = useState('terminal') // 'terminal' or 'particles'
    const [sceneTransition, setSceneTransition] = useState(0) // 0 to 1 for fade transition
    const targetPosition = useRef({ x: 0, y: 0, z: 15 })
    const currentPosition = useRef({ x: 0, y: 0, z: 15 })
    
    // Detect mobile
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    
    // Track mouse position
    useEffect(() => {
        const handleMouseMove = (e) => {
            // Convert mouse position to normalized coordinates (-1 to 1)
            const x = (e.clientX / window.innerWidth) * 2 - 1
            const y = -(e.clientY / window.innerHeight) * 2 + 1
            setMousePosition({ x, y })
        }
        
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])
    
    // Handle terminal animation completion
    const handleTerminalComplete = () => {
        setTimeout(() => {
            setCurrentScene('particles')
            // Reset camera for new scene
            setCameraZoom(0)
        }, 1000) // Wait 1 second before transitioning
    }
    
    // Handle particle scene start
    const handleParticleSceneStart = () => {
        // Set black background
        scene.background = new THREE.Color(0x000000)
        
        // Reset camera position refs to let ScrollMorphScene take control
        const baseZ = isMobile ? 12 : 10
        currentPosition.current = { x: 0, y: 0, z: baseZ }
        targetPosition.current = { x: 0, y: 0, z: baseZ }
    }
    
    // Smooth camera animation
    useFrame(() => {
        if (currentScene === 'terminal') {
            // Terminal scene camera behavior
            const influence = 0.8 // How much the mouse affects camera movement
            const smoothing = 0.03 // How smooth the animation is (lower = smoother)
            const rotationInfluence = 0.01 // Camera rotation based on mouse
            
            // Calculate target position with moderate offset
            targetPosition.current.x = mousePosition.x * influence
            targetPosition.current.y = mousePosition.y * influence * 0.6 // Moderate vertical movement
            targetPosition.current.z = 15 + (mousePosition.x * 0.2) - cameraZoom // Apply zoom effect
            
            // Smooth interpolation to target position
            currentPosition.current.x += (targetPosition.current.x - currentPosition.current.x) * smoothing
            currentPosition.current.y += (targetPosition.current.y - currentPosition.current.y) * smoothing
            currentPosition.current.z += (targetPosition.current.z - currentPosition.current.z) * smoothing
            
            // Apply to camera with slight rotation
            camera.position.set(
                currentPosition.current.x,
                currentPosition.current.y,
                currentPosition.current.z
            )
            
            // Add subtle rotation based on mouse position
            camera.rotation.z = mousePosition.x * rotationInfluence
            camera.rotation.x = mousePosition.y * rotationInfluence * 0.5
            
            camera.lookAt(0, 0, 0)
        } else if (currentScene === 'particles') {
            // Let ScrollMorphScene handle camera for particles
            // Only apply subtle rotation based on mouse
            const rotationInfluence = 0.02
            
            camera.rotation.z = mousePosition.x * rotationInfluence
            camera.rotation.x = mousePosition.y * rotationInfluence * 0.7
            
            camera.lookAt(0, 0, 0)
        }
    })

    return <>

        <Perf position="top-left" />

        {currentScene === 'terminal' && (
            <>
                <ambientLight intensity={0.5} />
                <LogoAndTerminal 
                    onCameraZoomChange={setCameraZoom} 
                    onAnimationComplete={handleTerminalComplete}
                />
            </>
        )}

        {currentScene === 'particles' && (
            <>
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={0.5} color="#ff6600" />
                <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ff8800" />
                <ScrollMorphScene onSceneStart={handleParticleSceneStart} />
            </>
        )}

    </>
}