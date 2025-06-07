// Particle Scene Vertex Shader
export const particleVertexShader = `
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

// Particle Scene Fragment Shader
export const particleFragmentShader = `
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