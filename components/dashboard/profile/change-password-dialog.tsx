"use client";

import { useEffect, useState } from "react";

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

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(EMPTY_FORM);
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
  }, [open]);

  function updateField<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "Gagal mengubah password.");
        return;
      }

      setValues(EMPTY_FORM);
      setSuccessMessage(data.message ?? "Password berhasil diperbarui.");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) {
      return;
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Ubah password</DialogTitle>
          <DialogDescription>
            Masukkan password saat ini, lalu password baru.
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="space-y-4">
            <p className="text-sm text-green-600 dark:text-green-400">
              {successMessage}
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error ? (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              ) : null}

              <Field>
                <FieldLabel htmlFor="currentPassword">Password saat ini</FieldLabel>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={values.currentPassword}
                  onChange={(event) =>
                    updateField("currentPassword", event.target.value)
                  }
                  disabled={isSubmitting}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="newPassword">Password baru</FieldLabel>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={values.newPassword}
                  onChange={(event) =>
                    updateField("newPassword", event.target.value)
                  }
                  disabled={isSubmitting}
                  minLength={8}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Konfirmasi password</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={values.confirmPassword}
                  onChange={(event) =>
                    updateField("confirmPassword", event.target.value)
                  }
                  disabled={isSubmitting}
                  minLength={8}
                  required
                />
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan password"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
