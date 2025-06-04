import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Photo shader based on kokomi.js example
const vertexShader = /* glsl */ `
uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;

varying vec2 vUv;

uniform vec3 uPosition;
uniform float uRotation;
uniform float uScale;

mat2 rotation2d(float angle){
    float s=sin(angle);
    float c=cos(angle);
    
    return mat2(
        c,-s,
        s,c
    );
}

vec2 rotate(vec2 v,float angle){
    return rotation2d(angle)*v;
}

void main(){
    vec3 p=position;
    p.xy=rotate(p.xy,uRotation);
    p.xyz*=uScale;
    p+=uPosition;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    
    vUv=uv;
}
`;

const fragmentShader = /* glsl */ `
uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;

varying vec2 vUv;

uniform sampler2D iChannel0;
uniform float uOpacity;
uniform vec3 uTintColor;
uniform float uDissolveProgress;

// Noise function for dissolve effect
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Create particle-like pattern
float particlePattern(vec2 uv) {
    vec2 gridUV = fract(uv * 10.0); // Create 10x10 grid (larger particles)
    float dist = length(gridUV - 0.5) * 2.0; // Distance from grid cell center
    return 1.0 - smoothstep(0.4, 0.5, dist); // Larger circular particles
}

void main(){
    vec2 uv=vUv;
    
    // Sample original texture
    vec4 tex = texture(iChannel0, uv);
    vec3 col = tex.xyz * uTintColor;
    
    // Keep original kokomi darkness (no brightness boost)
    
    // Start with full image visibility
    float finalAlpha = uOpacity * 0.9;
    
    // Only apply grid effect when actually dissolving  
    if (uDissolveProgress > 0.05) {
        // Grid-based UV for particle effect
        vec2 gridSize = vec2(8.0, 8.0); // 8x8 grid (larger squares)
        vec2 gridUV = fract(uv * gridSize);
        vec2 gridCell = floor(uv * gridSize);
        
        // Create square particle shape with small gap
        float gapSize = 0.05; // Small gap between squares
        float squareMask = 1.0;
        if (gridUV.x < gapSize || gridUV.x > 1.0 - gapSize || 
            gridUV.y < gapSize || gridUV.y > 1.0 - gapSize) {
            squareMask = 0.0;
        }
        
        // Random value per grid cell for dissolve
        float cellRandom = random(gridCell);
        
        // Determine if this square should be removed
        float keepSquare = step(uDissolveProgress, cellRandom);
        
        // Add VS Code particle colors to squares about to dissolve
        if (keepSquare > 0.0 && cellRandom < uDissolveProgress + 0.15) {
            float glowStrength = 1.0 - (cellRandom - uDissolveProgress) / 0.15;
            
            // Pick truly random color based on cell position
            float cellHash = random(gridCell + vec2(123.456, 789.012));
            vec3 particleColor;
            float colorIndex = floor(cellHash * 6.0);
            
            if (colorIndex == 0.0) {
                particleColor = vec3(0.61, 0.86, 0.996); // #9CDCFE lichtblauw
            } else if (colorIndex == 1.0) {
                particleColor = vec3(0.773, 0.525, 0.753); // #C586C0 paars
            } else if (colorIndex == 2.0) {
                particleColor = vec3(0.863, 0.855, 0.667); // #DCDCAA geel
            } else if (colorIndex == 3.0) {
                particleColor = vec3(0.306, 0.788, 0.69); // #4EC9B0 turquoise
            } else if (colorIndex == 4.0) {
                particleColor = vec3(0.808, 0.569, 0.471); // #CE9178 oranje
            } else {
                particleColor = vec3(0.843, 0.733, 0.49); // #D7BA7D licht oranje
            }
            
            col = mix(col, particleColor, glowStrength * 0.6);
            col *= 1.0 + glowStrength * 0.8;
        }
        
        // Apply dissolve: transition from full image to grid squares
        float dissolveTransition = smoothstep(0.0, 0.2, uDissolveProgress);
        finalAlpha *= mix(1.0, squareMask * keepSquare, dissolveTransition);
    }
    
    // Discard fully transparent pixels
    if (finalAlpha < 0.01) discard;
    
    gl_FragColor = vec4(col, finalAlpha);
}
`;

// Simple Photo with actual image loading and fallback
function SimplePhoto({ index, curve, offset, speed = 1, rotationCurve, scaleCurve, opacityCurve, imageUrl }) {
  const meshRef = useRef()
  const progressRef = useRef(offset)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageTexture, setImageTexture] = useState(null)
  
  // Create fallback colored texture (square)
  const fallbackTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 320 // Square fallback
    const ctx = canvas.getContext('2d')
    
    // Create different colors for each photo
    const colors = ['#ff6600', '#ff0066', '#6600ff', '#00ff66', '#ffff00', '#00ffff', '#ff00ff', '#888888']
    const color = colors[index % colors.length]
    
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 320, 320)
    
    // Add loading text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 18px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Loading...', 160, 140)
    ctx.fillText(`Photo ${index + 1}`, 160, 180)
    
    return new THREE.CanvasTexture(canvas)
  }, [index])
  
  // Load actual image with cleanup
  useEffect(() => {
    if (imageUrl) {
      console.log(`Loading image: ${imageUrl}`) // Debug log
      const loader = new THREE.TextureLoader()
      let cancelled = false
      
      loader.load(
        imageUrl,
        (texture) => {
          if (!cancelled) {
            console.log(`Image loaded successfully: ${imageUrl}`) // Debug log
            // Image loaded successfully
            texture.minFilter = THREE.LinearFilter
            texture.magFilter = THREE.LinearFilter
            texture.wrapS = THREE.ClampToEdgeWrapping
            texture.wrapT = THREE.ClampToEdgeWrapping
            texture.flipY = false // Important for proper image display
            setImageTexture(texture)
            setImageLoaded(true)
          }
        },
        (progress) => {
          console.log(`Loading progress for ${imageUrl}:`, progress) // Debug log
        },
        (error) => {
          if (!cancelled) {
            // Image failed to load, keep using fallback
            console.warn(`Failed to load image: ${imageUrl}`, error)
            setImageLoaded(false)
          }
        }
      )
      
      return () => {
        cancelled = true
        // Cleanup previous texture if it exists
        if (imageTexture) {
          imageTexture.dispose()
        }
      }
    }
  }, [imageUrl])
  
  // Use loaded image or fallback
  const texture = imageLoaded && imageTexture ? imageTexture : fallbackTexture
  
  // Shader material with kokomi.js style
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        iChannel0: { value: fallbackTexture }, // Start with fallback texture
        uPosition: { value: new THREE.Vector3(0, 0, 0) },
        uRotation: { value: 0 },
        uScale: { value: 1 },
        uOpacity: { value: 1 },
        uTintColor: { value: new THREE.Color("#a5a5a5") },
        uDissolveProgress: { value: 0 }
      }
    })
  }, [fallbackTexture])
  
  // Update material uniforms when texture changes
  useEffect(() => {
    if (material && material.uniforms) {
      material.uniforms.iChannel0.value = texture
      material.needsUpdate = true
    }
  }, [texture, material])
  
  // Set tint color variation based on index (lighter for more emissive look)
  useEffect(() => {
    if (material && material.uniforms) {
      // Use a lighter tint color for more brightness
      material.uniforms.uTintColor.value = new THREE.Color("#d0d0d0") // Lighter gray
    }
  }, [material, index])
  
  useFrame((state, delta) => {
    if (!meshRef.current || !material.uniforms) return
    
    // Update shader time uniform
    material.uniforms.iTime.value = state.clock.elapsedTime
    
    // Update progress - like the kokomi example
    const normalizedDelta = delta / 0.016
    progressRef.current += 0.0018 * normalizedDelta * speed
    if (progressRef.current > 1) progressRef.current = 0
    
    // Get current progress plus offset for staggered animation
    let i = progressRef.current + offset
    i = i % 1
    
    // Power-based progression for smooth acceleration like the example
    const i2 = Math.pow(i, 1.7)
    
    // Sync position to shader uniform (kokomi style)
    const position = curve.getPointAt(i2)
    material.uniforms.uPosition.value.copy(position)
    
    // Sync rotation to shader uniform
    const rotationPoint = new THREE.Vector2()
    rotationCurve.getPointAt(i, rotationPoint)
    material.uniforms.uRotation.value = rotationPoint.y
    
    // Sync scale to shader uniform
    const scalePoint = new THREE.Vector2()
    scaleCurve.getPointAt(i2, scalePoint)
    material.uniforms.uScale.value = 1 - scalePoint.y
    
    // Sync opacity to shader uniform
    const opacityPoint = new THREE.Vector2()
    opacityCurve.getPointAt(i, opacityPoint)
    material.uniforms.uOpacity.value = opacityPoint.y
    
    // Calculate dissolve progress based on position along curve
    // Start dissolving when approaching the center (last 15% of the curve)
    const dissolveStart = 0.85
    if (i2 > dissolveStart) {
      const dissolveRange = 1.0 - dissolveStart
      const dissolveProgress = (i2 - dissolveStart) / dissolveRange
      material.uniforms.uDissolveProgress.value = Math.max(0, dissolveProgress) // Ensure never negative
    } else {
      material.uniforms.uDissolveProgress.value = 0 // Completely off when not dissolving
    }
  })
  
  // Calculate geometry size (square at 75% of kokomi size)
  const geometrySize = useMemo(() => {
    if (imageLoaded && imageTexture) {
      // Make square based on smaller dimension at 75% of kokomi size
      const originalWidth = imageTexture.image.width * 0.004
      const originalHeight = imageTexture.image.height * 0.004
      const squareSize = Math.min(originalWidth, originalHeight) * 0.75
      return [squareSize, squareSize]
    } else {
      // Square fallback at 75% of kokomi size
      const squareSize = 320 * 0.005 * 0.75
      return [squareSize, squareSize]
    }
  }, [imageLoaded, imageTexture])

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1}>
      <planeGeometry args={geometrySize} />
    </mesh>
  )
}

// Simple Photo Spiral
export default function PhotoSpiralSimple({ images = [], speed = 1 }) {
  const groupRef = useRef()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const targetRotation = useRef({ x: 0, y: 0 })
  const currentRotation = useRef({ x: 0, y: 0 })
  
  // 3D curve inspired by the kokomi example (original)
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
  
  // Mouse movement tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Normalize mouse position to -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      setMousePosition({ x, y })
      
      // Update target rotation (more subtle than particle system)
      targetRotation.current = {
        x: y * 0.1, // Vertical mouse = X rotation (50% less)
        y: x * 0.15  // Horizontal mouse = Y rotation (50% less)
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  // Animate rotation based on mouse (like particle system)
  useFrame(() => {
    if (groupRef.current) {
      // Smooth rotation lerp
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.1
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.1
      
      // Apply rotation to group
      groupRef.current.rotation.x = currentRotation.current.x
      groupRef.current.rotation.y = currentRotation.current.y
      
      // Also add position offset based on mouse (more subtle)
      groupRef.current.position.x = mousePosition.x * 0.25 // 50% less movement
      groupRef.current.position.y = mousePosition.y * 0.15 // 50% less movement
    }
  })
  
  const spiralCount = 5 // 5 streams like the kokomi example
  
  return (
    <group ref={groupRef} position={[0, 0, 5]} renderOrder={-1}>
      {[...Array(spiralCount)].map((_, spiralIndex) => (
        <group 
          key={spiralIndex} 
          rotation={[0, 0, (Math.PI * 2 / spiralCount) * spiralIndex]}
        >
          {photoInstances.map((instance, idx) => {
            // Cycle through available images for each photo
            const imageUrl = images && images.length > 0 
              ? images[instance.index % images.length] 
              : null
            
            return (
              <SimplePhoto
                key={`${spiralIndex}-${idx}`}
                index={instance.index}
                curve={curve}
                offset={instance.offset}
                speed={speed}
                rotationCurve={rotationCurve}
                scaleCurve={scaleCurve}
                opacityCurve={opacityCurve}
                imageUrl={imageUrl}
              />
            )
          })}
        </group>
      ))}
    </group>
  )
}