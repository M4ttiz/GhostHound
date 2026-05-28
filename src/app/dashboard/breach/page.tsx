"use client";

import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BreachData {
  name: string;
  breachDate: string;
  compromisedData: string[];
  description: string;
}

export default function BreachPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"email" | "username">("email");
  const [results, setResults] = useState<BreachData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!query) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/v1/tools/breach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Check failed");
      }

      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Breach</h1>
        <p className="text-muted-foreground mt-2">
          Check if emails or usernames are compromised
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check Breach</CardTitle>
          <CardDescription>Enter an email or username to check</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "email" | "username")}
                className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="email">Email</option>
                <option value="username">Username</option>
              </select>
              <Input
                placeholder={type === "email" ? "your@email.com" : "username"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCheck()}
              />
              <Button onClick={handleCheck} disabled={loading}>
                {loading ? "Checking..." : <Shield className="h-4 w-4" />}
              </Button>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {results.length} breach{results.length !== 1 ? "es" : ""} found
            </h2>
            <Button
              variant="outline"
              onClick={() => {
                const data = JSON.stringify(results, null, 2);
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `breach-${query}.json`;
                a.click();
              }}
            >
              Export JSON
            </Button>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-500">Security Advice</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Change your password immediately for any compromised services.
                  Enable two-factor authentication where possible.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {results.map((breach, index) => (
              <Card key={index} className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    {breach.name}
                  </CardTitle>
                  <CardDescription>
                    Breach date: {new Date(breach.breachDate).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-semibold mb-1">Compromised Data</div>
                      <div className="flex flex-wrap gap-2">
                        {breach.compromisedData.map((data, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded"
                          >
                            {data}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-1">Description</div>
                      <p className="text-sm text-muted-foreground">{breach.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && query && !loading && !error && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="font-semibold text-green-500">No Breaches Found</div>
                <p className="text-sm text-muted-foreground">
                  Good news! No data breaches were found for this {type}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
