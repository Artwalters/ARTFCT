import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Welcome from './pages/Welcome'
import Landing from './pages/Landing'
import ProjectsOverview from './pages/ProjectsOverview'
import ProjectDetail from './pages/ProjectDetail'

function AppContent() {
  const location = useLocation()
  
  useEffect(() => {
    // Hide any lingering canvases when on project pages
    if (location.pathname.includes('/project/')) {
      document.body.style.overflow = 'auto'
      // Hide canvases
      const canvases = document.querySelectorAll('canvas')
      canvases.forEach(canvas => {
        canvas.style.display = 'none'
      })
      // Hide scroll wrapper
      const scrollWrapper = document.querySelector('.scroll-wrapper')
      if (scrollWrapper) {
        scrollWrapper.style.display = 'none'
      }
      // Hide scroll morph UI
      const scrollMorphUI = document.querySelector('.scroll-morph-ui')
      if (scrollMorphUI) {
        scrollMorphUI.style.display = 'none'
      }
    } else {
      document.body.style.overflow = 'hidden'
      const canvases = document.querySelectorAll('canvas')
      canvases.forEach(canvas => {
        canvas.style.display = 'block'
      })
      // Show scroll wrapper if on projects page
      if (location.pathname === '/projects') {
        const scrollWrapper = document.querySelector('.scroll-wrapper')
        if (scrollWrapper) {
          scrollWrapper.style.display = 'block'
        }
        const scrollMorphUI = document.querySelector('.scroll-morph-ui')
        if (scrollMorphUI) {
          scrollMorphUI.style.display = 'block'
        }
      }
    }
  }, [location])
  
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/intro" element={<Landing />} />
      <Route path="/projects" element={<ProjectsOverview />} />
      <Route path="/project/:projectId" element={<ProjectDetail />} />
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