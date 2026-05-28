import Link from "next/link";
import { Shield, Search, Globe, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">GhostHound</h1>
          </div>
          <nav className="flex gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Register</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              OSINT Intelligence Platform
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Advanced tools for cybersecurity investigations, username tracking, domain analysis, and data breach detection.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="text-lg">
                  Get Started
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="text-lg">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <h3 className="text-3xl font-bold text-center mb-12">Powerful OSINT Tools</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors">
                <Search className="h-12 w-12 text-primary mb-4" />
                <h4 className="text-xl font-semibold mb-2">Sherlock</h4>
                <p className="text-muted-foreground">
                  Search usernames across 20+ social media platforms
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors">
                <Globe className="h-12 w-12 text-primary mb-4" />
                <h4 className="text-xl font-semibold mb-2">Domain Analysis</h4>
                <p className="text-muted-foreground">
                  WHOIS, DNS, geolocation, and port scanning
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h4 className="text-xl font-semibold mb-2">Data Breach</h4>
                <p className="text-muted-foreground">
                  Check if emails or usernames are compromised
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors">
                <FileImage className="h-12 w-12 text-primary mb-4" />
                <h4 className="text-xl font-semibold mb-2">EXIF Extractor</h4>
                <p className="text-muted-foreground">
                  Extract metadata from images locally
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 GhostHound. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
