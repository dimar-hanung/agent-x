import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import {
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { FilesError, deleteFile, patchFile } from "@/lib/files/repository";
import { patchFileSchema } from "@/lib/files/schemas";
import {
  SeaweedfsNotConfiguredError,
  isSeaweedfsConfigured,
} from "@/lib/files/s3-client";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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

    const body = await request.json().catch(() => null);
    const parsed = patchFileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Body JSON tidak valid.",
        },
        { status: 400 }
      );
    }

    const file = await patchFile(user.userId, id, parsed.data);
    return NextResponse.json({ file });
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

    console.error("PATCH /api/files/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui file." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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

    await deleteFile(user.userId, id);
    return NextResponse.json({ message: "File dihapus." });
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

    console.error("DELETE /api/files/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus file." },
      { status: 500 }
    );
  }
}
