// Code characters used for particle effects
export const CODE_CHARACTERS = [
    '[', ']', '{', '}', '(', ')', '<', '>', '/', '\\', 
    ':', ';', ',', '.', '*', '!', '?', '@', '#', '$',
    '%', '^', '&', '=', '+', '-', '_', '|', '~', '"',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D'
]

// VS Code color theme for characters
export const getVSCodeColor = (char) => {
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