import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

const projects = {
  hd: {
    name: 'HD',
    title: 'Minimal Design System',
    description: 'A clean and minimalist approach to digital experiences.',
    year: '2024',
    role: 'Creative Direction & 3D Design',
    color: '#00CED1',
    details: [
      'Conceptualization and creative direction',
      ' 3D modeling and animation',
      'Interactive particle system design',
      'WebGL implementation'
    ],
    images: [
      '/placeholder1.jpg',
      '/placeholder2.jpg',
      '/placeholder3.jpg'
    ]
  },
  mae: {
    name: 'Mae',
    title: 'Classic Elegance',
    description: 'Timeless design meets modern technology.',
    year: '2024',
    role: 'Art Direction & Development',
    color: '#FF69B4',
    details: [
      'Art direction and visual identity',
      'Motion design and choreography',
      'Technical implementation',
      'Performance optimization'
    ],
    images: [
      '/placeholder1.jpg',
      '/placeholder2.jpg',
      '/placeholder3.jpg'
    ]
  },
  omni: {
    name: 'Omni',
    title: 'Universal Form Language',
    description: 'Exploring the boundaries of digital morphology.',
    year: '2024',
    role: 'Design & Technical Lead',
    color: '#FFD700',
    details: [
      'Form exploration and research',
      'Generative design systems',
      'Real-time rendering pipeline',
      'User interaction design'
    ],
    images: [
      '/placeholder1.jpg',
      '/placeholder2.jpg',
      '/placeholder3.jpg'
    ]
  },
  walters: {
    name: 'Walters',
    title: 'Signature Collection',
    description: 'A curated collection of digital artifacts.',
    year: '2024',
    role: 'Full Stack Creative',
    color: '#32CD32',
    details: [
      'Creative concept development',
      'Full stack implementation',
      'Custom shader programming',
      'Cross-platform optimization'
    ],
    images: [
      '/placeholder1.jpg',
      '/placeholder2.jpg',
      '/placeholder3.jpg'
    ]
  }
}

export default function ProjectPage() {
  const { projectId } = useParams()
  const project = projects[projectId]

  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.style.background = '#000'
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