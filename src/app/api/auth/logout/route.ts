import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RefreshToken from "@/models/RefreshToken";
import { authMiddleware } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await connectDB();

    const body = await request.json();
    const { refreshToken } = body;

    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "Logout failed", statusCode: 500 },
      { status: 500 }
    );
  }
}
