import { Canvas } from '@react-three/fiber'
import LogoAndTerminal from './LogoAndTerminal'
import Header from './Header'

export default function LandingPage() {
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
        <LogoAndTerminal />
      </Canvas>
    </>
  )
}