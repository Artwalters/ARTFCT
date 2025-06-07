import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import LogoParticleScene from '../components/3d/LogoParticleScene'
import Header from '../components/layout/Header'

export default function LogoParticles() {
  // Camera setup - closer than ProjectsOverview
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  const cameraPosition = [0, isMobile ? -0.5 : 0, isMobile ? 8 : 6]
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      background: '#000'
    }}>
      <Header />
      <Canvas
        shadows
        camera={{
          fov: 50,
          near: 0.25,
          far: 100,
          position: cameraPosition
        }}
        gl={{ alpha: true }}
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <Suspense fallback={null}>
          <LogoParticleScene 
            modelIndex={1} // 0: HD, 1: Mae, 2: Omni, 3: Walters
            particleCount={20000}
            position={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}