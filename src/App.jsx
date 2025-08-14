import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SocialLinks from './components/SocialLinks'
import ScrollManager from "./components/ScrollManager";
import Admin from './pages/Admin';
import RequireAuth from './components/RequireAuth'
import PreloadAboutImages from './components/PreloadAboutImages';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <PreloadAboutImages /> {/* mount once */}
      <main className="flex-1">
        <Outlet />
      </main>
      <SocialLinks />
      <Footer />
    </div>
  );
}
