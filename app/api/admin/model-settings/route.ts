import { NextResponse } from "next/server";

import {
  getModelSettings,
  getModelSettingsOptions,
  updateModelSettings,
} from "@/lib/admin/model-settings/repository";
import { updateModelSettingsSchema } from "@/lib/admin/model-settings/schemas";
import { requireAdminUser } from "@/lib/auth/require-admin";

export async function GET() {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  const [settings, options] = await Promise.all([
    getModelSettings(),
    Promise.resolve(getModelSettingsOptions()),
  ]);

  return NextResponse.json({
    settings,
    options,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateModelSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data pengaturan model tidak valid.",
        errors: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const settings = await updateModelSettings(parsed.data);
    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal menyimpan pengaturan model.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
