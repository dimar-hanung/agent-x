import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { createTodo, listTodosByUserId } from "@/lib/todos/repository";
import { createTodoSchema } from "@/lib/todos/schemas";

export async function GET() {
  try {
    const user = await resolveUser();
    const todos = await listTodosByUserId(user.userId);
    return NextResponse.json({ todos });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("GET /api/todos error:", error);
    return NextResponse.json(
      { message: "Gagal memuat todo." },
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

    const parsed = createTodoSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Data tidak valid.";
      return NextResponse.json({ message: firstError }, { status: 400 });
    }

    const todo = await createTodo(user.userId, parsed.data);
    return NextResponse.json(
      { todo, message: "Todo berhasil dibuat." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("POST /api/todos error:", error);
    return NextResponse.json(
      { message: "Gagal membuat todo." },
      { status: 500 }
    );
  }
}
