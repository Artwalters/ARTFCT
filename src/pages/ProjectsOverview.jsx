import { Canvas } from '@react-three/fiber'
import { Suspense, useState, useMemo, useRef, useEffect } from 'react'
import ParticleScene from '../components/3d/ParticleScene'
import PhotoSpiral from '../components/3d/PhotoSpiral'
import Header from '../components/layout/Header'
import { projects } from '../data/projects'

export default function ProjectsOverview() {
  const [currentModelIndex, setCurrentModelIndex] = useState(0)
  const [showPhotoSpiral, setShowPhotoSpiral] = useState(false)
  const photoSpiralRef = useRef(null)
  
  useEffect(() => {
    // Apply overflow hidden for this page only
    document.body.style.overflow = 'hidden'
    
    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = ''
    }
  }, [])
  
  // Simple camera setup - no complex config
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  const cameraPosition = [0, isMobile ? -0.5 : 0, isMobile ? 15.06 : 12.01] // 15% further away (13.69 * 1.1 = 15.06, 10.92 * 1.1 = 12.01)
  
  // Photo images based on current model
  const photoImages = useMemo(() => {
    const currentProject = Object.values(projects)[currentModelIndex]
    return currentProject?.images || []
  }, [currentModelIndex])
  
  // Show spiral after particles load
  const handleParticlesReady = () => {
    setTimeout(() => setShowPhotoSpiral(true), 1000)
  }
  
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
          {/* Particle Scene */}
          <ParticleScene 
            onModelChange={setCurrentModelIndex}
            onReady={handleParticlesReady}
            photoSpiralRef={photoSpiralRef}
          />
          
          {/* Photo Spiral - separate component */}
          {showPhotoSpiral && (
            <PhotoSpiral 
              ref={photoSpiralRef}
              images={photoImages}
              speed={1}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}