import "./App.css";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { MusicLinks } from "./components/MusicLinks";
import { AboutSection } from "./components/AboutSection";
import { CollabContactSection } from "./components/CollabContactSection";
import { Footer } from "./components/Footer";

function App() {
  return (
    <div className="App" dir="rtl">
      <Header />
      <HeroSection />
      <MusicLinks />
      <AboutSection />
      <CollabContactSection />
      <Footer />
    </div>
  );
}

export default App;
