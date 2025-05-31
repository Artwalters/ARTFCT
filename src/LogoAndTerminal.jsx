import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function LogoAndTerminal({ onCameraZoomChange, onAnimationComplete }) {
    const { raycaster, mouse, camera } = useThree()
    const meshRef = useRef()
    const textureRef = useRef()
    const canvasRef = useRef()
    const contextRef = useRef()
    const startTimeRef = useRef(Date.now())
    
    // Logo animation state
    const [logoComplete, setLogoComplete] = useState(false)
    
    // Terminal state
    const [terminalContent, setTerminalContent] = useState([])
    const [currentCommand, setCurrentCommand] = useState('')
    const [cursorVisible, setCursorVisible] = useState(true)
    const [terminalTypingComplete, setTerminalTypingComplete] = useState(false)
    const [scrollOffset, setScrollOffset] = useState(0)
    const maxVisibleLines = useRef(0)
    const [terminalActive, setTerminalActive] = useState(false)
    const [typingContent, setTypingContent] = useState(null)
    const typingStartTime = useRef(0)
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 })
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [isHoveringEnter, setIsHoveringEnter] = useState(false)
    const [portfolioShown, setPortfolioShown] = useState(false)
    const [isTypingOut, setIsTypingOut] = useState(false)
    const [typingOutProgress, setTypingOutProgress] = useState(0)
    const typingOutStartTime = useRef(0)
    const [cameraZoom, setCameraZoom] = useState(0)
    const [startCameraZoom, setStartCameraZoom] = useState(false)
    const cameraZoomStartTime = useRef(0)
    const [contentCleared, setContentCleared] = useState(false)
    const buttonBounds = useRef({ x: 0, y: 0, width: 0, height: 0 })
    const [bracketAnimation, setBracketAnimation] = useState(0) // 0 to 1 for smooth animation
    const bracketAnimationRef = useRef(0)
    const backgroundBlueRef = useRef()
    const backgroundRedRef = useRef()
    
    // Logo ASCII art - same for all devices
    const logoLines = [
        '',
        ' ██████╗ ███╗   ██╗███████╗',
        '██╔═══██╗████╗  ██║██╔════╝',
        '██║   ██║██╔██╗ ██║█████╗  ',
        '██║   ██║██║╚██╗██║██╔══╝  ',
        '╚██████╔╝██║ ╚████║███████╗',
        ' ╚═════╝ ╚═╝  ╚═══╝╚══════╝',
        '███╗   ███╗ █████╗ ███╗   ██╗',
        '████╗ ████║██╔══██╗████╗  ██║',
        '██╔████╔██║███████║██╔██╗ ██║',
        '██║╚██╔╝██║██╔══██║██║╚██╗██║',
        '██║ ╚═╝ ██║██║  ██║██║ ╚████║',
        '╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝',
        ' █████╗ ██████╗ ███╗   ███╗██╗   ██╗',
        '██╔══██╗██╔══██╗████╗ ████║╚██╗ ██╔╝',
        '███████║██████╔╝██╔████╔██║ ╚████╔╝ ',
        '██╔══██║██╔══██╗██║╚██╔╝██║  ╚██╔╝  ',
        '██║  ██║██║  ██║██║ ╚═╝ ██║   ██║   ',
        '╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝   '
    ]
    
    // Terminal welcome messages
    const welcomeMessages = [
        '> Welcome to One Man Army Terminal v1.0',
        '> Type "help" for available commands',
        ''
    ]
    
    // Commands
    const commands = {
        help: [
            'Available commands:',
            '  about     - About me',
            '  skills    - Technical skills', 
            '  projects  - View projects',
            '  contact   - Contact information',
            '  clear     - Clear terminal'
        ],
        about: [
            'ONE MAN ARMY - Full Stack Developer',
            '',
            'I build end-to-end solutions single-handedly.',
            'From concept to deployment, I handle it all.'
        ],
        skills: [
            'Technical Skills:',
            '',
            'Frontend:  React, Three.js, TypeScript',
            'Backend:   Node.js, Python, PostgreSQL',
            'DevOps:    Docker, AWS, CI/CD'
        ],
        projects: [
            'Recent Projects:',
            '',
            '1. Neural Network Visualizer',
            '   - Real-time 3D visualization',
            '',
            '2. Distributed Task Queue', 
            '   - Microservices architecture'
        ],
        contact: [
            'Contact Information:',
            '',
            'Email:    contact@onemanarmy.dev',
            'GitHub:   github.com/onemanarmy'
        ]
    }
    
    // Handle window resize with responsive design
    useEffect(() => {
        const updateCanvasSize = () => {
            const vw = window.innerWidth
            const vh = window.innerHeight
            
            // Responsive breakpoints
            let padding, maxWidth, maxHeight
            
            if (vw <= 480) {
                // Mobile phone - minimal padding for maximum terminal
                padding = 5
                maxWidth = vw - (padding * 2)
                maxHeight = vh - (padding * 2)
            } else if (vw <= 768) {
                // Tablet portrait
                padding = 40
                maxWidth = vw - (padding * 2)
                maxHeight = vh - (padding * 2)
            } else if (vw <= 1024) {
                // Tablet landscape / small desktop
                padding = 60
                maxWidth = Math.min(vw - (padding * 2), 900)
                maxHeight = Math.min(vh - (padding * 2), 700)
            } else {
                // Desktop
                padding = 80
                maxWidth = Math.min(vw - (padding * 2), 1200)
                maxHeight = Math.min(vh - (padding * 2), 800)
            }
            
            setCanvasSize({ 
                width: Math.max(320, maxWidth), 
                height: Math.max(400, maxHeight) 
            })
        }
        
        updateCanvasSize()
        window.addEventListener('resize', updateCanvasSize)
        return () => window.removeEventListener('resize', updateCanvasSize)
    }, [])
    
    // Helper function to handle enter press
    const handleEnterPress = () => {
        if (portfolioShown) return // Already shown
        
        setPortfolioShown(true)
        
        // Start typing out animation
        setIsTypingOut(true)
        typingOutStartTime.current = Date.now()
        
        // Start subtle zoom out immediately when typing out starts
        setStartCameraZoom(true)
        cameraZoomStartTime.current = Date.now()
        
        // After typing out completes, clear content
        setTimeout(() => {
            setTerminalContent([])
            setIsTypingOut(false)
            // Mark content as permanently cleared
            setContentCleared(true)
        }, 3000) // Wait for typing out animation (1000ms phase1 + 2000ms phase2)
    }
    
    // Create texture
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = canvasSize.width
        canvas.height = canvasSize.height
        canvasRef.current = canvas
        contextRef.current = canvas.getContext('2d')
        
        const tex = new THREE.CanvasTexture(canvas)
        textureRef.current = tex
        return tex
    }, [canvasSize])
    
    
    // Handle click to activate terminal and mobile input
    useEffect(() => {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
        
        const handleClick = () => {
            if (!terminalActive) {
                setTerminalActive(true)
            }
            
            // Always focus hidden input on mobile when terminal is active
            if (isMobile && terminalActive) {
                const hiddenInput = document.getElementById('mobile-input')
                if (hiddenInput) {
                    hiddenInput.focus()
                }
            }
        }
        
        const handleTouch = () => {
            if (!terminalActive) {
                setTerminalActive(true)
            }
            
            // Focus hidden input on touch to trigger virtual keyboard
            const hiddenInput = document.getElementById('mobile-input')
            if (hiddenInput) {
                setTimeout(() => hiddenInput.focus(), 100)
            }
        }
        
        window.addEventListener('click', handleClick)
        if (isMobile) {
            window.addEventListener('touchstart', handleTouch)
        }
        
        return () => {
            window.removeEventListener('click', handleClick)
            if (isMobile) {
                window.removeEventListener('touchstart', handleTouch)
            }
        }
    }, [terminalActive])
    
    // Track mouse for parallax effect
    useEffect(() => {
        const handleMouseMove = (e) => {
            const x = (e.clientX / window.innerWidth) * 2 - 1
            const y = -(e.clientY / window.innerHeight) * 2 + 1
            setMousePosition({ x, y })
        }
        
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])
    
    // Handle keyboard input for desktop and mobile
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Always allow typing, activate terminal if not active
            if (!terminalActive) {
                setTerminalActive(true)
            }
            
            if (e.key === 'Enter') {
                if (!typingContent) {
                    const cmd = currentCommand.trim().toLowerCase()
                    
                    if (cmd === 'clear') {
                        setTerminalContent([])
                        setScrollOffset(0)
                    } else {
                        // Add command to terminal content immediately
                        setTerminalContent(prev => [...prev, `> ${currentCommand}`])
                        
                        // Set up typing animation for response
                        let responseLines = []
                        if (commands[cmd]) {
                            responseLines = [...commands[cmd], '']
                        } else {
                            responseLines = [`Command not found: ${cmd}`, '']
                        }
                        
                        setTypingContent({
                            lines: responseLines,
                            currentLine: 0,
                            currentChar: 0
                        })
                        typingStartTime.current = Date.now()
                    }
                    
                    setCurrentCommand('')
                    // Auto-scroll to bottom
                    setScrollOffset(0)
                }
            } else if (e.key === 'Backspace') {
                setCurrentCommand(prev => prev.slice(0, -1))
            } else if (e.key.length === 1) {
                setCurrentCommand(prev => prev + e.key)
            }
        }
        
        // Mobile input handler
        const handleMobileInput = (e) => {
            const value = e.target.value
            const lastChar = value[value.length - 1]
            
            if (value.length > currentCommand.length && lastChar) {
                // Character added
                setCurrentCommand(prev => prev + lastChar)
                if (!terminalActive) {
                    setTerminalActive(true)
                }
            } else if (value.length < currentCommand.length) {
                // Character removed (backspace)
                setCurrentCommand(prev => prev.slice(0, -1))
            }
            
            // Clear the hidden input to allow continuous typing
            setTimeout(() => {
                e.target.value = ''
            }, 0)
        }
        
        // Mobile enter handler
        const handleMobileEnter = (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                if (!typingContent) {
                    const cmd = currentCommand.trim().toLowerCase()
                    
                    if (cmd === 'clear') {
                        setTerminalContent([])
                        setScrollOffset(0)
                    } else {
                        setTerminalContent(prev => [...prev, `> ${currentCommand}`])
                        
                        let responseLines = []
                        if (commands[cmd]) {
                            responseLines = [...commands[cmd], '']
                        } else {
                            responseLines = [`Command not found: ${cmd}`, '']
                        }
                        
                        setTypingContent({
                            lines: responseLines,
                            currentLine: 0,
                            currentChar: 0
                        })
                        typingStartTime.current = Date.now()
                    }
                    
                    setCurrentCommand('')
                    setScrollOffset(0)
                }
                e.preventDefault()
            }
        }
        
        // Add event listeners
        window.addEventListener('keydown', handleKeyPress)
        
        const mobileInput = document.getElementById('mobile-input')
        if (mobileInput) {
            mobileInput.addEventListener('input', handleMobileInput)
            mobileInput.addEventListener('keydown', handleMobileEnter)
        }
        
        return () => {
            window.removeEventListener('keydown', handleKeyPress)
            if (mobileInput) {
                mobileInput.removeEventListener('input', handleMobileInput)
                mobileInput.removeEventListener('keydown', handleMobileEnter)
            }
        }
    }, [currentCommand, terminalContent, terminalActive, typingContent, terminalTypingComplete, portfolioShown, handleEnterPress])
    
    // Handle scroll
    useEffect(() => {
        const handleScroll = (e) => {
            if (!terminalActive) return
            
            if (e.deltaY > 0) {
                // Scroll down
                setScrollOffset(prev => Math.max(0, prev - 1))
            } else if (e.deltaY < 0) {
                // Scroll up
                const totalLines = logoLines.length + 2 + welcomeMessages.length + terminalContent.length + 2 // +2 for input line
                const maxScroll = Math.max(0, totalLines - (maxVisibleLines.current || 20))
                setScrollOffset(prev => Math.min(maxScroll, prev + 1))
            }
        }
        
        window.addEventListener('wheel', handleScroll)
        return () => window.removeEventListener('wheel', handleScroll)
    }, [terminalActive, terminalContent])
    
    // Cursor blink
    useEffect(() => {
        const interval = setInterval(() => {
            setCursorVisible(prev => !prev)
        }, 500)
        return () => clearInterval(interval)
    }, [])
    
    // Animation logic
    useFrame(() => {
        const ctx = contextRef.current
        const canvas = canvasRef.current
        if (!ctx || !canvas) return
        
        const elapsed = Date.now() - startTimeRef.current
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Responsive font sizes and spacing
        const vw = window.innerWidth
        let fontSize, logoFontSize, headerFontSize, terminalPadding
        
        if (vw <= 480) {
            // Mobile - much smaller logo
            fontSize = Math.max(14, Math.floor(canvas.width / 25))
            logoFontSize = Math.max(6, Math.floor(canvas.width / 50)) // Much smaller for mobile
            headerFontSize = Math.max(12, Math.floor(canvas.width / 30))
            terminalPadding = 4 // 50% less padding on mobile
        } else if (vw <= 768) {
            // Tablet - moderately smaller logo
            fontSize = Math.max(16, Math.floor(canvas.width / 30))
            logoFontSize = Math.max(8, Math.floor(canvas.width / 45)) // Smaller for tablet
            headerFontSize = Math.max(14, Math.floor(canvas.width / 35))
            terminalPadding = 25
        } else {
            // Desktop - full size
            const scale = Math.min(canvas.width / 1200, canvas.height / 800)
            fontSize = Math.max(18, Math.floor(22 * scale))
            logoFontSize = Math.max(10, Math.floor(13 * scale))
            headerFontSize = Math.max(14, Math.floor(18 * scale))
            terminalPadding = 40
        }
        
        const lineHeight = fontSize + 4
        const logoLineHeight = logoFontSize + 4
        const headerHeight = Math.max(25, headerFontSize + 12)
        
        // Calculate terminal size with responsive padding
        const terminalWidth = canvas.width - (terminalPadding * 2)
        const terminalHeight = canvas.height - (terminalPadding * 2)
        
        // Center the terminal
        const borderX = (canvas.width - terminalWidth) / 2
        const borderY = (canvas.height - terminalHeight) / 2
        const borderWidth = terminalWidth
        const borderHeight = terminalHeight
        
        // Draw terminal border (always visible)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.strokeRect(borderX, borderY, borderWidth, borderHeight)
        
        
        // Draw header bar (always visible)
        ctx.beginPath()
        ctx.moveTo(borderX, borderY + headerHeight)
        ctx.lineTo(borderX + borderWidth, borderY + headerHeight)
        ctx.stroke()
        
        // Social media links and date (always visible)
        ctx.fillStyle = '#888888'
        ctx.font = `${headerFontSize}px "Courier New", Courier, monospace`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        const socialY = borderY + headerHeight / 2
        ctx.fillText('[GITHUB] [LINKEDIN] [TWITTER]', borderX + 15, socialY)
        
        // Date and time (right side)
        const now = new Date()
        const timeString = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
        const dayString = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
        const dateString = `${dayString} ${timeString}`
        ctx.textAlign = 'right'
        ctx.fillText(dateString, borderX + borderWidth - 15, socialY)
        
        // Reset text alignment
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        
        // Helper function to wrap text
        const wrapText = (text, maxWidth, font) => {
            ctx.font = font
            const words = text.split(' ')
            const lines = []
            let currentLine = ''
            
            for (let word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word
                const metrics = ctx.measureText(testLine)
                
                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine)
                    currentLine = word
                } else {
                    currentLine = testLine
                }
            }
            
            if (currentLine) {
                lines.push(currentLine)
            }
            
            return lines.length > 0 ? lines : ['']
        }
        
        // LOGO ANIMATION
        const logoCharDelay = 10 // 2x faster (was 20)
        const logoLineDelay = 100 // 2x faster (was 200)
        let logoComplete = false
        
        // Calculate logo animation
        let totalElapsedTime = 0
        let targetLine = 0
        let targetChar = 0
        let found = false
        
        for (let i = 0; i < logoLines.length && !found; i++) {
            const lineLength = logoLines[i].length
            const lineTime = lineLength * logoCharDelay + logoLineDelay
            
            if (elapsed <= totalElapsedTime + lineTime) {
                targetLine = i
                const timeInLine = elapsed - totalElapsedTime
                targetChar = Math.min(Math.floor(timeInLine / logoCharDelay), lineLength)
                found = true
            }
            
            totalElapsedTime += lineTime
        }
        
        if (!found) {
            targetLine = logoLines.length - 1
            targetChar = logoLines[logoLines.length - 1].length
            logoComplete = true
            if (!logoComplete) setLogoComplete(true)
        }
        
        // TERMINAL CONTENT - Always render in scrollable area
        const terminalElapsed = logoComplete ? elapsed - totalElapsedTime - 500 : 0
        
        // Button typing animation
        let buttonDisplayText = ''
        if (logoComplete) {
            const buttonDelay = 200 // Start typing button after logo
            const buttonElapsed = elapsed - totalElapsedTime - buttonDelay
            if (buttonElapsed > 0) {
                const buttonText = '[ ENTER TO PORTFOLIO ]'
                const buttonCharDelay = 50
                const charsToShow = Math.min(
                    Math.floor(buttonElapsed / buttonCharDelay),
                    buttonText.length
                )
                buttonDisplayText = buttonText.substring(0, charsToShow)
            }
        }
        
        // Calculate visible area (leave space for input line)
        const actualContentStartY = borderY + headerHeight + 10
        const contentAreaHeight = borderHeight - headerHeight - 20 // Leave padding at bottom
        const visibleLinesContent = Math.floor(contentAreaHeight / lineHeight)
        maxVisibleLines.current = Math.max(10, visibleLinesContent) // Ensure minimum lines
        
        ctx.font = `${fontSize}px "Courier New", Courier, monospace`
        
        // Render all content in scrollable area
        ctx.save()
        ctx.beginPath()
        ctx.rect(borderX + 5, actualContentStartY, borderWidth - 10, contentAreaHeight) // Proper clip area
        ctx.clip()
        
        // Build content to display
        let displayLogoLines = []
        
        // Handle typing out animation - start from bottom, end with logo
        if (isTypingOut) {
            const typingOutElapsed = Date.now() - typingOutStartTime.current
            
            // Phase 1: Remove terminal content and welcome messages (faster)
            const phase1Duration = 1000 // 1 second for terminal content
            // Phase 2: Remove logo (slower)
            const phase2Duration = 2000 // 2 seconds for logo
            const totalDuration = phase1Duration + phase2Duration
            
            setTypingOutProgress(Math.min(typingOutElapsed / totalDuration, 1))
            
            if (typingOutElapsed < phase1Duration) {
                // Phase 1: Keep logo, remove other content gradually from bottom
                displayLogoLines = logoLines
                
                const phase1Progress = typingOutElapsed / phase1Duration
                // Don't remove welcome messages and terminal content in this phase
                // They will be handled in the allLines combination
            } else {
                // Phase 2: Remove logo after other content is gone
                const phase2Elapsed = typingOutElapsed - phase1Duration
                const phase2Progress = Math.min(phase2Elapsed / phase2Duration, 1)
                
                // Remove logo lines from bottom to top
                const totalLogoChars = logoLines.reduce((sum, line) => sum + line.length, 0)
                const charsToKeep = Math.floor((1 - phase2Progress) * totalLogoChars)
                let charCount = 0
                
                for (let i = 0; i < logoLines.length; i++) {
                    const line = logoLines[i]
                    if (charCount + line.length <= charsToKeep) {
                        displayLogoLines.push(line)
                        charCount += line.length
                    } else {
                        const keepChars = Math.max(0, charsToKeep - charCount)
                        displayLogoLines.push(line.substring(0, keepChars))
                        break
                    }
                }
            }
        } else if (logoComplete && !startCameraZoom && !contentCleared) {
            displayLogoLines = logoLines
        } else if (!contentCleared) {
            // Show logo animation progress only if content not cleared
            for (let i = 0; i <= targetLine && i < logoLines.length; i++) {
                if (i < targetLine) {
                    displayLogoLines.push(logoLines[i])
                } else {
                    displayLogoLines.push(logoLines[i].substring(0, targetChar))
                }
            }
        }
        
        // Build welcome messages to display
        let displayWelcomeMessages = []
        if (isTypingOut) {
            const typingOutElapsed = Date.now() - typingOutStartTime.current
            const phase1Duration = 1000 // Same as above
            
            if (typingOutElapsed < phase1Duration) {
                // Phase 1: Remove welcome messages from bottom up
                const phase1Progress = typingOutElapsed / phase1Duration
                const totalWelcomeChars = welcomeMessages.reduce((sum, line) => sum + line.length, 0)
                const charsToKeep = Math.floor((1 - phase1Progress) * totalWelcomeChars)
                let charCount = 0
                
                for (let i = 0; i < welcomeMessages.length; i++) {
                    const line = welcomeMessages[i]
                    if (charCount + line.length <= charsToKeep) {
                        displayWelcomeMessages.push(line)
                        charCount += line.length
                    } else {
                        const keepChars = Math.max(0, charsToKeep - charCount)
                        displayWelcomeMessages.push(line.substring(0, keepChars))
                        break
                    }
                }
            }
            // Phase 2: Welcome messages already gone
        } else if (terminalTypingComplete && !startCameraZoom && !contentCleared) {
            displayWelcomeMessages = welcomeMessages
        } else if (terminalElapsed > 0 && !contentCleared) {
            const termCharDelay = 30
            const termLineDelay = 200
            let totalChars = 0
            
            for (let i = 0; i < welcomeMessages.length; i++) {
                const line = welcomeMessages[i]
                const lineStartTime = totalChars * termCharDelay + i * termLineDelay
                
                if (terminalElapsed > lineStartTime) {
                    const charsToShow = Math.min(
                        Math.floor((terminalElapsed - lineStartTime) / termCharDelay),
                        line.length
                    )
                    displayWelcomeMessages.push(line.substring(0, charsToShow))
                    
                    if (charsToShow < line.length) break
                }
                totalChars += line.length
            }
            
            const totalTermTime = welcomeMessages.reduce((acc, line, i) => 
                acc + line.length * termCharDelay + termLineDelay, 0)
            
            if (terminalElapsed > totalTermTime) {
                setTerminalTypingComplete(true)
            }
        }
        
        // Handle typing animation for new content
        let displayContent = []
        if (isTypingOut) {
            const typingOutElapsed = Date.now() - typingOutStartTime.current
            const phase1Duration = 1000
            
            if (typingOutElapsed < phase1Duration) {
                // Phase 1: Remove terminal content from bottom up
                const phase1Progress = typingOutElapsed / phase1Duration
                const totalTerminalChars = terminalContent.reduce((sum, line) => sum + line.length, 0)
                const charsToKeep = Math.floor((1 - phase1Progress) * totalTerminalChars)
                let charCount = 0
                
                for (let i = 0; i < terminalContent.length; i++) {
                    const line = terminalContent[i]
                    if (charCount + line.length <= charsToKeep) {
                        displayContent.push(line)
                        charCount += line.length
                    } else {
                        const keepChars = Math.max(0, charsToKeep - charCount)
                        displayContent.push(line.substring(0, keepChars))
                        break
                    }
                }
            }
            // Phase 2: Terminal content already gone
        } else if (!contentCleared) {
            displayContent = [...terminalContent]
        }
        
        if (typingContent && !isTypingOut && !contentCleared) {
                        const elapsed = Date.now() - typingStartTime.current
                        const charDelay = 20
                        const lineDelay = 100
                        
                        let totalChars = 0
                        let completeLines = []
                        let currentLineText = ''
                        let allTypingComplete = true
                        
                        for (let i = 0; i < typingContent.lines.length; i++) {
                            const line = typingContent.lines[i]
                            const lineStartTime = totalChars * charDelay + i * lineDelay
                            
                            if (elapsed > lineStartTime) {
                                const charsToShow = Math.min(
                                    Math.floor((elapsed - lineStartTime) / charDelay),
                                    line.length
                                )
                                
                                if (charsToShow >= line.length) {
                                    completeLines.push(line)
                                } else {
                                    currentLineText = line.substring(0, charsToShow)
                                    allTypingComplete = false
                                    break
                                }
                            } else {
                                allTypingComplete = false
                                break
                            }
                            
                            totalChars += line.length
                        }
                        
                        if (allTypingComplete) {
                            setTerminalContent(prev => [...prev, ...typingContent.lines])
                            setTypingContent(null)
                            // Auto-scroll to bottom when typing completes
                            setScrollOffset(0)
                        } else {
                            displayContent = [...displayContent, ...completeLines]
                            if (currentLineText) {
                                displayContent.push(currentLineText)
                            }
                            // Auto-scroll to bottom while typing
                            setScrollOffset(0)
                        }
                    }
        
        // Calculate available width for text wrapping
        const availableWidth = borderWidth - 100 // Leave margin for text
        
        // Wrap long lines for responsive display
        const wrapLinesIfNeeded = (lines, font) => {
            const wrappedLines = []
            for (let line of lines) {
                if (line.includes('███') || line.includes('╗') || line.includes('║')) {
                    // Don't wrap ASCII art (logo)
                    wrappedLines.push(line)
                } else if (line.trim()) {
                    // Wrap regular text
                    const wrapped = wrapText(line, availableWidth, font)
                    wrappedLines.push(...wrapped)
                } else {
                    // Keep empty lines
                    wrappedLines.push(line)
                }
            }
            return wrappedLines
        }
        
        // Apply wrapping to content
        const regularFont = `${fontSize}px "Courier New", Courier, monospace`
        const wrappedWelcomeMessages = wrapLinesIfNeeded(displayWelcomeMessages, regularFont)
        const wrappedDisplayContent = wrapLinesIfNeeded(displayContent, regularFont)
        
        // Combine all lines for display including input line
        const inputLine = terminalActive ? `> ${currentCommand}` : '> Click to start typing...'
        const allLines = (isTypingOut || startCameraZoom || contentCleared) ? [
            ...displayLogoLines,
            '', '', // Spacing after logo
            ...wrappedWelcomeMessages
        ] : [
            ...displayLogoLines,
            '', // Spacing after logo
            '[ ENTER TO PORTFOLIO ]', // Always include button line for typing animation
            '', // Spacing after button
            ...wrappedWelcomeMessages,
            ...wrappedDisplayContent,
            '', // Empty line before input
            inputLine
        ]
        
        // Calculate which lines to show - if scrollOffset is 0, show the latest content
        let startLine, endLine
        if (scrollOffset === 0) {
            // Show latest content (bottom of terminal)
            // Calculate how many lines we can actually fit considering mixed line heights
            let heightUsed = 0
            let linesCanFit = 0
            for (let i = allLines.length - 1; i >= 0; i--) {
                const lineH = i < displayLogoLines.length ? logoLineHeight : lineHeight
                if (heightUsed + lineH > contentAreaHeight) break
                heightUsed += lineH
                linesCanFit++
            }
            endLine = allLines.length
            startLine = Math.max(0, endLine - linesCanFit)
        } else {
            // Show scrolled content - calculate properly with mixed line heights
            startLine = Math.max(0, allLines.length - scrollOffset - visibleLinesContent)
            
            // Calculate how many lines actually fit from startLine
            let heightUsed = 0
            let actualEndLine = startLine
            for (let i = startLine; i < allLines.length; i++) {
                const lineH = i < displayLogoLines.length ? logoLineHeight : lineHeight
                if (heightUsed + lineH > contentAreaHeight) break
                heightUsed += lineH
                actualEndLine = i + 1
            }
            endLine = actualEndLine
        }
        
        // Draw visible lines
        let lineIndex = 0
        const startX = borderX + 40
        
        let currentY = actualContentStartY
        for (let i = startLine; i < endLine; i++) {
            const line = allLines[i]
            const isInputLine = i === allLines.length - 1 // Check if this is the input line
            
            // Check if this is a logo line
            if (i < displayLogoLines.length) {
                ctx.fillStyle = '#ff8c69' // Orange/peach for logo
                ctx.font = `${logoFontSize}px "Courier New", Courier, monospace` // Smaller logo
                ctx.fillText(line, startX, currentY)
                ctx.font = `${fontSize}px "Courier New", Courier, monospace`
                currentY += logoLineHeight // Use logo line height
            } else if (line.startsWith('>')) {
                ctx.fillStyle = '#9cdcfe' // Light blue for prompt (VS Code style)
                ctx.fillText('> ', startX + 10, currentY)
                
                if (isInputLine) {
                    // This is the input line - handle cursor and typing
                    const inputText = line.substring(2)
                    if (terminalActive) {
                        ctx.fillStyle = '#d4d4d4' // Light gray for user input
                        ctx.fillText(currentCommand, startX + 30, currentY)
                        
                        if (cursorVisible) {
                            const cursorX = startX + 30 + ctx.measureText(currentCommand).width
                            ctx.fillStyle = '#9cdcfe' // Light blue cursor
                            ctx.fillText('_', cursorX, currentY)
                        }
                    } else {
                        ctx.fillStyle = '#6a6a6a' // Darker gray for hint text
                        ctx.fillText('Click to start typing...', startX + 30, currentY)
                    }
                } else {
                    ctx.fillStyle = '#d4d4d4' // Light gray for user input
                    ctx.fillText(line.substring(2), startX + 30, currentY)
                }
                currentY += lineHeight // Normal line height
            } else if (line.includes('not found')) {
                ctx.fillStyle = '#f44747' // Red for errors
                ctx.fillText(line, startX + 10, currentY)
                currentY += lineHeight
            } else if (line.includes('Available commands:') || line.includes('Technical Skills:') || line.includes('Recent Projects:') || line.includes('Contact Information:')) {
                ctx.fillStyle = '#dcdcaa' // Yellow/gold for headers
                ctx.fillText(line, startX + 10, currentY)
                currentY += lineHeight
            } else if (line.includes('Email:') || line.includes('GitHub:') || line.includes('Frontend:') || line.includes('Backend:') || line.includes('DevOps:')) {
                ctx.fillStyle = '#4ec9b0' // Teal for labels
                ctx.fillText(line, startX + 10, currentY)
                currentY += lineHeight
            } else if (line === '[ ENTER TO PORTFOLIO ]') {
                // Check if this is during typing animation
                const isButtonLine = i < displayLogoLines.length + 3 // Logo + 2 empty lines + button line
                
                if (isButtonLine && buttonDisplayText) {
                    // Only show button when fully typed
                    if (buttonDisplayText === '[ ENTER TO PORTFOLIO ]' && terminalTypingComplete && !portfolioShown && !isTypingOut) {
                        // Store bounds for click detection (invisible)
                        const textWidth = ctx.measureText(buttonDisplayText).width
                        buttonBounds.current = {
                            x: startX,
                            y: currentY,
                            width: textWidth,
                            height: fontSize
                        }
                        
                        // Draw text with smooth bracket animation at same position
                        ctx.fillStyle = '#ff8c69'
                        
                        // Smooth animation for brackets
                        const spaces = Math.floor(bracketAnimationRef.current * 2)
                        const padding = ' '.repeat(spaces)
                        const animatedText = `[${padding}ENTER TO PORTFOLIO${padding}]`
                        
                        // Draw at exact same position as typing animation
                        ctx.fillText(animatedText, startX, currentY)
                        
                        currentY += lineHeight
                    } else {
                        // During typing animation, just show the text - no bold
                        ctx.fillStyle = '#ff8c69'
                        ctx.fillText(buttonDisplayText, startX, currentY)
                        currentY += lineHeight
                    }
                } else {
                    // Skip if not the button line during animation
                    currentY += lineHeight
                }
            } else {
                ctx.fillStyle = '#d4d4d4' // Light gray for normal text
                ctx.fillText(line, startX + 10, currentY)
                currentY += lineHeight
            }
            lineIndex++
        }
        
        ctx.restore()
        
        // Draw scroll indicator and tiny scrollbar if needed
        const totalLines = allLines.length
        if (totalLines > visibleLinesContent) {
            // Text indicator (original)
            ctx.fillStyle = '#444444'
            ctx.font = '12px "Courier New", Courier, monospace'
            const scrollText = scrollOffset > 0 ? `[${scrollOffset} lines above]` : '[Scroll up to see history]'
            ctx.fillText(scrollText, borderX + borderWidth - 200, actualContentStartY - 10)
            ctx.font = `${fontSize}px "Courier New", Courier, monospace`
            
            // Tiny scrollbar as additional visual aid
            const scrollbarX = borderX + borderWidth - 8
            const scrollbarY = actualContentStartY
            const scrollbarHeight = contentAreaHeight - 20
            const scrollbarWidth = 2
            
            // Scrollbar track (very subtle)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
            ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight)
            
            // Calculate scrollbar thumb position and size
            const scrollableLines = totalLines - visibleLinesContent
            const scrollProgress = scrollOffset / scrollableLines
            const thumbHeight = Math.max(15, (visibleLinesContent / totalLines) * scrollbarHeight)
            const thumbY = scrollbarY + ((scrollbarHeight - thumbHeight) * scrollProgress)
            
            // Scrollbar thumb (very small)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
            ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight)
        }
        
        // Update texture
        textureRef.current.needsUpdate = true
        
        // Smooth bracket animation
        const targetBracket = isHoveringEnter ? 1 : 0
        bracketAnimationRef.current += (targetBracket - bracketAnimationRef.current) * 0.15
        if (Math.abs(bracketAnimationRef.current - targetBracket) > 0.001) {
            setBracketAnimation(bracketAnimationRef.current)
        }
        
        // Handle camera zoom animation with two phases
        if (startCameraZoom) {
            const zoomElapsed = Date.now() - cameraZoomStartTime.current
            const zoomOutDuration = 1800 // Zoom out during early typing animation
            const zoomInDuration = 2000 // Zoom in starts while text is still typing
            const totalDuration = zoomOutDuration + zoomInDuration
            
            if (zoomElapsed < zoomOutDuration) {
                // Phase 1: Subtle zoom out during typing animation
                const progress = zoomElapsed / zoomOutDuration
                // Smooth ease-in-out for zoom out
                const easedProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2
                const zoomOut = easedProgress * -1.5 // Subtle zoom out by 1.5 units
                
                if (onCameraZoomChange) onCameraZoomChange(zoomOut)
            } else {
                // Phase 2: Powerful zoom in while text is still typing
                const zoomInProgress = (zoomElapsed - zoomOutDuration) / zoomInDuration
                const clampedProgress = Math.min(zoomInProgress, 1)
                
                // Powerful easing function (ease-in-quart for strong acceleration)
                const easedProgress = clampedProgress < 0.5
                    ? 8 * Math.pow(clampedProgress, 4)  // Strong acceleration
                    : 1 - Math.pow(-2 * clampedProgress + 2, 4) / 2  // Smooth deceleration
                
                // Zoom from -1.5 to +12 (total 13.5 units of zoom for more impact)
                const zoom = -1.5 + (easedProgress * 13.5)
                
                if (onCameraZoomChange) onCameraZoomChange(zoom)
                
                // Check if animation is complete
                if (clampedProgress >= 1 && onAnimationComplete) {
                    onAnimationComplete()
                }
            }
        }
        
        // Animate background layers with more intense RGB split effect
        if (backgroundBlueRef.current) {
            // Blue layer moves more dramatically
            backgroundBlueRef.current.position.x = mousePosition.x * 0.15
            backgroundBlueRef.current.position.y = mousePosition.y * 0.1
        }
        
        if (backgroundRedRef.current) {
            // Red layer moves opposite direction with more offset
            backgroundRedRef.current.position.x = -mousePosition.x * 0.12
            backgroundRedRef.current.position.y = -mousePosition.y * 0.08
        }
    })
    
    // Calculate responsive plane size
    const planeWidth = (canvasSize.width / 1200) * 15
    const planeHeight = (canvasSize.height / 800) * 12
    
    return (
        <group>
            {/* Red background layer - furthest back */}
            <mesh 
                ref={backgroundRedRef}
                position={[-0.03, 0.02, -0.3]}
            >
                <planeGeometry args={[planeWidth, planeHeight]} />
                <meshBasicMaterial 
                    map={texture} 
                    transparent 
                    alphaTest={0.1}
                    color="#cc6666"
                    opacity={0.25}
                />
            </mesh>
            
            {/* Blue background layer - middle depth */}
            <mesh 
                ref={backgroundBlueRef}
                position={[0.02, -0.01, -0.2]}
            >
                <planeGeometry args={[planeWidth, planeHeight]} />
                <meshBasicMaterial 
                    map={texture} 
                    transparent 
                    alphaTest={0.1}
                    color="#6699cc"
                    opacity={0.3}
                />
            </mesh>
            
            {/* Main layer - full color on top */}
            <mesh 
                ref={meshRef}
                position={[0, 0, 0]}
                onPointerMove={(e) => {
                    // Check if we're hovering over the button area
                    if (terminalTypingComplete && !portfolioShown && !isTypingOut && !startCameraZoom && buttonBounds.current) {
                        // Convert UV coordinates to pixel coordinates
                        const x = e.uv.x * canvasSize.width
                        const y = (1 - e.uv.y) * canvasSize.height
                        
                        // Check if we're over the button using stored bounds
                        const bounds = buttonBounds.current
                        const isOverButton = x >= bounds.x && 
                                           x <= bounds.x + bounds.width && 
                                           y >= bounds.y && 
                                           y <= bounds.y + bounds.height
                        
                        setIsHoveringEnter(isOverButton)
                        document.body.style.cursor = isOverButton ? 'pointer' : 'default'
                    } else {
                        setIsHoveringEnter(false)
                        document.body.style.cursor = 'default'
                    }
                }}
                onPointerOut={() => {
                    setIsHoveringEnter(false)
                    document.body.style.cursor = 'default'
                }}
                onClick={(e) => {
                    if (!terminalActive) {
                        setTerminalActive(true)
                    } else if (terminalTypingComplete && !portfolioShown && !isTypingOut && !startCameraZoom && buttonBounds.current) {
                        // Convert UV coordinates to pixel coordinates
                        const x = e.uv.x * canvasSize.width
                        const y = (1 - e.uv.y) * canvasSize.height
                        
                        // Check if click is on button
                        const bounds = buttonBounds.current
                        const isOnButton = x >= bounds.x && 
                                         x <= bounds.x + bounds.width && 
                                         y >= bounds.y && 
                                         y <= bounds.y + bounds.height
                        
                        if (isOnButton) {
                            e.stopPropagation()
                            handleEnterPress()
                        }
                    }
                }}
            >
                <planeGeometry args={[planeWidth, planeHeight]} />
                <meshBasicMaterial 
                    map={texture} 
                    transparent 
                    alphaTest={0.1}
                />
            </mesh>
            
        </group>
    )
}