import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import ScrollMorphScene3D from './ScrollMorphScene3D'
import Header from './Header'

export default function ProjectsPage() {
  return (
    <>
      <Header />
      <Canvas
        shadows
        camera={{
          fov: 60,
          near: 0.2,
          far: 100,
          position: [0, 0, 15]
        }}
        gl={{ alpha: true }}
      >
        <Suspense fallback={null}>
          <ScrollMorphScene3D />
        </Suspense>
      </Canvas>
      {/* Scroll container for particle scene */}
      <div className="scroll-wrapper active" id="scroll-wrapper">
        <div className="scroll-content"></div>
      </div>
    </>
  )
}