import { NextRequest, NextResponse } from "next/server";
import { authMiddleware, rateLimiter } from "@/lib/middleware";
import { searchUsername } from "@/services/sherlockService";

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
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: "Validation Error", message: "Username is required", statusCode: 400 },
        { status: 400 }
      );
    }

    const results = await searchUsername(username);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Sherlock error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "Search failed", statusCode: 500 },
      { status: 500 }
    );
  }
}
