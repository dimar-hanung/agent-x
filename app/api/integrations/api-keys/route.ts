import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { createApiKey, listApiKeys } from "@/lib/api-keys/repository";
import { createApiKeySchema } from "@/lib/api-keys/schemas";

export async function GET() {
  try {
    const user = await resolveUser();
    const keys = await listApiKeys(user.userId);
    return NextResponse.json({ keys });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("GET /api/integrations/api-keys error:", error);
    return NextResponse.json(
      { message: "Gagal memuat API key." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await resolveUser();

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { message: "Body JSON tidak valid." },
        { status: 400 }
      );
    }

    const parsed = createApiKeySchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? "Data tidak valid.";
      return NextResponse.json({ message: firstError }, { status: 400 });
    }

    const { key, record } = await createApiKey(user.userId, parsed.data.name);

    return NextResponse.json(
      {
        key,
        record,
        message: "API key berhasil dibuat. Salin sekarang — tidak ditampilkan lagi.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("POST /api/integrations/api-keys error:", error);
    return NextResponse.json(
      { message: "Gagal membuat API key." },
      { status: 500 }
    );
  }
}
