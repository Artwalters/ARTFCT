import { useRef } from 'react'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

export default function ASCIILogo() {
    const groupRef = useRef()
    
    // ASCII representation of CLAUDE CODE logo
    const claudeLines = [
         '██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗',
        '██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝',
        '██║     ██║     ███████║██║   ██║██║  ██║█████╗  ',
        '██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  ',
        '╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗',
        ' ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝'
    ]
    
    const codeLines = [
         '██████╗ ██████╗ ██████╗ ███████╗',
        '██╔════╝██╔═══██╗██╔══██╗██╔════╝',
        '██║     ██║   ██║██║  ██║█████╗  ',
        '██║     ██║   ██║██║  ██║██╔══╝  ',
        '╚█████╗╚██████╔╝██████╔╝███████╗',
        ' ╚═════╝ ╚═════╝ ╚═════╝  ╚══════╝'
    ]
    
    useFrame((state) => {
        if (groupRef.current) {
            // Subtle floating animation
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1
        }
    })
    
    return (
        <group ref={groupRef}>
            {/* CLAUDE text */}
            {claudeLines.map((line, index) => (
                <Text
                    key={`claude-${index}`}
                    position={[0, 2 - index * 0.5, 0]}
                    fontSize={0.5}
                    color="#ff8866"
                    font="/fonts/monospace.ttf"
                    anchorX="center"
                    anchorY="middle"
                    characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/╔╗╚╝═║█"
                >
                    {line}
                </Text>
            ))}
            
            {/* CODE text */}
            {codeLines.map((line, index) => (
                <Text
                    key={`code-${index}`}
                    position={[0, -2 - index * 0.5, 0]}
                    fontSize={0.5}
                    color="#ff8866"
                    font="/fonts/monospace.ttf"
                    anchorX="center"
                    anchorY="middle"
                    characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/╔╗╚╝═║█"
                >
                    {line}
                </Text>
            ))}
            
            {/* Glow effect behind text */}
            <mesh position={[0, -0.5, -0.5]}>
                <planeGeometry args={[12, 8]} />
                <meshBasicMaterial 
                    color="#ff8866" 
                    transparent 
                    opacity={0.1} 
                />
            </mesh>
        </group>
    )
}