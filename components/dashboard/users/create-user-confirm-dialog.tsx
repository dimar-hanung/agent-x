"use client";

import type { CreateAdminUserInput } from "@/lib/admin/users/schemas";

import {
  formatGenderLabel,
  formatRoleLabel,
  type UserFormValues,
} from "./user-labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateUserConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: UserFormValues;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void;
}

export function CreateUserConfirmDialog({
  open,
  onOpenChange,
  values,
  isSubmitting,
  error,
  onConfirm,
}: CreateUserConfirmDialogProps) {
  const isClient = values.role === "client";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Konfirmasi buat user</DialogTitle>
          <DialogDescription>
            Periksa data user sebelum membuat akun dan mengirim pesan WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Nama</dt>
            <dd className="text-right font-medium">{values.displayName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-right font-medium">{values.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-right font-medium">
              {formatRoleLabel(values.role)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Nomor WhatsApp</dt>
            <dd className="text-right font-medium">{values.phone}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Jenis kelamin</dt>
            <dd className="text-right font-medium">
              {formatGenderLabel(values.gender)}
            </dd>
          </div>
        </dl>

        <div className="bg-muted/50 space-y-2 rounded-lg border p-3 text-sm">
          <p>Password akan dibuat otomatis dan dikirim ke WhatsApp user.</p>
          {isClient ? (
            <p>
              Pesan onboarding client akan dikirim bersama kredensial login.
            </p>
          ) : (
            <p>Hanya pesan kredensial login yang akan dikirim.</p>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? "Membuat..." : "Buat dan kirim WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { CreateAdminUserInput };
