import { NextRequest, NextResponse } from "next/server";
import { authMiddleware, rateLimiter } from "@/lib/middleware";
import { checkBreach } from "@/services/breachService";

const toolsRateLimiter = rateLimiter(30, 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await toolsRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const authResult = await authMiddleware(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { query, type } = body;

    if (!query || !type) {
      return NextResponse.json(
        { error: "Validation Error", message: "Query and type are required", statusCode: 400 },
        { status: 400 }
      );
    }

    if (type !== "email" && type !== "username") {
      return NextResponse.json(
        { error: "Validation Error", message: "Type must be 'email' or 'username'", statusCode: 400 },
        { status: 400 }
      );
    }

    const results = await checkBreach(query, type);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Breach check error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "Breach check failed", statusCode: 500 },
      { status: 500 }
    );
  }
}
