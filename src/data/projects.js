export const projects = {
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
      'img/hd/photo1.png',
      'img/hd/photo2.png',
      'img/hd/photo3.png',
      'img/hd/photo4.png',
      'img/hd/photo5.png'
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
      'img/mae/photo1.png',
      'img/mae/photo2.png',
      'img/mae/photo3.png'
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
      'img/omni/photo1.png',
      'img/omni/photo2.png',
      'img/omni/photo3.png'
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
      'img/walters/photo1.png',
      'img/walters/photo2.png',
      'img/walters/photo3.png'
    ]
  }
}

export const MODELS_3D = [
  { name: 'HD', path: './hd.glb', color: 0x00CED1, scale: 50.0, projectUrl: '/project/hd', projectId: 'hd' },
  { name: 'Mae', path: './mae.glb', color: 0xFF69B4, scale: 50.0, projectUrl: '/project/mae', projectId: 'mae' },
  { name: 'Omni', path: './omni.glb', color: 0xFFD700, scale: 50.0, projectUrl: '/project/omni', projectId: 'omni' },
  { name: 'Walters', path: './walters.glb', color: 0x32CD32, scale: 50.0, projectUrl: '/project/walters', projectId: 'walters' }
]