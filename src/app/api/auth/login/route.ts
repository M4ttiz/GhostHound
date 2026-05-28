import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { comparePassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import RefreshToken from "@/models/RefreshToken";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Validation Error", message: "Email and password are required", statusCode: 400 },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid email or password", statusCode: 401 },
        { status: 401 }
      );
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid email or password", statusCode: 401 },
        { status: 401 }
      );
    }

    const tokenPayload = { userId: user._id.toString(), email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await RefreshToken.deleteMany({ userId: user._id });

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: refreshTokenExpiry,
    });

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        language: user.language,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "Login failed", statusCode: 500 },
      { status: 500 }
    );
  }
}
