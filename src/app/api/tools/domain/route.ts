import { NextRequest, NextResponse } from "next/server";
import { authMiddleware, rateLimiter } from "@/lib/middleware";
import { analyzeDomain } from "@/services/domainService";

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
    const { target } = body;

    if (!target) {
      return NextResponse.json(
        { error: "Validation Error", message: "Target (domain or IP) is required", statusCode: 400 },
        { status: 400 }
      );
    }

    const result = await analyzeDomain(target);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Domain analysis error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "Analysis failed", statusCode: 500 },
      { status: 500 }
    );
  }
}
