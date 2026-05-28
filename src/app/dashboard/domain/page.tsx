"use client";

import { useState } from "react";
import { Globe, MapPin, Server, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface DNSRecord {
  type: string;
  value: string;
}

interface GeolocationData {
  ip: string;
  lat: number;
  lon: number;
  city: string;
  country: string;
  isp: string;
  asn: string;
}

interface PortData {
  port: number;
  service: string;
  banner?: string;
}

interface DomainResult {
  target: string;
  whois?: any;
  dns: DNSRecord[];
  geolocation?: GeolocationData;
  ports?: PortData[];
}

export default function DomainPage() {
  const { toast } = useToast();
  const [target, setTarget] = useState("");
  const [result, setResult] = useState<DomainResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!target) return;

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/tools/domain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Analysis failed");
      }

      setResult(data.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analisi fallita";
      toast({ title: "Errore", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Domain Analysis</h1>
        <p className="text-muted-foreground mt-2">
          WHOIS, DNS, geolocation, and port scanning
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analyze Domain/IP</CardTitle>
          <CardDescription>Enter a domain or IP address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="example.com or 8.8.8.8"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? "Analyzing..." : <Globe className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Results for {result.target}</h2>
            <Button
              variant="outline"
              onClick={() => {
                const data = JSON.stringify(result, null, 2);
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `domain-${target}.json`;
                a.click();
              }}
            >
              Export JSON
            </Button>
          </div>

          {result.dns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  DNS Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.dns.map((record, index) => (
                    <div key={index} className="flex gap-2 text-sm">
                      <span className="font-semibold text-primary w-12">
                        {record.type}
                      </span>
                      <span className="text-muted-foreground">{record.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.geolocation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Geolocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">IP Address</div>
                    <div className="font-semibold">{result.geolocation.ip}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Location</div>
                    <div className="font-semibold">
                      {result.geolocation.city}, {result.geolocation.country}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">ISP</div>
                    <div className="font-semibold">{result.geolocation.isp}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">ASN</div>
                    <div className="font-semibold">{result.geolocation.asn}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Coordinates</div>
                    <div className="font-semibold">
                      {result.geolocation.lat}, {result.geolocation.lon}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {result.ports && result.ports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Open Ports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.ports.map((port, index) => (
                    <div key={index} className="flex gap-4 text-sm">
                      <span className="font-semibold text-primary w-16">
                        {port.port}
                      </span>
                      <span className="text-muted-foreground">{port.service}</span>
                      {port.banner && (
                        <span className="text-xs text-muted-foreground">
                          {port.banner}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
