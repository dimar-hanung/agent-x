import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import {
  isDocxFile,
  isIndexableFile,
  isPdfFile,
} from "@/lib/files/constants";
import {
  getFileIndexStatus,
  listPreviewChunks,
} from "@/lib/files/index-repository";
import {
  FilesError,
  createDownloadUrl,
  getFileRow,
} from "@/lib/files/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await resolveUser();
    const { id: fileId } = await context.params;

    const file = await getFileRow(user.userId, fileId);
    if (!file || file.kind !== "file" || file.status !== "ready") {
      return NextResponse.json({ message: "File tidak ditemukan." }, { status: 404 });
    }

    if (!isIndexableFile(file.mimeType, file.name)) {
      return NextResponse.json(
        { message: "Format file tidak didukung untuk pratinjau dokumen." },
        { status: 400 }
      );
    }

    const index = await getFileIndexStatus(user.userId, fileId);
    const isPdf = isPdfFile(file.mimeType, file.name);
    const isDocx = isDocxFile(file.mimeType, file.name);
    const indexStatus = index?.status ?? "none";

    let pdfUrl: string | null = null;
    if (isPdf) {
      const { url } = await createDownloadUrl(user.userId, fileId);
      pdfUrl = url;
    }

    if (index?.status === "ready") {
      const chunks = await listPreviewChunks(user.userId, fileId);
      return NextResponse.json({
        kind: "chunks",
        chunks,
        fileName: file.name,
        fileType: isPdf ? "pdf" : isDocx ? "docx" : "document",
        pdfUrl,
        indexStatus,
        chunkCount: chunks.length,
      });
    }

    if (isPdf && pdfUrl) {
      return NextResponse.json({
        kind: "pdf",
        url: pdfUrl,
        fileName: file.name,
        indexStatus,
        message:
          indexStatus === "failed"
            ? (index?.errorMessage ?? "Gagal mengindeks dokumen.")
            : "Sedang mengindeks dokumen…",
      });
    }

    if (isDocx) {
      const message =
        indexStatus === "failed"
          ? (index?.errorMessage ?? "Gagal mengindeks dokumen.")
          : "Sedang mengindeks dokumen…";
      return NextResponse.json({
        kind: "chunks",
        chunks: [],
        fileName: file.name,
        fileType: "docx",
        pdfUrl: null,
        message,
        indexStatus,
        chunkCount: 0,
      });
    }

    return NextResponse.json(
      { message: "Format file tidak didukung." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof FilesError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("GET /api/files/[id]/preview error:", error);
    return NextResponse.json(
      { message: "Gagal memuat pratinjau." },
      { status: 500 }
    );
  }
}
