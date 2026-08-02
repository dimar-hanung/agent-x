import { NextResponse } from "next/server";

import { getModelSettings } from "@/lib/admin/model-settings/repository";
import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { getVoiceConfig, transcribeAudio } from "@/lib/ai/voice";
import { transcribeRequestSchema } from "@/lib/ai/voice/transcribe-request-schema";

function mapTranscribeError(message: string): { status: number; message: string } {
  if (message === "Fitur pesan suara belum diaktifkan.") {
    return { status: 403, message };
  }

  if (message === "Pesan suara terlalu besar untuk diproses.") {
    return { status: 413, message };
  }

  if (message === "Format pesan suara tidak didukung.") {
    return { status: 400, message };
  }

  if (message === "Transkripsi pesan suara kosong.") {
    return { status: 422, message };
  }

  if (message === "OpenRouter API key belum dikonfigurasi.") {
    return { status: 503, message: "Transkripsi suara belum tersedia." };
  }

  return { status: 502, message: "Gagal mentranskripsi audio." };
}

export async function POST(request: Request) {
  try {
    await resolveUser();

    const body = await request.json().catch(() => null);
    const parsed = transcribeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Body JSON tidak valid.",
        },
        { status: 400 }
      );
    }

    const modelSettings = await getModelSettings();
    const voiceConfig = getVoiceConfig(modelSettings);

    if (!voiceConfig.inputEnabled) {
      return NextResponse.json(
        { message: "Fitur pesan suara belum diaktifkan." },
        { status: 403 }
      );
    }

    const text = await transcribeAudio(
      {
        base64: parsed.data.base64,
        mimeType: parsed.data.mimeType,
        fileName: parsed.data.fileName,
        byteLength: parsed.data.byteLength,
        abortSignal: request.signal,
      },
      voiceConfig
    );

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    if (error instanceof Error) {
      const mapped = mapTranscribeError(error.message);
      return NextResponse.json(
        { message: mapped.message },
        { status: mapped.status }
      );
    }

    return NextResponse.json(
      { message: "Gagal mentranskripsi audio." },
      { status: 500 }
    );
  }
}
