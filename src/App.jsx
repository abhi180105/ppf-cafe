// src/App.jsx
import { useState } from "react";
import { HelmetProvider } from 'react-helmet-async';
import { CafeProvider } from "./context/CafeContext.jsx";

import Home from "./pages/Home.jsx";
import Navbar from "./components/Navbar.jsx";
import BowlSidebar from "./components/BowlSidebar.jsx";
import SEO from "./components/SEO.jsx";

import "./App.css";

export default function App() {
  const [showBowl, setShowBowl] = useState(false);



  return (
    <HelmetProvider>
      <CafeProvider>

        <SEO />
        <Navbar onBowlClick={() => setShowBowl(true)} />
        <Home showBowl={showBowl} setShowBowl={setShowBowl} />
        <BowlSidebar isOpen={showBowl} onClose={() => setShowBowl(false)} />
      </CafeProvider>
    </HelmetProvider>
  );
}