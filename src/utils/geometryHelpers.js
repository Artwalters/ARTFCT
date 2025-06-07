import * as THREE from 'three'

// Helper function to sample points from multiple geometries
export function sampleMultipleGeometriesToPoints(geometries, targetCount, scale = 1) {
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
export function sampleGeometryToPoints(geometry, targetCount, scale = 1) {
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