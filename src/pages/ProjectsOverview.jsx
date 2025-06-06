import { Canvas } from '@react-three/fiber'
import { Suspense, useState, useMemo, useRef } from 'react'
import ParticleScene from '../components/3d/ParticleScene'
import PhotoSpiral from '../components/3d/PhotoSpiral'
import Header from '../components/layout/Header'
import { projects } from '../data/projects'

export default function ProjectsOverview() {
  const [currentModelIndex, setCurrentModelIndex] = useState(0)
  const [showPhotoSpiral, setShowPhotoSpiral] = useState(false)
  const photoSpiralRef = useRef(null)
  
  // Simple camera setup - no complex config
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  const cameraPosition = [0, 0, isMobile ? 13.04 : 10.40]
  
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
    <>
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
    </>
  )
}