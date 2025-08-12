import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SocialLinks from './components/SocialLinks'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <SocialLinks /> {/* <- Now appears above footer */}
      <Footer />
    </div>
  );
}
