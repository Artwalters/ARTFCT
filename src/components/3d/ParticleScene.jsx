import { useRef, useEffect, useMemo, useCallback, useState, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PhotoSpiral from './PhotoSpiral'
import { MODELS_3D as MODELS, projects } from '../../data/projects'

gsap.registerPlugin(ScrollTrigger)

// Karakters die we gaan gebruiken voor de particles
const CODE_CHARACTERS = [
    '[', ']', '{', '}', '(', ')', '<', '>', '/', '\\', 
    ':', ';', ',', '.', '*', '!', '?', '@', '#', '$',
    '%', '^', '&', '=', '+', '-', '_', '|', '~', '"',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D'
]

// Creëer texture atlas met alle karakters
// Voeg timestamp toe om cache te omzeilen
const atlasVersion = Date.now()
function createCharacterAtlas() {
    console.log('Creating character atlas with VS Code colors, version:', atlasVersion)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    const charSize = isMobile ? 32 : 64 // Smaller texture on mobile
    const cols = 10
    const rows = Math.ceil(CODE_CHARACTERS.length / cols)
    
    canvas.width = charSize * cols
    canvas.height = charSize * rows
    
    // Zwarte achtergrond voor betere contrast
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const fontSize = isMobile ? 24 : 48
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // VS Code Dark+ theme kleuren met meer variatie
    const getVSCodeColor = (char) => {
        // Brackets - verschillende tinten geel/goud
        if ('[]'.includes(char)) return '#FFD700'
        if ('{}'.includes(char)) return '#FFA500' // oranje-geel
        if ('()'.includes(char)) return '#DA70D6' // paars
        if ('<>'.includes(char)) return '#808080' // grijs
        
        // Operators - verschillende blauwtinten
        if ('+-'.includes(char)) return '#569CD6' // standaard blauw
        if ('*/'.includes(char)) return '#4EC9B0' // turquoise
        if ('%='.includes(char)) return '#4FC1FF' // licht blauw
        if ('&|'.includes(char)) return '#C586C0' // paars
        if ('!~^'.includes(char)) return '#FF6B6B' // rood
        
        // Punctuation - verschillende grijstinten
        if (':'.includes(char)) return '#FFFFFF' // wit
        if (';'.includes(char)) return '#D4D4D4' // licht grijs
        if (',.'.includes(char)) return '#808080' // grijs
        if ('_'.includes(char)) return '#9CDCFE' // lichtblauw
        
        // Special characters - warme kleuren
        if ('@'.includes(char)) return '#DCDCAA' // geel
        if ('#'.includes(char)) return '#608B4E' // groen (comments)
        if ('$'.includes(char)) return '#9CDCFE' // lichtblauw (variables)
        
        // Quotes - string kleuren
        if ('"'.includes(char)) return '#CE9178' // oranje
        if ("'".includes(char)) return '#D7BA7D' // licht oranje
        if ('`'.includes(char)) return '#CE9178' // oranje
        
        // Numbers - groentinten
        if ('0123'.includes(char)) return '#B5CEA8' // lichtgroen
        if ('4567'.includes(char)) return '#96D896' // groen
        if ('89'.includes(char)) return '#7ECA7E' // donkergroen
        
        // Letters - meer variatie
        const letterColors = [
            '#9CDCFE', // lichtblauw (variables)
            '#C586C0', // paars (keywords)
            '#DCDCAA', // geel (functions)
            '#4EC9B0', // turquoise (types)
            '#CE9178', // oranje
            '#D7BA7D', // licht oranje
        ]
        
        if ('abcdefghijklmnopqrstuvwxyz'.includes(char.toLowerCase())) {
            // Hash de character code voor consistente maar gevarieerde kleuren
            const index = char.charCodeAt(0) % letterColors.length
            return letterColors[index]
        }
        
        // Default - wit
        return '#D4D4D4'
    }
    
    CODE_CHARACTERS.forEach((char, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = col * charSize + charSize / 2
        const y = row * charSize + charSize / 2
        
        // VS Code kleur voor dit karakter
        const color = getVSCodeColor(char)
        ctx.fillStyle = color
        
        // Teken karakter met glow effect
        ctx.shadowColor = color
        ctx.shadowBlur = 10
        ctx.fillText(char, x, y)
        
        // Extra glow laag
        ctx.shadowBlur = 20
        ctx.globalAlpha = 0.5
        ctx.fillText(char, x, y)
        ctx.globalAlpha = 1.0
    })
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    
    // Debug canvas verwijderd - texture wordt niet meer getoond
    
    return { texture, cols, rows }
}

const vertexShader = `
    attribute vec3 aTargetPosition0;
    attribute vec3 aTargetPosition1;
    attribute vec3 aTargetPosition2;
    attribute vec3 aTargetPosition3;
    attribute float aRandom;
    attribute float aCharIndex;
    
    uniform float uMorphProgress;
    uniform float uTime;
    uniform int uCurrentModel;
    uniform int uTargetModel;
    uniform float uCircleMorphProgress;
    
    varying vec3 vColor;
    varying float vRandom;
    varying float vCharIndex;
    varying vec3 vWorldPosition;
    
    vec3 getModelPosition(int modelIndex, vec3 pos0, vec3 pos1, vec3 pos2, vec3 pos3) {
        if (modelIndex == 0) return pos0;
        else if (modelIndex == 1) return pos1;
        else if (modelIndex == 2) return pos2;
        else return pos3;
    }
    
    void main() {
        vColor = color;
        vRandom = aRandom;
        vCharIndex = aCharIndex;
        
        vec3 currentPos = getModelPosition(uCurrentModel, aTargetPosition0, aTargetPosition1, aTargetPosition2, aTargetPosition3);
        vec3 targetPos = getModelPosition(uTargetModel, aTargetPosition0, aTargetPosition1, aTargetPosition2, aTargetPosition3);
        
        vec3 morphedPosition = mix(currentPos, targetPos, uMorphProgress);
        
        // Vacuum/Suction effect - particles get sucked backwards
        if (uCircleMorphProgress > 0.0) {
            // Each particle has a unique random factor for varied suction timing
            float particleId = aCharIndex + aRandom * 100.0;
            
            // Random delay for each particle (0 to 1) - longer stagger for slower effect
            float suctionDelay = fract(sin(particleId * 12.9898) * 43758.5453);
            
            // Adjusted progress with longer delay for staggered effect (50% instead of 30%)
            float adjustedProgress = max(0.0, (uCircleMorphProgress - suctionDelay * 0.5) / (1.0 - suctionDelay * 0.5));
            adjustedProgress = smoothstep(0.0, 1.0, adjustedProgress);
            
            // Suction target position (far behind camera)
            float suctionDistance = 50.0 + aRandom * 30.0; // Random distance 50-80 units back
            
            // Random angle for dispersed suction pattern
            float angle = aRandom * 6.28318530718; // 2π radians
            float suctionRadius = 2.0 + aRandom * 3.0; // Small random spread
            
            vec3 suctionTarget = vec3(
                cos(angle) * suctionRadius,
                sin(angle) * suctionRadius,
                -suctionDistance // Negative Z = behind camera
            );
            
            // Gentler acceleration curve - more gradual buildup
            float suctionCurve = pow(adjustedProgress, 2.0); // Quadratic instead of cubic for smoother acceleration
            
            // Apply suction transformation
            morphedPosition = mix(morphedPosition, suctionTarget, suctionCurve);
            
            // Add gentler spiral motion during suction for more dynamic effect
            if (adjustedProgress > 0.1) {
                float spiralTime = adjustedProgress * 5.0; // Slower spiral: 10.0 -> 5.0
                float spiralRadius = (1.0 - adjustedProgress) * 1.5; // Smaller radius: 2.0 -> 1.5
                morphedPosition.x += cos(spiralTime + particleId) * spiralRadius * 0.3; // Less intensity: 0.5 -> 0.3
                morphedPosition.y += sin(spiralTime + particleId) * spiralRadius * 0.3;
            }
        }
        
        // Stuur world position door naar fragment shader
        vWorldPosition = morphedPosition;
        
        // Subtiele beweging voor levendigheid
        float timeOffset = uTime + aRandom * 6.28318;
        morphedPosition.x += sin(timeOffset * 0.5) * 0.05;
        morphedPosition.y += cos(timeOffset * 0.7) * 0.05;
        
        vec4 mvPosition = modelViewMatrix * vec4(morphedPosition, 1.0);
        
        // Variabele grootte gebaseerd op random en positie
        float baseSize = 0.5;
        
        // Maak particles in het centrum groter
        float centerBoost = 1.0 - smoothstep(0.0, 5.0, length(morphedPosition.xy));
        
        // Random variatie in grootte (0.5 tot 1.5x)
        float sizeVariation = 0.5 + aRandom;
        
        // Combineer alles
        float size = baseSize * sizeVariation * (1.0 + centerBoost * 0.5);
        
        // Optioneel: maak border particles ook groter
        if (length(morphedPosition) > 5.5) {
            size *= 1.5;
        }
        
        gl_PointSize = size * (242.0 / -mvPosition.z); // 21% groter (220 * 1.1 = 242)
        
        gl_Position = projectionMatrix * mvPosition;
    }
`

const fragmentShader = `
    uniform sampler2D uCharAtlas;
    uniform float uTime;
    uniform float uAtlasColumns;
    uniform float uAtlasRows;
    uniform vec3 uGlowColor;
    uniform float uCircleMorphProgress;
    
    varying vec3 vColor;
    varying float vRandom;
    varying float vCharIndex;
    varying vec3 vWorldPosition;
    
    void main() {
        // Bereken welk karakter we moeten tonen
        float col = mod(vCharIndex, uAtlasColumns);
        float row = floor(vCharIndex / uAtlasColumns);
        
        // Map gl_PointCoord naar de juiste cel in de atlas
        vec2 cellUV = vec2(
            (col + gl_PointCoord.x) / uAtlasColumns,
            1.0 - (row + 1.0 - gl_PointCoord.y) / uAtlasRows
        );
        
        vec4 charColor = texture2D(uCharAtlas, cellUV);
        
        // Alleen pixels met karakter data tonen (niet de zwarte achtergrond)
        if (charColor.r < 0.1 && charColor.g < 0.1 && charColor.b < 0.1) {
            discard;
        }
        
        // Bereken verschillende afstanden voor zone kleuring
        float distFromCenter = length(vWorldPosition.xy);
        float distFromCenterY = abs(vWorldPosition.y);
        float distFromCenterX = abs(vWorldPosition.x);
        
        // Simpele border detectie - alleen de buitenste particles wit maken
        vec3 zoneColor;
        
        // Detecteer alleen de echte buitenste rand MAAR niet tijdens circle morph
        // We gebruiken een veel hogere threshold zodat alleen de uiterste particles wit worden
        float maxDist = max(max(abs(vWorldPosition.x), abs(vWorldPosition.y)), abs(vWorldPosition.z));
        float borderThreshold = 5.5; // Verhoog dit voor alleen de allerlaatste rand
        
        // Ook check de radiale afstand voor ronde vormen
        float radialDist = length(vWorldPosition);
        float radialThreshold = 6.0;
        
        // Check of deze particle echt aan de uiterste rand is
        // BELANGRIJK: Skip border detection during circle morph
        if ((maxDist > borderThreshold || radialDist > radialThreshold) && uCircleMorphProgress < 0.01) {
            // Alleen de allerlaatste border particles - maak ze wit
            zoneColor = vec3(1.0, 1.0, 1.0);
        } else {
            // Alle andere particles - gebruik normale VS Code kleuren
            zoneColor = charColor.rgb;
        }
        
        // Individuele flicker per particle met meer randomisatie
        float randomSpeed1 = 1.0 + vRandom * 4.0; // Random snelheid tussen 1-5
        float randomSpeed2 = 2.0 + mod(vRandom * 7.0, 5.0); // Random snelheid tussen 2-7
        float randomSpeed3 = 3.0 + mod(vRandom * 11.0, 8.0); // Random snelheid tussen 3-11
        
        float flicker1 = sin(uTime * randomSpeed1 + vRandom * 17.3) * 0.5 + 0.5;
        float flicker2 = sin(uTime * randomSpeed2 + vRandom * 23.7) * 0.5 + 0.5;
        float flicker3 = sin(uTime * randomSpeed3 + vRandom * 31.4) * 0.5 + 0.5;
        
        // Combineer verschillende flicker frequenties
        float combinedFlicker = flicker1 * 0.3 + flicker2 * 0.3 + flicker3 * 0.4;
        
        // Zorg dat het flikkeren subtiel is (tussen 0.7 en 1.0)
        float flickerAmount = 0.7 + combinedFlicker * 0.3;
        
        // Occasionele sterke flicker - ook meer random
        float randomThreshold = 0.95 + vRandom * 0.04; // Verschillende thresholds per particle
        float strongFlicker = step(randomThreshold, sin(uTime * (1.5 + vRandom * 2.0) + vRandom * 100.0));
        flickerAmount = mix(flickerAmount, 0.3, strongFlicker);
        
        // Final color
        vec3 finalColor = zoneColor * flickerAmount;
        
        // Normale glow voor alle particles
        finalColor *= 1.2;
        
        // Suction fade effect - particles fade as they get sucked away
        float finalAlpha = charColor.a * flickerAmount;
        
        if (uCircleMorphProgress > 0.0) {
            // Calculate distance from camera (negative Z = behind camera)
            float distanceFromCamera = length(vWorldPosition);
            
            // Fade based on suction progress and distance
            float suctionFade = 1.0;
            
            // Start fading when particles move behind camera (negative Z)
            if (vWorldPosition.z < 0.0) {
                // More dramatic fade for particles further back
                float fadeDistance = abs(vWorldPosition.z) / 50.0; // Normalize by max suction distance
                suctionFade = 1.0 - smoothstep(0.0, 1.0, fadeDistance);
            }
            
            // Also fade based on overall suction progress - later fade start for smoother effect
            float progressFade = 1.0 - smoothstep(0.5, 1.0, uCircleMorphProgress); // Start fade later: 0.3 -> 0.5
            
            // Combine both fades
            finalAlpha *= suctionFade * progressFade;
            
            // Add some extra glow during suction for dramatic effect
            if (uCircleMorphProgress > 0.1 && uCircleMorphProgress < 0.7) {
                float glowBoost = sin(uCircleMorphProgress * 3.14159) * 0.5;
                finalColor *= (1.0 + glowBoost);
            }
        }
        
        gl_FragColor = vec4(finalColor, finalAlpha);
    }
`

// Helper function to sample points from multiple geometries
function sampleMultipleGeometriesToPoints(geometries, targetCount, scale = 1) {
    if (!Array.isArray(geometries)) {
        geometries = [geometries]
    }
    
    console.log(`Sampling from ${geometries.length} geometries with scale ${scale}`)
    
    // First, merge all geometries into one
    const mergedGeometry = new THREE.BufferGeometry()
    const allPositions = []
    const allIndices = []
    let vertexOffset = 0
    
    // Collect all positions and indices from all geometries
    for (let i = 0; i < geometries.length; i++) {
        const geometry = geometries[i]
        if (!geometry || !geometry.attributes || !geometry.attributes.position) {
            console.warn(`Skipping geometry ${i} without position attribute`)
            continue
        }
        
        const positionAttribute = geometry.attributes.position
        const positions = positionAttribute.array
        console.log(`Geometry ${i}: ${positions.length / 3} vertices`)
        
        // Add positions
        for (let j = 0; j < positions.length; j += 3) {
            allPositions.push(
                positions[j] * scale,
                positions[j + 1] * scale,
                positions[j + 2] * scale
            )
        }
        
        // Add indices if they exist
        if (geometry.index) {
            const indices = geometry.index.array
            for (let j = 0; j < indices.length; j++) {
                allIndices.push(indices[j] + vertexOffset)
            }
        } else {
            // Create indices for non-indexed geometry
            const vertexCount = positions.length / 3
            for (let j = 0; j < vertexCount; j++) {
                allIndices.push(j + vertexOffset)
            }
        }
        
        vertexOffset += positions.length / 3
    }
    
    console.log(`Total vertices collected: ${allPositions.length / 3}`)
    console.log(`Total indices: ${allIndices.length}`)
    
    if (allPositions.length === 0) {
        console.warn('No positions found, returning zeros')
        return new Float32Array(targetCount * 3)
    }
    
    // Create merged geometry
    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allPositions), 3))
    if (allIndices.length > 0) {
        mergedGeometry.setIndex(allIndices)
    }
    
    // Now sample from the merged geometry
    return sampleGeometryToPoints(mergedGeometry, targetCount, 1) // scale already applied
}

// Helper function to sample points from geometry
function sampleGeometryToPoints(geometry, targetCount, scale = 1) {
    const positions = []
    
    // Check if geometry exists
    if (!geometry || !geometry.attributes) {
        console.warn('No geometry found, returning empty positions')
        return new Float32Array(targetCount * 3) // Return zeros
    }
    
    // Get position attribute
    const positionAttribute = geometry.attributes.position
    if (!positionAttribute) return new Float32Array(targetCount * 3)
    
    // If geometry has indices (indexed geometry)
    if (geometry.index) {
        const indices = geometry.index.array
        const vertices = positionAttribute.array
        
        // Calculate total surface area for weighted sampling
        const triangleAreas = []
        let totalArea = 0
        
        for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i] * 3
            const i2 = indices[i + 1] * 3
            const i3 = indices[i + 2] * 3
            
            const v1 = new THREE.Vector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2])
            const v2 = new THREE.Vector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2])
            const v3 = new THREE.Vector3(vertices[i3], vertices[i3 + 1], vertices[i3 + 2])
            
            // Calculate triangle area
            const edge1 = v2.clone().sub(v1)
            const edge2 = v3.clone().sub(v1)
            const area = edge1.cross(edge2).length() * 0.5
            
            triangleAreas.push(area)
            totalArea += area
        }
        
        // Sample points based on triangle areas
        for (let i = 0; i < targetCount; i++) {
            // Pick a random triangle weighted by area
            let randomArea = Math.random() * totalArea
            let triangleIndex = 0
            let currentArea = 0
            
            for (let j = 0; j < triangleAreas.length; j++) {
                currentArea += triangleAreas[j]
                if (currentArea >= randomArea) {
                    triangleIndex = j
                    break
                }
            }
            
            // Get triangle vertices
            const i1 = indices[triangleIndex * 3] * 3
            const i2 = indices[triangleIndex * 3 + 1] * 3
            const i3 = indices[triangleIndex * 3 + 2] * 3
            
            const v1 = new THREE.Vector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2])
            const v2 = new THREE.Vector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2])
            const v3 = new THREE.Vector3(vertices[i3], vertices[i3 + 1], vertices[i3 + 2])
            
            // Random point on triangle
            const r1 = Math.random()
            const r2 = Math.random()
            const sqrtR1 = Math.sqrt(r1)
            
            const a = 1 - sqrtR1
            const b = sqrtR1 * (1 - r2)
            const c = sqrtR1 * r2
            
            const point = new THREE.Vector3()
                .addScaledVector(v1, a)
                .addScaledVector(v2, b)
                .addScaledVector(v3, c)
                .multiplyScalar(scale)
            
            positions.push(point.x, point.y, point.z)
        }
    } else {
        // Non-indexed geometry
        const vertices = positionAttribute.array
        const vertexCount = vertices.length / 3
        
        // Simple sampling for non-indexed geometry
        for (let i = 0; i < targetCount; i++) {
            const index = Math.floor(Math.random() * vertexCount) * 3
            positions.push(
                vertices[index] * scale,
                vertices[index + 1] * scale,
                vertices[index + 2] * scale
            )
        }
    }
    
    return new Float32Array(positions)
}

function ScrollMorph3DParticles({ particleCount = 25000, onModelChange, photoSpiralRef }) {
    const meshRef = useRef()
    const materialRef = useRef()
    const { camera } = useThree()
    const [modelsLoaded, setModelsLoaded] = useState(false)
    
    // Creëer character atlas een keer bij component mount
    const characterAtlas = useMemo(() => createCharacterAtlas(), [])
    
    const currentModelRef = useRef(0)
    const scrollProgressRef = useRef(0)
    const isTransitioningRef = useRef(false)
    const animatedProgressRef = useRef(0)
    const scrollTimeoutRef = useRef(null)
    
    // Long hold states
    const isHoldingRef = useRef(false)
    const holdTimeoutRef = useRef(null)
    const circleMorphTweenRef = useRef(null)
    const menuActiveRef = useRef(false)
    const selectedModelRef = useRef(0)
    const isDraggingRef = useRef(false)
    
    // Mouse movement tracking
    const mouseRef = useRef({ x: 0, y: 0 })
    const targetRotationRef = useRef({ x: 0, y: 0 })
    const currentRotationRef = useRef({ x: 0, y: 0 })
    const dragStartPos = useRef({ x: 0, y: 0 })
    
    // Load all models
    const hd = useGLTF(MODELS[0].path)
    const mae = useGLTF(MODELS[1].path)  
    const omni = useGLTF(MODELS[2].path)
    const walters = useGLTF(MODELS[3].path)
    
    // Create geometry with model positions
    const geometry = useMemo(() => {
        if (!hd || !mae || !omni || !walters) return null
        
        const geo = new THREE.BufferGeometry()
        
        // Initial positions (all at origin)
        const positions = new Float32Array(particleCount * 3)
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        
        // Helper function to calculate bounding box for all geometries
        const calculateBoundingBox = (geometries) => {
            const box = new THREE.Box3()
            geometries.forEach(geometry => {
                geometry.computeBoundingBox()
                box.union(geometry.boundingBox)
            })
            return box
        }
        
        // Target size for all models (based on Mae)
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        const targetSize = isMobile ? 0.14 : 0.16 // Slightly smaller on mobile
        
        // Sample points from each model's geometry
        // For HD - collect ALL meshes and merge them
        const hdGeometries = []
        console.log('HD model structure:')
        hd.scene.traverse((child) => {
            console.log('- Child:', child.type, child.name)
            if (child.isMesh && child.geometry) {
                console.log('  Found mesh with', child.geometry.attributes.position?.count, 'vertices')
                // Clone geometry - HD doesn't need rotation
                const clonedGeometry = child.geometry.clone()
                // No rotation for HD - it's already upright
                hdGeometries.push(clonedGeometry)
            }
        })
        console.log('Total HD geometries:', hdGeometries.length)
        
        // For Mae - collect ALL meshes and merge them
        const maeGeometries = []
        console.log('Mae model structure:')
        mae.scene.traverse((child) => {
            console.log('- Child:', child.type, child.name)
            if (child.isMesh && child.geometry) {
                console.log('  Found mesh with', child.geometry.attributes.position?.count, 'vertices')
                // Clone geometry and rotate it to stand upright
                const clonedGeometry = child.geometry.clone()
                clonedGeometry.rotateX(Math.PI / 2) // Rotate 90 degrees around X axis
                maeGeometries.push(clonedGeometry)
            }
        })
        console.log('Total Mae geometries:', maeGeometries.length)
        
        // For Omni - collect ALL meshes and merge them
        const omniGeometries = []
        console.log('Omni model structure:')
        omni.scene.traverse((child) => {
            console.log('- Child:', child.type, child.name)
            if (child.isMesh && child.geometry) {
                console.log('  Found mesh with', child.geometry.attributes.position?.count, 'vertices')
                // Clone geometry and rotate it to stand upright
                const clonedGeometry = child.geometry.clone()
                clonedGeometry.rotateX(Math.PI / 2) // Rotate 90 degrees around X axis
                omniGeometries.push(clonedGeometry)
            }
        })
        console.log('Total Omni geometries:', omniGeometries.length)
        
        // For Walters - collect ALL meshes and merge them
        const waltersGeometries = []
        console.log('Walters model structure:')
        walters.scene.traverse((child) => {
            console.log('- Child:', child.type, child.name)
            if (child.isMesh && child.geometry) {
                console.log('  Found mesh with', child.geometry.attributes.position?.count, 'vertices')
                // Clone geometry and rotate it to stand upright
                const clonedGeometry = child.geometry.clone()
                clonedGeometry.rotateX(Math.PI / 2) // Rotate 90 degrees around X axis
                waltersGeometries.push(clonedGeometry)
            }
        })
        console.log('Total Walters geometries:', waltersGeometries.length)
        
        // Calculate bounding boxes and normalize scales
        const hdBox = calculateBoundingBox(hdGeometries)
        const maeBox = calculateBoundingBox(maeGeometries)
        const omniBox = calculateBoundingBox(omniGeometries)
        const waltersBox = calculateBoundingBox(waltersGeometries)
        
        // Calculate scale factors to normalize all models to the same size
        const hdSize = hdBox.getSize(new THREE.Vector3()).length()
        const maeSize = maeBox.getSize(new THREE.Vector3()).length()
        const omniSize = omniBox.getSize(new THREE.Vector3()).length()
        const waltersSize = waltersBox.getSize(new THREE.Vector3()).length()
        
        // Use Mae as reference size
        const referenceSize = maeSize
        
        const hdScale = (targetSize / hdSize) * MODELS[0].scale * 0.5 // HD is half size
        const maeScale = (targetSize / maeSize) * MODELS[1].scale * 0.8 // HD is half size
        const omniScale = (targetSize / omniSize) * MODELS[2].scale * 0.8 // HD is half size
        const waltersScale = (targetSize / waltersSize) * MODELS[3].scale * 0.8 // HD is half size
        
        console.log('Model sizes:', { hdSize, maeSize, omniSize, waltersSize })
        console.log('Calculated scales:', { hdScale, maeScale, omniScale, waltersScale })
        
        const targetPositions0 = sampleMultipleGeometriesToPoints(
            hdGeometries,
            particleCount,
            hdScale
        )
        
        const targetPositions1 = sampleMultipleGeometriesToPoints(
            maeGeometries,
            particleCount,
            maeScale
        )
        
        const targetPositions2 = sampleMultipleGeometriesToPoints(
            omniGeometries,
            particleCount,
            omniScale
        )
        
        const targetPositions3 = sampleMultipleGeometriesToPoints(
            waltersGeometries,
            particleCount,
            waltersScale
        )
        
        // Set attributes for each model's positions
        geo.setAttribute('aTargetPosition0', new THREE.BufferAttribute(targetPositions0, 3))
        geo.setAttribute('aTargetPosition1', new THREE.BufferAttribute(targetPositions1, 3))
        geo.setAttribute('aTargetPosition2', new THREE.BufferAttribute(targetPositions2, 3))
        geo.setAttribute('aTargetPosition3', new THREE.BufferAttribute(targetPositions3, 3))
        
        // Random values
        const randoms = new Float32Array(particleCount)
        for (let i = 0; i < particleCount; i++) {
            randoms[i] = Math.random()
        }
        geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
        
        // Character indices - random karakter voor elke particle
        const charIndices = new Float32Array(particleCount)
        for (let i = 0; i < particleCount; i++) {
            charIndices[i] = Math.floor(Math.random() * CODE_CHARACTERS.length)
        }
        geo.setAttribute('aCharIndex', new THREE.BufferAttribute(charIndices, 1))
        
        // Colors - wit/neutraal zodat texture kleuren goed zichtbaar zijn
        const colors = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3
            // Licht grijze tint voor alle particles
            colors[idx] = 0.9     // R
            colors[idx + 1] = 0.9 // G
            colors[idx + 2] = 0.9 // B
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        
        setModelsLoaded(true)
        return geo
    }, [hd, mae, omni, walters, particleCount])
    
    
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMorphProgress: { value: 0 },
                uCurrentModel: { value: 0 },
                uTargetModel: { value: 1 },
                uGlowColor: { value: new THREE.Color(MODELS[0].color) },
                uCharAtlas: { value: characterAtlas.texture },
                uAtlasColumns: { value: characterAtlas.cols },
                uAtlasRows: { value: characterAtlas.rows },
                uCircleMorphProgress: { value: 0 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        })
    }, [characterAtlas])
    
    const updateColors = useCallback((modelIndex) => {
        if (!geometry) return
        
        // Update alleen de glow color, behoud de groene Matrix kleuren
        const newColor = new THREE.Color(MODELS[modelIndex].color)
        gsap.to(materialRef.current.uniforms.uGlowColor.value, {
            r: newColor.r,
            g: newColor.g,
            b: newColor.b,
            duration: 0.5
        })
    }, [geometry])
    
    const completeTransition = useCallback(() => {
        // Calculate next models
        const nextCurrent = (currentModelRef.current + 1) % MODELS.length
        const nextTarget = (nextCurrent + 1) % MODELS.length
        
        // Update model references
        currentModelRef.current = nextCurrent
        
        // Update uniforms for new current model
        materialRef.current.uniforms.uCurrentModel.value = nextCurrent
        materialRef.current.uniforms.uTargetModel.value = nextTarget
        materialRef.current.uniforms.uMorphProgress.value = 0
        
        updateColors(nextCurrent)
        
        // Update View Project button
        const projectButton = document.getElementById('view-project-button')
        if (projectButton) {
            projectButton.setAttribute('data-url', MODELS[nextCurrent].projectUrl)
        }
        
        // Notify parent component about model change
        if (onModelChange) {
            onModelChange(nextCurrent)
        }
    }, [updateColors])
    
    // Simplified reset function - no longer needed with wheel navigation
    const resetToStart = useCallback(() => {
        // Reset any remaining scroll progress
        scrollProgressRef.current = 0
        
        // Reset progress bar if it exists
        const progressBar = document.getElementById('progressBar')
        if (progressBar) {
            progressBar.style.height = "0%"
        }
    }, [])
    
    // New wheel-based navigation system (with mobile touch support)
    useEffect(() => {
        if (!modelsLoaded) return
        
        let isTransitioning = false
        let lastWheelTime = 0
        const wheelCooldown = 1000 // 1 second cooldown between transitions
        
        // Touch handling for mobile
        let touchStartY = 0
        let touchStartTime = 0
        
        // Common navigation logic
        const navigateToModel = (direction) => {
            const currentTime = Date.now()
            if (isTransitioning || currentTime - lastWheelTime < wheelCooldown) {
                return
            }
            
            lastWheelTime = currentTime
            isTransitioning = true
            
            // Trigger PhotoSpiral speed burst
            if (photoSpiralRef?.current?.triggerSpeedBurst) {
                photoSpiralRef.current.triggerSpeedBurst()
            }
            
            // Start vacuum/suction effect like long hold
            if (materialRef.current) {
                if (circleMorphTweenRef.current) {
                    circleMorphTweenRef.current.kill()
                }
                
                circleMorphTweenRef.current = gsap.to(materialRef.current.uniforms.uCircleMorphProgress, {
                    value: 1,
                    duration: 1.6,
                    ease: "power2.inOut",
                    onComplete: () => {
                        // Determine target model based on direction
                        let targetModel
                        if (direction > 0) {
                            // Next model
                            targetModel = (currentModelRef.current + 1) % MODELS.length
                        } else {
                            // Previous model
                            targetModel = (currentModelRef.current - 1 + MODELS.length) % MODELS.length
                        }
                        
                        // Update to target model
                        const oldModel = currentModelRef.current
                        currentModelRef.current = targetModel
                        
                        // Update material uniforms
                        if (materialRef.current) {
                            materialRef.current.uniforms.uCurrentModel.value = targetModel
                            materialRef.current.uniforms.uTargetModel.value = (targetModel + 1) % MODELS.length
                            materialRef.current.uniforms.uMorphProgress.value = 0
                        }
                        
                        // Update colors
                        updateColors(targetModel)
                        
                        // Update UI
                        const projectButton = document.getElementById('view-project-button')
                        if (projectButton) {
                            projectButton.setAttribute('data-url', MODELS[targetModel].projectUrl)
                        }
                        
                        // Notify parent about model change
                        if (onModelChange) {
                            onModelChange(targetModel)
                        }
                        
                        // Reset PhotoSpiral IMMEDIATELY when particle return starts
                        if (photoSpiralRef?.current?.resetSpiral) {
                            photoSpiralRef.current.resetSpiral()
                        }
                        
                        // Return particles to model shape
                        gsap.to(materialRef.current.uniforms.uCircleMorphProgress, {
                            value: 0,
                            duration: 1.8,
                            ease: "power2.inOut",
                            onComplete: () => {
                                isTransitioning = false
                            }
                        })
                    }
                })
            }
        }
        
        // Wheel handler for desktop
        const handleWheel = (e) => {
            e.preventDefault()
            const direction = e.deltaY > 0 ? 1 : -1
            navigateToModel(direction)
        }
        
        // Touch handlers for mobile
        const handleTouchStart = (e) => {
            touchStartY = e.touches[0].clientY
            touchStartTime = Date.now()
        }
        
        const handleTouchEnd = (e) => {
            const touchEndY = e.changedTouches[0].clientY
            const touchEndTime = Date.now()
            const deltaY = touchStartY - touchEndY
            const deltaTime = touchEndTime - touchStartTime
            
            // Minimum swipe distance and maximum time for swipe detection
            const minSwipeDistance = 50
            const maxSwipeTime = 500
            
            if (Math.abs(deltaY) > minSwipeDistance && deltaTime < maxSwipeTime) {
                e.preventDefault()
                const direction = deltaY > 0 ? 1 : -1 // Swipe up = next, swipe down = previous
                navigateToModel(direction)
            }
        }
        
        // Add event listeners
        window.addEventListener('wheel', handleWheel, { passive: false })
        window.addEventListener('touchstart', handleTouchStart, { passive: true })
        window.addEventListener('touchend', handleTouchEnd, { passive: false })
        
        return () => {
            window.removeEventListener('wheel', handleWheel)
            window.removeEventListener('touchstart', handleTouchStart)
            window.removeEventListener('touchend', handleTouchEnd)
        }
    }, [modelsLoaded, updateColors, onModelChange])
    
    // Show menu function
    const showMenu = useCallback(() => {
        const menu = document.getElementById('model-menu')
        if (!menu) return
        
        menuActiveRef.current = true
        menu.classList.add('active')
        
        // Update selected model indicator
        const options = menu.querySelectorAll('.model-option')
        options.forEach((option, index) => {
            option.classList.toggle('selected', index === currentModelRef.current)
        })
        
        // GSAP animation to show menu
        gsap.to(menu, {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: "back.out(1.7)"
        })
        
        // Start vacuum/suction effect - particles get sucked backwards (faster out)
        if (materialRef.current) {
            if (circleMorphTweenRef.current) {
                circleMorphTweenRef.current.kill()
            }
            
            circleMorphTweenRef.current = gsap.to(materialRef.current.uniforms.uCircleMorphProgress, {
                value: 1,
                duration: 1.6, // Iets sneller weggaan: 2.4 -> 1.6 seconds 
                ease: "power2.inOut"
            })
        }
    }, [])
    
    // Hide menu function
    const hideMenu = useCallback(() => {
        const menu = document.getElementById('model-menu')
        if (!menu) return
        
        menuActiveRef.current = false
        
        // GSAP animation to hide menu
        gsap.to(menu, {
            opacity: 0,
            scale: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => {
                menu.classList.remove('active')
            }
        })
        
        // Stop suction effect - particles return to model shape (slow return)
        if (materialRef.current) {
            if (circleMorphTweenRef.current) {
                circleMorphTweenRef.current.kill()
            }
            
            circleMorphTweenRef.current = gsap.to(materialRef.current.uniforms.uCircleMorphProgress, {
                value: 0,
                duration: 1.8, // 3x slower: 0.6 * 3 = 1.8 seconds
                ease: "power2.inOut"
            })
        }
    }, [])
    
    // Long hold event handlers
    const handlePointerDown = useCallback((e) => {
        if (!materialRef.current) return
        
        isHoldingRef.current = true
        dragStartPos.current = { x: e.clientX || e.touches?.[0]?.clientX || 0, y: e.clientY || e.touches?.[0]?.clientY || 0 }
        
        // Start timer for 1 second
        holdTimeoutRef.current = setTimeout(() => {
            if (isHoldingRef.current && !isDraggingRef.current) {
                console.log('Long hold detected - showing menu')
                showMenu()
            }
        }, 1000) // 1 second hold
    }, [showMenu])
    
    const handlePointerMove = useCallback((e) => {
        if (!isHoldingRef.current) return
        
        const currentPos = { 
            x: e.clientX || e.touches?.[0]?.clientX || 0, 
            y: e.clientY || e.touches?.[0]?.clientY || 0 
        }
        
        const distance = Math.sqrt(
            Math.pow(currentPos.x - dragStartPos.current.x, 2) + 
            Math.pow(currentPos.y - dragStartPos.current.y, 2)
        )
        
        // If moved more than 10px, consider it a drag
        if (distance > 10) {
            isDraggingRef.current = true
            
            // Clear hold timeout
            if (holdTimeoutRef.current) {
                clearTimeout(holdTimeoutRef.current)
                holdTimeoutRef.current = null
            }
        }
        
        // Handle drag over menu options
        if (menuActiveRef.current) {
            const menu = document.getElementById('model-menu')
            const options = menu?.querySelectorAll('.model-option')
            
            options?.forEach(option => {
                const rect = option.getBoundingClientRect()
                const isOver = currentPos.x >= rect.left && 
                               currentPos.x <= rect.right && 
                               currentPos.y >= rect.top && 
                               currentPos.y <= rect.bottom
                
                option.classList.toggle('drag-over', isOver)
            })
        }
    }, [])
    
    const handlePointerUp = useCallback(() => {
        if (!materialRef.current) return
        
        isHoldingRef.current = false
        isDraggingRef.current = false
        
        // Clear timeout if still waiting
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current)
            holdTimeoutRef.current = null
        }
        
        // If menu is active, handle selection and hide menu
        if (menuActiveRef.current) {
            // Check if mouse is over a model option
            const menu = document.getElementById('model-menu')
            const options = menu?.querySelectorAll('.model-option')
            let selectedIndex = -1
            
            options?.forEach((option, index) => {
                if (option.classList.contains('drag-over')) {
                    selectedIndex = parseInt(option.dataset.model)
                    option.classList.remove('drag-over')
                }
            })
            
            // If a model was selected, switch to it
            if (selectedIndex >= 0 && selectedIndex !== currentModelRef.current) {
                console.log('Switching to model:', selectedIndex, MODELS[selectedIndex].name)
                
                // Update current model
                const oldModel = currentModelRef.current
                currentModelRef.current = selectedIndex
                
                // Update material uniforms
                if (materialRef.current) {
                    materialRef.current.uniforms.uCurrentModel.value = selectedIndex
                    materialRef.current.uniforms.uTargetModel.value = (selectedIndex + 1) % MODELS.length
                    materialRef.current.uniforms.uMorphProgress.value = 0
                }
                
                // Update colors
                updateColors(selectedIndex)
                
                // Update View Project button
                const projectButton = document.getElementById('view-project-button')
                if (projectButton) {
                    projectButton.setAttribute('data-url', MODELS[selectedIndex].projectUrl)
                }
                
                // Notify parent component about model change
                if (onModelChange) {
                    onModelChange(selectedIndex)
                }
            }
            
            hideMenu()
        }
    }, [hideMenu])
    
    // Mouse movement tracking (desktop only)
    useEffect(() => {
        // Skip mouse tracking on mobile
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        if (isMobile) return
        
        const handleMouseMove = (e) => {
            // Normalize mouse position to -1 to 1
            mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
            mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
            
            // Update target rotation with GSAP for smooth animation
            gsap.to(targetRotationRef.current, {
                x: mouseRef.current.y * 0.2, // Vertical mouse = X rotation
                y: mouseRef.current.x * 0.3, // Horizontal mouse = Y rotation
                duration: 0.5,
                ease: "power2.out"
            })
        }
        
        window.addEventListener('mousemove', handleMouseMove)
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
        }
    }, [])
    
    // Add event listeners (optimized for mobile/desktop)
    useEffect(() => {
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        
        if (isMobile) {
            // Mobile: only touch events
            window.addEventListener('touchstart', handlePointerDown)
            window.addEventListener('touchend', handlePointerUp)
            window.addEventListener('touchcancel', handlePointerUp)
            window.addEventListener('touchmove', handlePointerMove)
        } else {
            // Desktop: only mouse events
            window.addEventListener('mousedown', handlePointerDown)
            window.addEventListener('mouseup', handlePointerUp)
            window.addEventListener('mouseleave', handlePointerUp)
            window.addEventListener('mousemove', handlePointerMove)
        }
        
        return () => {
            if (isMobile) {
                window.removeEventListener('touchstart', handlePointerDown)
                window.removeEventListener('touchend', handlePointerUp)
                window.removeEventListener('touchcancel', handlePointerUp)
                window.removeEventListener('touchmove', handlePointerMove)
            } else {
                window.removeEventListener('mousedown', handlePointerDown)
                window.removeEventListener('mouseup', handlePointerUp)
                window.removeEventListener('mouseleave', handlePointerUp)
                window.removeEventListener('mousemove', handlePointerMove)
            }
            
            // Clean up timeouts and tweens
            if (holdTimeoutRef.current) {
                clearTimeout(holdTimeoutRef.current)
            }
            if (circleMorphTweenRef.current) {
                circleMorphTweenRef.current.kill()
            }
        }
    }, [handlePointerDown, handlePointerUp, handlePointerMove])
    
    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value += delta
        }
        
        // Only do mouse-based animations on desktop
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        if (!isMobile) {
            // Smooth rotation lerp
            currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.1
            currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.1
            
            // Apply rotation to mesh
            if (meshRef.current) {
                meshRef.current.rotation.x = currentRotationRef.current.x
                meshRef.current.rotation.y = currentRotationRef.current.y
                
                // Also add some position offset based on mouse
                meshRef.current.position.x = mouseRef.current.x * 0.5
                meshRef.current.position.y = mouseRef.current.y * 0.3
            }
        }
        
        // Update random karakters elke 0.5 seconde voor dynamisch effect
        const time = state.clock.getElapsedTime()
        if (geometry && Math.floor(time * 2) !== Math.floor((time - delta) * 2)) {
            const charAttr = geometry.getAttribute('aCharIndex')
            const charIndices = charAttr.array
            
            // Verander 5% van de karakters
            const changeCount = Math.floor(particleCount * 0.05)
            for (let i = 0; i < changeCount; i++) {
                const index = Math.floor(Math.random() * particleCount)
                charIndices[index] = Math.floor(Math.random() * CODE_CHARACTERS.length)
            }
            charAttr.needsUpdate = true
        }
    })
    
    if (!geometry) return null
    
    return (
        <points ref={meshRef} geometry={geometry} material={material}>
            <primitive object={geometry} />
            <primitive object={material} ref={materialRef} />
        </points>
    )
}

function ScrollMorph3DUI() {
    const navigate = useNavigate()
    
    useEffect(() => {
        const setVH = () => {
            const vh = window.innerHeight * 0.01
            document.documentElement.style.setProperty('--vh', `${vh}px`)
        }
        
        setVH()
        window.addEventListener('resize', setVH)
        window.addEventListener('orientationchange', setVH)
        
        const style = document.createElement('style')
        style.textContent = `
            .scroll-morph-ui {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 100;
            }
            
            
            .wheel-indicator {
                position: absolute;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                color: rgba(255, 255, 255, 0.7);
                font-size: 14px;
                text-align: center;
                animation: float 2s ease-in-out infinite;
                pointer-events: auto;
            }
            
            .hold-indicator {
                position: absolute;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                color: rgba(255, 255, 255, 0.9);
                font-size: 16px;
                font-weight: 600;
                background: rgba(100, 100, 255, 0.3);
                padding: 10px 20px;
                border-radius: 20px;
                border: 2px solid rgba(100, 100, 255, 0.6);
            }
            
            .model-menu {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0);
                z-index: 1000;
                opacity: 0;
                pointer-events: none;
                transition: none;
            }
            
            .model-menu.active {
                pointer-events: auto;
            }
            
            .model-menu-container {
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 20px;
                backdrop-filter: blur(15px);
                min-width: 200px;
            }
            
            .model-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .model-option {
                background: transparent;
                border: none;
                border-radius: 8px;
                padding: 12px 16px;
                color: rgba(255, 255, 255, 0.7);
                font-family: 'Courier New', monospace;
                font-size: 14px;
                font-weight: 500;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
                border: 1px solid transparent;
            }
            
            .model-option:hover {
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.9);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateX(4px);
            }
            
            .model-option.selected {
                background: rgba(255, 255, 255, 0.15);
                color: rgba(255, 255, 255, 1);
                border-color: rgba(255, 255, 255, 0.4);
                font-weight: 600;
            }
            
            .model-option.drag-over {
                background: rgba(100, 255, 100, 0.2);
                color: rgba(255, 255, 255, 1);
                border-color: rgba(100, 255, 100, 0.6);
                transform: translateX(8px);
            }
            
            @keyframes float {
                0%, 100% { transform: translateX(-50%) translateY(0px); }
                50% { transform: translateX(-50%) translateY(-10px); }
            }
            
            .view-project-button {
                position: absolute;
                bottom: 140px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: rgba(255, 255, 255, 0.9);
                padding: 12px 30px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                font-family: 'Courier New', monospace;
                cursor: pointer;
                transition: all 0.3s ease;
                pointer-events: auto;
                backdrop-filter: blur(10px);
                text-decoration: none;
                display: inline-block;
            }
            
            .view-project-button:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.6);
                transform: translateX(-50%) scale(1.05);
                box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
            }
        `
        document.head.appendChild(style)
        
        const ui = document.createElement('div')
        ui.className = 'scroll-morph-ui'
        ui.innerHTML = `
            <button class="view-project-button" id="view-project-button" data-url="${MODELS[0].projectUrl}">
                View Project
            </button>
        `
        
        document.body.appendChild(ui)
        
        // Add model selection menu
        const menu = document.createElement('div')
        menu.className = 'model-menu'
        menu.id = 'model-menu'
        menu.innerHTML = `
            <div class="model-menu-container">
                <div class="model-list">
                    <div class="model-option" data-model="2">Omni</div>
                    <div class="model-option" data-model="0">Heerlen</div>
                    <div class="model-option" data-model="3">Walters</div>
                    <div class="model-option" data-model="1">Move Adapt Evolve</div>
                </div>
            </div>
        `
        
        document.body.appendChild(menu)
        
        // Add click handler for View Project button
        const viewProjectButton = document.getElementById('view-project-button')
        if (viewProjectButton) {
            viewProjectButton.addEventListener('click', () => {
                const url = viewProjectButton.getAttribute('data-url')
                if (url) {
                    navigate(url)
                }
            })
        }
        
        return () => {
            document.head.removeChild(style)
            if (document.body.contains(ui)) {
                document.body.removeChild(ui)
            }
            if (document.body.contains(menu)) {
                document.body.removeChild(menu)
            }
            window.removeEventListener('resize', setVH)
            window.removeEventListener('orientationchange', setVH)
        }
    }, [navigate])
    
    return null
}

function LoadingFallback() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ff6600" />
        </mesh>
    )
}

// Preload all models
MODELS.forEach(model => {
    useGLTF.preload(model.path)
})

export default function ParticleScene({ onModelChange, onReady, photoSpiralRef }) {
    const particleCount = useMemo(() => {
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        return isMobile ? 2000 : 5000 // Reduced mobile particles for better performance
    }, [])
    
    useEffect(() => {
        const scrollContainer = document.getElementById('scroll-wrapper')
        if (scrollContainer) {
            scrollContainer.scrollTop = 0
        } else {
            window.scrollTo(0, 0)
        }
        
        const progressBar = document.getElementById('progressBar')
        if (progressBar) {
            progressBar.style.height = "0%"
        }
        
        ScrollTrigger.refresh()
        console.log(`ParticleScene initialized with ${particleCount} particles`)
        
        // Notify parent when ready
        if (onReady) onReady()
    }, [onReady, particleCount])
    
    return (
        <>
            <Suspense fallback={<LoadingFallback />}>
                <ScrollMorph3DParticles 
                    particleCount={particleCount} 
                    onModelChange={onModelChange}
                    photoSpiralRef={photoSpiralRef}
                />
            </Suspense>
            <ScrollMorph3DUI />
        </>
    )
}