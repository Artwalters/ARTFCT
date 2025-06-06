import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Welcome() {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Apply overflow hidden for this page
    document.body.style.overflow = 'hidden'
    
    // Fade in animation
    setTimeout(() => setIsVisible(true), 100)
    
    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000',
      color: 'white',
      fontFamily: 'monospace',
      padding: '20px',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 1s ease-in'
    }}>
      <h1 style={{
        fontSize: '72px',
        fontWeight: 'bold',
        margin: '0 0 20px 0',
        letterSpacing: '-3px',
        textAlign: 'center'
      }}>
        ARTFCT
      </h1>
      
      <p style={{
        fontSize: '20px',
        color: '#999',
        marginBottom: '60px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        Full Stack Creative Developer
      </p>

      <div style={{
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => navigate('/intro')}
          style={{
            padding: '15px 40px',
            fontSize: '16px',
            fontFamily: 'monospace',
            background: 'white',
            color: 'black',
            border: '2px solid white',
            borderRadius: '25px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'transparent'
            e.target.style.color = 'white'
            e.target.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white'
            e.target.style.color = 'black'
            e.target.style.transform = 'scale(1)'
          }}
        >
          Enter
        </button>

        <button
          onClick={() => navigate('/projects')}
          style={{
            padding: '15px 40px',
            fontSize: '16px',
            fontFamily: 'monospace',
            background: 'transparent',
            color: 'white',
            border: '2px solid white',
            borderRadius: '25px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'white'
            e.target.style.color = 'black'
            e.target.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent'
            e.target.style.color = 'white'
            e.target.style.transform = 'scale(1)'
          }}
        >
          View Projects
        </button>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '40px',
        display: 'flex',
        gap: '30px',
        fontSize: '14px',
        opacity: 0.6
      }}>
        <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Twitter</a>
        <a href="#" style={{ color: 'white', textDecoration: 'none' }}>LinkedIn</a>
        <a href="#" style={{ color: 'white', textDecoration: 'none' }}>GitHub</a>
      </div>
    </div>
  )
}