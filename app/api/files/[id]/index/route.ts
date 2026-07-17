import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { isIndexableFile } from "@/lib/files/constants";
import { getFileIndexStatus } from "@/lib/files/index-repository";
import { FilesError, getFileRow } from "@/lib/files/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await resolveUser();
    const { id: fileId } = await context.params;

    const file = await getFileRow(user.userId, fileId);
    if (!file || file.kind !== "file") {
      return NextResponse.json({ message: "File tidak ditemukan." }, { status: 404 });
    }

    if (!isIndexableFile(file.mimeType, file.name)) {
      return NextResponse.json(
        { message: "Format file tidak didukung untuk pengindeksan." },
        { status: 400 }
      );
    }

    const index = await getFileIndexStatus(user.userId, fileId);
    if (!index) {
      return NextResponse.json({
        status: "none",
        chunkCount: 0,
        errorMessage: null,
        indexedAt: null,
      });
    }

    return NextResponse.json({
      status: index.status,
      chunkCount: index.chunkCount,
      errorMessage: index.errorMessage,
      indexedAt: index.indexedAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof FilesError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("GET /api/files/[id]/index error:", error);
    return NextResponse.json(
      { message: "Gagal memuat status indeks." },
      { status: 500 }
    );
  }
}
