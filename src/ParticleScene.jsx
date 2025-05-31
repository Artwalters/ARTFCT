import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'

export default function ParticleScene({ onSceneStart }) {
    const sphereRef = useRef()
    
    // Start animation when component mounts
    useEffect(() => {
        if (onSceneStart) onSceneStart()
    }, [onSceneStart])
    
    // Simple rotation animation
    useFrame(() => {
        if (sphereRef.current) {
            sphereRef.current.rotation.x += 0.01
            sphereRef.current.rotation.y += 0.01
        }
    })
    
    return (
        <mesh ref={sphereRef} position={[0, 0, 0]}>
            <sphereGeometry args={[2, 32, 32]} />
            <meshBasicMaterial color="#ff6600" />
        </mesh>
    )
}