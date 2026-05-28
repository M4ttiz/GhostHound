import axios from "axios";
import crypto from "crypto";

export interface BreachData {
  name: string;
  breachDate: string;
  compromisedData: string[];
  description: string;
}

function hashPassword(password: string): string {
  return crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
}

async function checkHaveIBeenPwned(email: string): Promise<BreachData[]> {
  try {
    const emailHash = hashPassword(email);
    const prefix = emailHash.substring(0, 5);
    const suffix = emailHash.substring(5);

    const response = await axios.get(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          "User-Agent": "GhostHound",
        },
        timeout: 10000,
      }
    );

    const data = response.data;
    const lines = data.split("\n");

    for (const line of lines) {
      const [hashSuffix, count] = line.split(":");
      if (hashSuffix === suffix) {
        return [
          {
            name: "Have I Been Pwned",
            breachDate: new Date().toISOString(),
            compromisedData: ["Password"],
            description: "Password found in data breach",
          },
        ];
      }
    }

    return [];
  } catch (error) {
    console.error("HaveIBeenPwned error:", error);
    return [];
  }
}

async function checkXposedOrNot(email: string): Promise<BreachData[]> {
  try {
    const response = await axios.post(
      "https://api.xposedornot.com/v1/check-email",
      { email },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.breaches) {
      return response.data.breaches.map((breach: any) => ({
        name: breach.name || "Unknown",
        breachDate: breach.breachDate || new Date().toISOString(),
        compromisedData: breach.dataClasses || [],
        description: breach.description || "",
      }));
    }

    return [];
  } catch (error) {
    console.error("XposedOrNot error:", error);
    return [];
  }
}

export async function checkBreach(
  query: string,
  type: "email" | "username"
): Promise<BreachData[]> {
  if (type === "email") {
    const [hibpResults, xonResults] = await Promise.all([
      checkHaveIBeenPwned(query),
      checkXposedOrNot(query),
    ]);

    return [...hibpResults, ...xonResults];
  }

  return [];
}
