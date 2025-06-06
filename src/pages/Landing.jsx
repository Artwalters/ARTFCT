import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <>
      <Header />
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        color: 'white',
        fontSize: '24px',
        fontFamily: 'monospace',
        gap: '40px'
      }}>
        <h1 style={{ margin: 0 }}>ARTFCT</h1>
        <button 
          onClick={() => navigate('/projects')}
          style={{
            padding: '15px 40px',
            fontSize: '18px',
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
    </>
  )
}