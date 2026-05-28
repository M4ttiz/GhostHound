import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import RefreshToken from "@/models/RefreshToken";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Validation Error", message: "Email, password, and name are required", statusCode: 400 },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Validation Error", message: "Email already in use", statusCode: 400 },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      provider: "local",
    });

    const tokenPayload = { userId: user._id.toString(), email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: refreshTokenExpiry,
    });

    return NextResponse.json(
      {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          provider: user.provider,
          language: user.language,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "Registration failed", statusCode: 500 },
      { status: 500 }
    );
  }
}
