import { Canvas } from '@react-three/fiber'
import Experience from './Experience'
import Header from './Header'

export default function HomePage() {
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
        <Experience />
      </Canvas>
      {/* Scroll container for particle scene */}
      <div className="scroll-wrapper" id="scroll-wrapper">
        <div className="scroll-content"></div>
      </div>
    </>
  )
}