import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RefreshToken from "@/models/RefreshToken";
import { verifyRefreshToken, generateAccessToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Validation Error", message: "Refresh token is required", statusCode: 400 },
        { status: 400 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid refresh token", statusCode: 401 },
        { status: 401 }
      );
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Refresh token expired or invalid", statusCode: 401 },
        { status: 401 }
      );
    }

    const newAccessToken = generateAccessToken(payload);

    return NextResponse.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "Token refresh failed", statusCode: 500 },
      { status: 500 }
    );
  }
}
