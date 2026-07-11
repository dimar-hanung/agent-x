import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { listMemories } from "@/lib/memory/repository";

export async function GET() {
  try {
    const user = await resolveUser();
    const memories = await listMemories(user.userId);
    return NextResponse.json({ memories });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("GET /api/memories error:", error);
    return NextResponse.json(
      { message: "Gagal memuat memory." },
      { status: 500 }
    );
  }
}
