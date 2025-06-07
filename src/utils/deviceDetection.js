// Device detection utilities
export const isMobile = () => {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export const isTouchDevice = () => {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0)
}

export const isIOS = () => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export const isAndroid = () => {
    return /Android/i.test(navigator.userAgent)
}