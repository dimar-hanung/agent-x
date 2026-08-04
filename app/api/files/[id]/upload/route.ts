import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import {
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { FilesError, uploadPendingFileBytes } from "@/lib/files/repository";
import {
  SeaweedfsNotConfiguredError,
  isSeaweedfsConfigured,
} from "@/lib/files/s3-client";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await resolveUser();
    const { id } = await context.params;

    if (!isSeaweedfsConfigured()) {
      return NextResponse.json(
        {
          message: SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
          code: SEAWEEDFS_NOT_CONFIGURED_CODE,
        },
        { status: 503 }
      );
    }

    const body = Buffer.from(await request.arrayBuffer());
    if (body.length === 0) {
      return NextResponse.json(
        { message: "Body unggahan kosong." },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type")?.trim() || undefined;

    await uploadPendingFileBytes(user.userId, id, body, contentType);

    return new NextResponse(null, { status: 200 });
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

    console.error("PUT /api/files/[id]/upload error:", error);
    return NextResponse.json(
      { message: "Gagal mengunggah file." },
      { status: 500 }
    );
  }
}
