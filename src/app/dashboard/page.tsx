"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Globe, Shield, FileImage } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to GhostHound</h1>
        <p className="text-muted-foreground mt-2">
          Select a tool to begin your OSINT investigation
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/dashboard/sherlock">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <Search className="h-12 w-12 text-primary mb-2" />
              <CardTitle>Sherlock</CardTitle>
              <CardDescription>
                Search usernames across 20+ social media platforms
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/domain">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <Globe className="h-12 w-12 text-primary mb-2" />
              <CardTitle>Domain Analysis</CardTitle>
              <CardDescription>
                WHOIS, DNS, geolocation, and port scanning
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/breach">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-2" />
              <CardTitle>Data Breach</CardTitle>
              <CardDescription>
                Check if emails or usernames are compromised
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/exif">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <FileImage className="h-12 w-12 text-primary mb-2" />
              <CardTitle>EXIF Extractor</CardTitle>
              <CardDescription>
                Extract metadata from images locally
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
