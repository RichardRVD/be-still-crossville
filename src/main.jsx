// src/main.jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './styles/index.css'

import App from './App'

// pages
import Home from './pages/Home'
import Tours from './pages/Tours'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Admin from './pages/Admin'

// auth gate
import RequireAuth from './components/RequireAuth'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'tours', element: <Tours /> },
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
      { path: 'login', element: <Login /> },
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <Admin />
          </RequireAuth>
        ),
      },
      { path: '*', element: <Home /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  </React.StrictMode>
)