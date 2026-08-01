import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  generateDigest,
  getLatestDigestSnapshot,
  listDigestSnapshots,
  type WhatsAppDigestSnapshotResult,
} from "@/lib/integrations/whatsapp-inbox/summary/service";

function requireClientOrAdmin(role: string) {
  return role === "client" || role === "admin";
}

function serializeSnapshot(row: {
  id: string;
  digestText: string;
  chatCount: number;
  chunkCount: number;
  coversFrom: Date;
  coversTo: Date;
  generatedAt: Date;
}): WhatsAppDigestSnapshotResult {
  return {
    id: row.id,
    digestText: row.digestText,
    chatCount: row.chatCount,
    chunkCount: row.chunkCount,
    coversFrom: row.coversFrom.toISOString(),
    coversTo: row.coversTo.toISOString(),
    generatedAt: row.generatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!requireClientOrAdmin(user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const listMode = searchParams.get("list") === "1";
  const limit = Number(searchParams.get("limit") ?? 20);

  if (listMode) {
    const snapshots = await listDigestSnapshots(user.userId, limit);
    return NextResponse.json({
      snapshots: snapshots.map(serializeSnapshot),
    });
  }

  const latest = await getLatestDigestSnapshot(user.userId);

  return NextResponse.json({
    snapshot: latest ? serializeSnapshot(latest) : null,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!requireClientOrAdmin(user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  let since: Date | undefined;

  try {
    const body = (await req.json()) as { since?: string };
    if (body.since) {
      since = new Date(body.since);
    }
  } catch {
    // Empty body is fine.
  }

  const result = await generateDigest(user.userId, {
    since,
    abortSignal: req.signal,
  });

  if ("success" in result && result.success === false) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json(result);
}
