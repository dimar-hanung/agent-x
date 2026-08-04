"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ChangePasswordDialog } from "@/components/dashboard/profile/change-password-dialog";
import { formatRoleLabel } from "@/components/dashboard/users/user-labels";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface ProfileDetailsProps {
  displayName: string;
  email: string;
  role: string;
}

export function ProfileDetails({
  displayName,
  email,
  role,
}: ProfileDetailsProps) {
  const router = useRouter();
  const [values, setValues] = useState({ displayName, email });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  useEffect(() => {
    setValues({ displayName, email });
  }, [displayName, email]);

  const isDirty =
    values.displayName !== displayName || values.email !== email;

  function updateField<K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as {
        message?: string;
        displayName?: string;
        email?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal memperbarui profil.");
        return;
      }

      if (data.displayName && data.email) {
        setValues({
          displayName: data.displayName,
          email: data.email,
        });
      }

      setSuccessMessage(data.message ?? "Profil berhasil diperbarui.");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="divide-border surface-panel divide-y overflow-hidden rounded-lg border"
      >
        <div className="p-6">
          <h2 className="text-base font-semibold">Data akun</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Perbarui nama dan email akun Anda.
          </p>
        </div>
        <div className="p-6">
          <FieldGroup>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            {successMessage ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                {successMessage}
              </p>
            ) : null}

            <Field>
              <FieldLabel htmlFor="profile-displayName">Nama</FieldLabel>
              <Input
                id="profile-displayName"
                value={values.displayName}
                onChange={(event) =>
                  updateField("displayName", event.target.value)
                }
                disabled={isSubmitting}
                required
                maxLength={255}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-email">Email</FieldLabel>
              <Input
                id="profile-email"
                type="email"
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                disabled={isSubmitting}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-role">Role</FieldLabel>
              <Input
                id="profile-role"
                value={formatRoleLabel(role)}
                readOnly
                aria-readonly
              />
            </Field>
          </FieldGroup>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPasswordDialogOpen(true)}
              disabled={isSubmitting}
            >
              Ubah password
            </Button>
          </div>
        </div>
      </form>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </>
  );
}
