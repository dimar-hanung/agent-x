import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { deleteTodo, updateTodo } from "@/lib/todos/repository";
import { updateTodoSchema } from "@/lib/todos/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const user = await resolveUser();
    const { id } = await context.params;

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { message: "Body JSON tidak valid." },
        { status: 400 }
      );
    }

    const parsed = updateTodoSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Data tidak valid.";
      return NextResponse.json({ message: firstError }, { status: 400 });
    }

    try {
      const todo = await updateTodo(user.userId, id, parsed.data);
      return NextResponse.json({
        todo,
        message: "Todo berhasil diperbarui.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memperbarui todo.";

      if (message.includes("tidak ditemukan")) {
        return NextResponse.json({ message }, { status: 404 });
      }

      return NextResponse.json({ message }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("PATCH /api/todos/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui todo." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const user = await resolveUser();
    const { id } = await context.params;

    try {
      await deleteTodo(user.userId, id);
      return NextResponse.json({ message: "Todo berhasil dihapus." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menghapus todo.";

      if (message.includes("tidak ditemukan")) {
        return NextResponse.json({ message }, { status: 404 });
      }

      return NextResponse.json({ message }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("DELETE /api/todos/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus todo." },
      { status: 500 }
    );
  }
}
