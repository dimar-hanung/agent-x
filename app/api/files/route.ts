import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import {
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { FilesError, listFiles } from "@/lib/files/repository";
import {
  SeaweedfsNotConfiguredError,
  isSeaweedfsConfigured,
} from "@/lib/files/s3-client";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const parentIdParam = searchParams.get("parentId");
    const parentId =
      parentIdParam === null || parentIdParam === "" || parentIdParam === "null"
        ? null
        : parentIdParam;

    const files = await listFiles(user.userId, parentId);
    return NextResponse.json({ files });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof FilesError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }
    if (error instanceof SeaweedfsNotConfiguredError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: 503 }
      );
    }

    console.error("GET /api/files error:", error);
    return NextResponse.json(
      { message: "Gagal memuat file." },
      { status: 500 }
    );
  }
}
