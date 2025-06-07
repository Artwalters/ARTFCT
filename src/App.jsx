import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Welcome from './pages/Welcome'
import Landing from './pages/Landing'
import ProjectsOverview from './pages/ProjectsOverview'
import ProjectDetail from './pages/ProjectDetail'
import LogoParticles from './pages/LogoParticles'

function AppContent() {
  const location = useLocation()
  
  useEffect(() => {
    // Mobile detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      // Set mobile-specific CSS
      document.documentElement.style.setProperty('--mobile-device', '1')
    }
  }, [])
  
  useEffect(() => {
    // Hide any lingering canvases when on project pages
    if (location.pathname.includes('/project/')) {
      document.body.style.overflow = 'auto'
      // Hide canvases
      const canvases = document.querySelectorAll('canvas')
      canvases.forEach(canvas => {
        canvas.style.display = 'none'
      })
    } else {
      document.body.style.overflow = 'hidden'
      const canvases = document.querySelectorAll('canvas')
      canvases.forEach(canvas => {
        canvas.style.display = 'block'
      })
    }
  }, [location])
  
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/intro" element={<Landing />} />
      <Route path="/projects" element={<ProjectsOverview />} />
      <Route path="/project/:projectId" element={<ProjectDetail />} />
      <Route path="/logoparticles" element={<LogoParticles />} />
    </Routes>
  )
}

export default function App() {
  // Get base path from package.json homepage or default to '/'
  const basename = import.meta.env.BASE_URL || '/'
  
  return (
    <Router basename={basename}>
      <AppContent />
    </Router>
  )
}