"use client";

import { useState } from "react";
import { Search, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SherlockResult {
  platform: string;
  url: string;
  found: boolean;
  avatar?: string;
}

export default function SherlockPage() {
  const [username, setUsername] = useState("");
  const [results, setResults] = useState<SherlockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!username) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/v1/tools/sherlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Search failed");
      }

      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const foundCount = results.filter((r) => r.found).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sherlock</h1>
        <p className="text-muted-foreground mt-2">
          Search usernames across 20+ social media platforms
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Username</CardTitle>
          <CardDescription>Enter a username to search across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {error && (
            <div className="mt-4 text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Results: {foundCount} / {results.length} found
            </h2>
            <Button
              variant="outline"
              onClick={() => {
                const data = JSON.stringify(results, null, 2);
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `sherlock-${username}.json`;
                a.click();
              }}
            >
              Export JSON
            </Button>
          </div>

          <div className="grid gap-3">
            {results.map((result) => (
              <Card
                key={result.platform}
                className={`${
                  result.found
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-border"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result.found ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-semibold">{result.platform}</div>
                        {result.found && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {result.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {result.found ? "Found" : "Not Found"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
