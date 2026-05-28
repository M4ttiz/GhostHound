"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Search, Globe, FileImage, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import ProtectedRoute from "@/components/protected-route";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore logout API errors; clear client state regardless
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.replace("/auth/login");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex">
        <aside className="w-64 border-r border-border bg-card">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">GhostHound</h1>
            </div>

            <nav className="space-y-2">
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/sherlock">
                <Button variant="ghost" className="w-full justify-start">
                  <Search className="mr-2 h-4 w-4" />
                  Sherlock
                </Button>
              </Link>
              <Link href="/dashboard/domain">
                <Button variant="ghost" className="w-full justify-start">
                  <Globe className="mr-2 h-4 w-4" />
                  Domain Analysis
                </Button>
              </Link>
              <Link href="/dashboard/breach">
                <Button variant="ghost" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Data Breach
                </Button>
              </Link>
              <Link href="/dashboard/exif">
                <Button variant="ghost" className="w-full justify-start">
                  <FileImage className="mr-2 h-4 w-4" />
                  EXIF Extractor
                </Button>
              </Link>
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 w-64 p-6 border-t border-border bg-card">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start mt-2"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <header className="border-b border-border bg-card p-6">
            <h2 className="text-2xl font-bold">Dashboard</h2>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
