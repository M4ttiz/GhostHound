import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authMiddleware } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await connectDB();

    const payload = authResult as { userId: string; email: string };
    const user = await User.findById(payload.userId).select("-password");

    if (!user) {
      return NextResponse.json(
        { error: "Not Found", message: "User not found", statusCode: 404 },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        language: user.language,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "Failed to fetch profile", statusCode: 500 },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await connectDB();

    const body = await request.json();
    const { language } = body;

    const payload = authResult as { userId: string; email: string };
    const user = await User.findByIdAndUpdate(
      payload.userId,
      { language },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return NextResponse.json(
        { error: "Not Found", message: "User not found", statusCode: 404 },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        language: user.language,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "Failed to update profile", statusCode: 500 },
      { status: 500 }
    );
  }
}
