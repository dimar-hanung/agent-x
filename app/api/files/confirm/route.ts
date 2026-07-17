import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import {
  isIndexableFile,
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { enqueueFileIndex } from "@/lib/files/index-repository";
import { isDoclingConfigured } from "@/lib/docling/env";
import {
  FilesError,
  cleanupStalePending,
  confirmUpload,
} from "@/lib/files/repository";
import { confirmUploadSchema } from "@/lib/files/schemas";
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
    const parsed = confirmUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Body JSON tidak valid.",
        },
        { status: 400 }
      );
    }

    try {
      const file = await confirmUpload(user.userId, parsed.data.fileId);

      if (
        isDoclingConfigured() &&
        file.kind === "file" &&
        isIndexableFile(file.mimeType, file.name)
      ) {
        await enqueueFileIndex(user.userId, file.id).catch((error) => {
          console.error("enqueueFileIndex error:", error);
        });
      }

      return NextResponse.json({ file });
    } catch (error) {
      // If confirm fails (object missing), drop pending row
      if (error instanceof FilesError && error.status !== 404) {
        await cleanupStalePending(user.userId, parsed.data.fileId).catch(
          () => undefined
        );
      }
      throw error;
    }
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

    console.error("POST /api/files/confirm error:", error);
    return NextResponse.json(
      { message: "Gagal mengonfirmasi unggahan." },
      { status: 500 }
    );
  }
}
