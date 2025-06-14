import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { projects } from '../data/projects'
import '../styles/pages/project-detail.css'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const project = projects[projectId]

  useEffect(() => {
    window.scrollTo(0, 0)
    // Add class to identify project detail page for CSS
    document.body.classList.add('project-detail-page')
    // Set normal scrollable layout for project detail pages
    document.body.style.background = '#000'
    document.body.style.position = 'static'
    document.body.style.overflow = 'auto'
    document.body.style.width = 'auto'
    document.body.style.height = 'auto'
    
    // Cleanup when component unmounts
    return () => {
      document.body.classList.remove('project-detail-page')
      document.body.style.position = ''
      document.body.style.overflow = ''
      document.body.style.width = ''
      document.body.style.height = ''
    }
  }, [])

  if (!project) {
    return (
      <div className="project-page">
        <div className="container">
          <h1>Project not found</h1>
          <Link to="/projects" className="back-link">← Back to projects</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="project-page">
      <div className="project-hero">
        <Link to="/projects" className="back-link">← Back to Projects</Link>
        <h1 className="project-name" style={{ color: project.color }}>{project.name}</h1>
        <h2 className="project-title">{project.title}</h2>
        <p className="project-description">{project.description}</p>
      </div>

      <div className="project-info">
        <div className="info-item">
          <span className="label">Year</span>
          <span className="value">{project.year}</span>
        </div>
        <div className="info-item">
          <span className="label">Role</span>
          <span className="value">{project.role}</span>
        </div>
      </div>

      <div className="project-details">
        <h3>Project Details</h3>
        <ul>
          {project.details.map((detail, index) => (
            <li key={index}>{detail}</li>
          ))}
        </ul>
      </div>

      <div className="project-images">
        {project.images.map((image, index) => (
          <div key={index} className="image-placeholder">
            <span>Image {index + 1}</span>
          </div>
        ))}
      </div>

      <div className="project-nav">
        <Link to="/projects" className="nav-button">View All Projects</Link>
      </div>
    </div>
  )
}