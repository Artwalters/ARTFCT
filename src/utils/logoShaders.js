// Logo Particle Scene Vertex Shader - Customizable version
export const logoVertexShader = `
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
    uniform vec3 uMousePosition;
    uniform vec3 uMouseVelocity;
    uniform float uMouseInfluence;
    uniform float uIsGrabbing;
    uniform float uMagneticForce;
    
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
        
        // Use the position attribute directly (updated by JavaScript physics)
        vec3 morphedPosition = position;
        
        // Store world position
        vWorldPosition = morphedPosition;
        
        // SUBTLE: Natural particle movement - very gentle
        float timeOffset = uTime + aRandom * 6.28318;
        morphedPosition.x += sin(timeOffset * 0.3) * 0.005; // Much smaller movement for physics
        morphedPosition.y += cos(timeOffset * 0.4) * 0.005;
        
        
        // NO ROTATION - model stays still
        // morphedPosition remains as is
        
        vec4 mvPosition = modelViewMatrix * vec4(morphedPosition, 1.0);
        
        // CUSTOMIZABLE: Particle size calculation - 20% larger
        float baseSize = 0.36; // 20% larger: 0.3 * 1.2 = 0.36
        // Calculate distance from center for size variation
        float distanceFromCenter = length(morphedPosition);
        float normalizedDistance = smoothstep(0.0, 6.0, distanceFromCenter); // 0 = center, 1 = edge
        
        // Invert for size: closer to center = larger particles
        float distanceBasedSize = 1.5 - normalizedDistance * 1.3; // Range: 1.5 (center) to 0.2 (edge)
        
        // Add some randomness but keep the distance-based trend
        float randomVariation = 0.8 + aRandom * 0.4; // Small random factor
        float sizeVariation = distanceBasedSize * randomVariation;
        
        float centerBoost = 1.0 - smoothstep(0.0, 3.0, length(morphedPosition.xy));
        float size = baseSize * sizeVariation * (1.0 + centerBoost * 0.2);
        
        // Make border particles slightly larger for clarity
        if (length(morphedPosition) > 5.0) {
            size *= 1.3;
        }
        
        gl_PointSize = size * (242.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`

// Logo Particle Scene Fragment Shader - Customizable version
export const logoFragmentShader = `
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
        // Character from atlas
        float col = mod(vCharIndex, uAtlasColumns);
        float row = floor(vCharIndex / uAtlasColumns);
        
        vec2 cellUV = vec2(
            (col + gl_PointCoord.x) / uAtlasColumns,
            1.0 - (row + 1.0 - gl_PointCoord.y) / uAtlasRows
        );
        
        vec4 charColor = texture2D(uCharAtlas, cellUV);
        
        // Higher threshold for better contrast
        if (charColor.r < 0.3 && charColor.g < 0.3 && charColor.b < 0.3) {
            discard;
        }
        
        // CUSTOMIZABLE: Color zones
        vec3 zoneColor;
        float distFromCenter = length(vWorldPosition.xy);
        float maxDist = max(max(abs(vWorldPosition.x), abs(vWorldPosition.y)), abs(vWorldPosition.z));
        float radialDist = length(vWorldPosition);
        
        // CUSTOMIZABLE: Change border detection thresholds - tighter for better definition
        float borderThreshold = 4.5;
        float radialThreshold = 5.0;
        
        if (maxDist > borderThreshold || radialDist > radialThreshold) {
            // CUSTOMIZABLE: Change border color
            zoneColor = vec3(1.0, 1.0, 1.0); // White border
            // Alternative: Use glow color for borders
            // zoneColor = uGlowColor;
        } else {
            // CUSTOMIZABLE: Change inner particle colors
            zoneColor = charColor.rgb;
            // Alternative: Tint with glow color
            // zoneColor = mix(charColor.rgb, uGlowColor, 0.3);
        }
        
        // STRONG FLICKER EFFECT: Like the original
        float randomSpeed1 = 1.0 + vRandom * 4.0;
        float randomSpeed2 = 2.0 + mod(vRandom * 7.0, 5.0);
        float randomSpeed3 = 3.0 + mod(vRandom * 11.0, 8.0);
        
        float flicker1 = sin(uTime * randomSpeed1 + vRandom * 17.3) * 0.5 + 0.5;
        float flicker2 = sin(uTime * randomSpeed2 + vRandom * 23.7) * 0.5 + 0.5;
        float flicker3 = sin(uTime * randomSpeed3 + vRandom * 31.4) * 0.5 + 0.5;
        
        // Strong flicker combination - more dramatic than before
        float combinedFlicker = flicker1 * 0.4 + flicker2 * 0.3 + flicker3 * 0.3;
        float flickerAmount = 0.3 + combinedFlicker * 0.7; // Much more variation: 0.3 to 1.0
        
        // Add extra random flicker for more dramatic effect
        float extraFlicker = sin(uTime * 5.0 + vRandom * 25.0) * 0.2 + 0.8;
        flickerAmount *= extraFlicker;
        
        // No flicker on borders for clarity
        if (maxDist > borderThreshold || radialDist > radialThreshold) {
            flickerAmount = 1.0;
        }
        
        // Final color
        vec3 finalColor = zoneColor * flickerAmount;
        
        // CUSTOMIZABLE: Glow intensity
        finalColor *= 1.2;
        
        // Add brightness variation based on distance from center
        float centerBrightness = 1.0 - smoothstep(0.0, 6.0, length(vWorldPosition));
        finalColor *= (1.0 + centerBrightness * 0.3);
        
        // CUSTOMIZABLE: Add color effects
        // Example: Rainbow effect based on position
        // float hue = atan(vWorldPosition.y, vWorldPosition.x) / (2.0 * 3.14159) + 0.5;
        // vec3 rainbow = vec3(
        //     abs(hue * 6.0 - 3.0) - 1.0,
        //     2.0 - abs(hue * 6.0 - 2.0),
        //     2.0 - abs(hue * 6.0 - 4.0)
        // );
        // finalColor = mix(finalColor, rainbow, 0.5);
        
        float finalAlpha = charColor.a * flickerAmount;
        
        gl_FragColor = vec4(finalColor, finalAlpha);
    }
`