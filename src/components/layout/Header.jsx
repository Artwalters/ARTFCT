import { useState, useEffect } from 'react'

export default function Header() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="header">
      {/* Top Left - Quick Navigation */}
      <div className="header-section top-left">
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </div>

      {/* Top Right - Local Time */}
      <div className="header-section top-right">
        {time.toLocaleTimeString()}
      </div>

      {/* Bottom Left - Social Media */}
      <div className="header-section bottom-left">
        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a>
        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>

      {/* Bottom Right - Extra Info */}
      <div className="header-section bottom-right">
        <span>© 2025</span>
      </div>
    </div>
  )
}