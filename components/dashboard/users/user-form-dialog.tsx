"use client";

import { useEffect, useState } from "react";

import type { AdminUserListItem } from "@/lib/admin/users/schemas";

import { CreateUserConfirmDialog } from "./create-user-confirm-dialog";
import {
  EMPTY_USER_FORM,
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
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialUser?: AdminUserListItem | null;
  onSuccess: (user: AdminUserListItem) => void;
}

function toFormValues(user: AdminUserListItem): UserFormValues {
  return {
    displayName: user.displayName,
    email: user.email,
    role: user.role === "guest" ? "guest" : "client",
    phone: user.whatsappPhoneE164 ?? "",
    gender: user.gender,
  };
}

export function UserFormDialog({
  open,
  onOpenChange,
  mode,
  initialUser,
  onSuccess,
}: UserFormDialogProps) {
  const [values, setValues] = useState<UserFormValues>(EMPTY_USER_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setConfirmError(null);
    setValues(
      mode === "edit" && initialUser
        ? toFormValues(initialUser)
        : EMPTY_USER_FORM
    );
  }, [open, mode, initialUser]);

  function updateField<K extends keyof UserFormValues>(
    key: K,
    value: UserFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!initialUser) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/users/${initialUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as {
        message?: string;
        user?: AdminUserListItem;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal memperbarui user.");
        return;
      }

      if (data.user) {
        onSuccess(data.user);
      }

      onOpenChange(false);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setConfirmError(null);
    setConfirmOpen(true);
  }

  async function handleConfirmCreate() {
    setConfirmError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as {
        message?: string;
        user?: AdminUserListItem;
      };

      if (!response.ok) {
        setConfirmError(data.message ?? "Gagal membuat user.");
        return;
      }

      if (data.user) {
        onSuccess(data.user);
      }

      setConfirmOpen(false);
      onOpenChange(false);
    } catch {
      setConfirmError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={!isSubmitting}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Tambah user" : "Edit user"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Isi data user baru. Kredensial login akan dikirim via WhatsApp."
                : "Perbarui data user. Password tidak diubah dari sini."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={mode === "create" ? handleCreateSubmit : handleEditSubmit}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="user-display-name">Nama</FieldLabel>
                <Input
                  id="user-display-name"
                  value={values.displayName}
                  onChange={(event) =>
                    updateField("displayName", event.target.value)
                  }
                  required
                  disabled={isSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="user-email">Email</FieldLabel>
                <Input
                  id="user-email"
                  type="email"
                  value={values.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="user-role">Role</FieldLabel>
                <Select
                  value={values.role}
                  onValueChange={(value) =>
                    updateField("role", value as UserFormValues["role"])
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="user-role" className="w-full">
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="user-phone">Nomor WhatsApp</FieldLabel>
                <Input
                  id="user-phone"
                  value={values.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="081234567890"
                  required
                  disabled={isSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="user-gender">Jenis kelamin</FieldLabel>
                <Select
                  value={values.gender}
                  onValueChange={(value) =>
                    updateField("gender", value as UserFormValues["gender"])
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="user-gender" className="w-full">
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laki_laki">Laki-laki</SelectItem>
                    <SelectItem value="perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {error && <p className="text-destructive text-sm">{error}</p>}
            </FieldGroup>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Menyimpan..."
                  : mode === "create"
                    ? "Lanjut"
                    : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreateUserConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        values={values}
        isSubmitting={isSubmitting}
        error={confirmError}
        onConfirm={handleConfirmCreate}
      />
    </>
  );
}
