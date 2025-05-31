import './style.css'
import ReactDOM from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import Experience from './Experience.jsx'

const root = ReactDOM.createRoot(document.querySelector('#root'))

root.render(
    <Canvas
        shadows
        camera={ {
            fov: 55,
            near: 0.2,
            far: 100,
            position: [ 0, 0, 15 ]
        } }
        gl={{ alpha: true }}
    >
        <Experience />
    </Canvas>
)