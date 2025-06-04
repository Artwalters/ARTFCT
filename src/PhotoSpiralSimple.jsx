import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Simple Photo with fallback texture
function SimplePhoto({ index, curve, offset, speed = 1, rotationCurve, scaleCurve, opacityCurve }) {
  const meshRef = useRef()
  const progressRef = useRef(offset)
  
  // Create a simple colored texture as fallback - kokomi uses 320x400
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 320  // kokomi example dimensions
    canvas.height = 400
    const ctx = canvas.getContext('2d')
    
    // Create different colors for each photo
    const colors = ['#ff6600', '#ff0066', '#6600ff', '#00ff66', '#ffff00', '#00ffff', '#ff00ff', '#888888']
    const color = colors[index % colors.length]
    
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 320, 400)
    
    // Add text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`Photo ${index + 1}`, 160, 200)
    
    return new THREE.CanvasTexture(canvas)
  }, [index])
  
  // Simple material
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false
    })
  }, [texture])
  
  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    // Update progress - like the kokomi example
    const normalizedDelta = delta / 0.016
    progressRef.current += 0.0018 * normalizedDelta * speed
    if (progressRef.current > 1) progressRef.current = 0
    
    // Get current progress plus offset for staggered animation
    let i = progressRef.current + offset
    i = i % 1
    
    // Power-based progression for smooth acceleration like the example
    const i2 = Math.pow(i, 1.7)
    
    // Get position from curve using power progression
    const position = curve.getPointAt(i2)
    meshRef.current.position.copy(position)
    
    // Get rotation from rotation curve
    const rotationPoint = new THREE.Vector2()
    rotationCurve.getPointAt(i, rotationPoint)
    meshRef.current.rotation.z = rotationPoint.y
    
    // Get scale from scale curve - exactly like kokomi example
    const scalePoint = new THREE.Vector2()
    scaleCurve.getPointAt(i2, scalePoint)
    const scale = 1 - scalePoint.y // Exact kokomi logic: 1 - scale.y
    meshRef.current.scale.setScalar(scale)
    
    // Get opacity from opacity curve
    const opacityPoint = new THREE.Vector2()
    opacityCurve.getPointAt(i, opacityPoint)
    material.opacity = opacityPoint.y
  })
  
  return (
    <mesh ref={meshRef} material={material} renderOrder={-1}>
      <planeGeometry args={[texture.image.width * 0.005, texture.image.height * 0.005]} />
    </mesh>
  )
}

// Simple Photo Spiral
export default function PhotoSpiralSimple({ images = [], speed = 1 }) {
  const groupRef = useRef()
  
  // 3D curve inspired by the kokomi example
  const curve = useMemo(() => {
    const curvePoints = [
      new THREE.Vector3(-7, -1, -8),
      new THREE.Vector3(-6.8, -0.2, -7),
      new THREE.Vector3(-6.4, 0.3, -6),
      new THREE.Vector3(-5.9, 0.7, -5),
      new THREE.Vector3(-5.4, 1, -4),
      new THREE.Vector3(-4.8, 1.2, -3),
      new THREE.Vector3(-3.9, 1.3, -1.8),
      new THREE.Vector3(-2.8, 1, -1),
      new THREE.Vector3(-1.5, 0.6, 0),
      new THREE.Vector3(-1, 0.4, 0)
    ]
    
    const smoothCurve = new THREE.CatmullRomCurve3(curvePoints)
    smoothCurve.curveType = 'catmullrom'
    smoothCurve.tension = 0.5
    
    return smoothCurve
  }, [])

  // Rotation curve - from -5 degrees to 45 degrees
  const rotationCurve = useMemo(() => {
    return new THREE.SplineCurve([
      new THREE.Vector2(0, THREE.MathUtils.degToRad(-5)),
      new THREE.Vector2(1, THREE.MathUtils.degToRad(45))
    ])
  }, [])

  // Scale curve - ease in circular
  const scaleCurve = useMemo(() => {
    return new THREE.CubicBezierCurve(
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.55, 0),
      new THREE.Vector2(1, 0.45),
      new THREE.Vector2(1, 1)
    )
  }, [])

  // Opacity curve - ease out circular
  const opacityCurve = useMemo(() => {
    return new THREE.CubicBezierCurve(
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0, 0.55),
      new THREE.Vector2(0.45, 1),
      new THREE.Vector2(1, 1)
    )
  }, [])
  
  // Create instances - like the kokomi example with 5 spirals and 10 photos per spiral
  const photoInstances = useMemo(() => {
    const spiralImageCount = 10 // 10 photos per spiral like the example
    const instances = []
    
    for (let i = 0; i < spiralImageCount; i++) {
      instances.push({
        index: i,
        offset: i / spiralImageCount
      })
    }
    
    return instances
  }, [])
  
  // Static - no rotation
  // useFrame((state) => {
  //   if (groupRef.current) {
  //     groupRef.current.rotation.y = state.clock.elapsedTime * 0.1
  //   }
  // })
  
  const spiralCount = 5 // 5 streams like the kokomi example
  
  return (
    <group ref={groupRef} position={[0, 0, 5]} renderOrder={-1}>
      {[...Array(spiralCount)].map((_, spiralIndex) => (
        <group 
          key={spiralIndex} 
          rotation={[0, 0, (Math.PI * 2 / spiralCount) * spiralIndex]}
        >
          {photoInstances.map((instance, idx) => (
            <SimplePhoto
              key={`${spiralIndex}-${idx}`}
              index={instance.index}
              curve={curve}
              offset={instance.offset}
              speed={speed}
              rotationCurve={rotationCurve}
              scaleCurve={scaleCurve}
              opacityCurve={opacityCurve}
            />
          ))}
        </group>
      ))}
    </group>
  )
}