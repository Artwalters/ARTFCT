import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import ParticleScene from '../components/3d/ParticleScene'
import Header from '../components/layout/Header'

export default function ProjectsOverview() {
  return (
    <>
      <Header />
      <Canvas
        shadows
        camera={{
          fov: 65,
          near: 0.25,
          far: 100,
          position: [0, 0, /Android|iPhone|iPad/i.test(navigator.userAgent) ? 12.6 : 10.5]
        }}
        gl={{ alpha: true }}
      >
        <Suspense fallback={null}>
          <ParticleScene />
        </Suspense>
      </Canvas>
      {/* Scroll container for particle scene */}
      <div className="scroll-wrapper active" id="scroll-wrapper">
        <div className="scroll-content"></div>
      </div>
    </>
  )
}