import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import {
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { getQuota } from "@/lib/files/repository";
import { isSeaweedfsConfigured } from "@/lib/files/s3-client";

export async function GET() {
  try {
    const user = await resolveUser();

    if (!isSeaweedfsConfigured()) {
      return NextResponse.json(
        {
          message: SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
          code: SEAWEEDFS_NOT_CONFIGURED_CODE,
        },
        { status: 503 }
      );
    }

    const quota = await getQuota(user.userId);
    return NextResponse.json({ quota });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("GET /api/files/quota error:", error);
    return NextResponse.json(
      { message: "Gagal memuat kuota." },
      { status: 500 }
    );
  }
}
