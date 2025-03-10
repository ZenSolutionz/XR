import ARComponent from './ARComponent';
import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <nav>
        <ul style={{ listStyle: 'none', display: 'flex', gap: '1rem' }}>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/xr">XR</Link></li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/xr" element={<XR />} />
      </Routes>
    </Router>
  )
}

function Home() {
  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome to our React application!</p>
    </div>
  )
}

function About() {
  return (
    <div>
      <h1>About Page</h1>
      <p>This is the about page of our application.</p>
    </div>
  )
}

function XR() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <h1 style={{ position: 'absolute', top: 20, left: 20, zIndex: 1, color: 'white' }}>XR Page
      </h1>
       
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100vh' }}>
        <ARComponent />
      </div>
    </div>
  );
}

export default App
