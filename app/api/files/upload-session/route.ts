import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import {
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { FilesError, createUploadSession } from "@/lib/files/repository";
import { uploadSessionSchema } from "@/lib/files/schemas";
import {
  SeaweedfsNotConfiguredError,
  isSeaweedfsConfigured,
} from "@/lib/files/s3-client";

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => null);
    const parsed = uploadSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Body JSON tidak valid.",
        },
        { status: 400 }
      );
    }

    const session = await createUploadSession(user.userId, parsed.data);
    return NextResponse.json(
      {
        file: session.file,
        uploadUrl: session.uploadUrl,
      },
      { status: 201 }
    );
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

    console.error("POST /api/files/upload-session error:", error);
    return NextResponse.json(
      { message: "Gagal membuat sesi unggah." },
      { status: 500 }
    );
  }
}
