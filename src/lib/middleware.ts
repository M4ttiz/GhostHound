import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./auth";

export async function authMiddleware(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized", message: "No token provided", statusCode: 401 },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid token", statusCode: 401 },
      { status: 401 }
    );
  }

  return payload;
}

export function rateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();

  return async (request: NextRequest) => {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;

    const userRequests = requests.get(ip) || [];
    const validRequests = userRequests.filter((timestamp) => timestamp > windowStart);

    if (validRequests.length >= maxRequests) {
      return NextResponse.json(
        { error: "Too many requests", message: "Rate limit exceeded", statusCode: 429 },
        { status: 429 }
      );
    }

    validRequests.push(now);
    requests.set(ip, validRequests);

    return null;
  };
}

export function errorHandler(error: any) {
  console.error("Error:", error);

  if (error.name === "ValidationError") {
    return NextResponse.json(
      { error: "Validation Error", message: error.message, statusCode: 400 },
      { status: 400 }
    );
  }

  if (error.name === "UnauthorizedError") {
    return NextResponse.json(
      { error: "Unauthorized", message: error.message, statusCode: 401 },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { error: "Server Error", message: "Internal server error", statusCode: 500 },
    { status: 500 }
  );
}
