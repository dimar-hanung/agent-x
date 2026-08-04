import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import {
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { FilesError, readFileStreamContent } from "@/lib/files/repository";
import {
  SeaweedfsNotConfiguredError,
  isSeaweedfsConfigured,
} from "@/lib/files/s3-client";

type RouteContext = { params: Promise<{ id: string }> };

function buildContentDisposition(
  disposition: "inline" | "attachment",
  fileName: string
): string {
  const encodedName = encodeURIComponent(fileName);
  const asciiName = fileName.replace(/[^\x20-\x7E]/g, "_") || "file";

  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
}

export async function GET(request: Request, context: RouteContext) {
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

    const dispositionParam = new URL(request.url).searchParams.get("disposition");
    let disposition: "inline" | "attachment" = "attachment";

    if (
      dispositionParam !== null &&
      dispositionParam !== "" &&
      dispositionParam !== "attachment"
    ) {
      if (dispositionParam !== "inline") {
        return NextResponse.json(
          { message: "Parameter disposition tidak valid." },
          { status: 400 }
        );
      }
      disposition = "inline";
    }

    const { body, contentType, fileName } = await readFileStreamContent(
      user.userId,
      id
    );

    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": buildContentDisposition(disposition, fileName),
        "Cache-Control": "private, no-store",
      },
    });
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

    console.error("GET /api/files/[id]/stream error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil file." },
      { status: 500 }
    );
  }
}
