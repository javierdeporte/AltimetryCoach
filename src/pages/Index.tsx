
import { HeroSection } from "@/components/landing/hero-section";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-earth-50 to-primary-100 dark:from-mountain-900 dark:via-mountain-800 dark:to-primary-900">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Link to="/">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" className="text-mountain-700 dark:text-mountain-300">
              Iniciar sesión
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button className="bg-primary-600 hover:bg-primary-700 text-white">
              Comenzar
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-mountain-600 dark:text-mountain-400">
        <p>&copy; 2025 AltimetryCoach. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default Index;
