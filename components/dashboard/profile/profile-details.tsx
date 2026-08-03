"use client";

import { useState } from "react";

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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <>
      <div className="divide-border surface-panel divide-y overflow-hidden rounded-lg border">
        <div className="p-6">
          <h2 className="text-base font-semibold">Data akun</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Informasi akun Anda. Nama dan email tidak bisa diubah di sini.
          </p>
        </div>
        <div className="p-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="profile-displayName">Nama</FieldLabel>
              <Input
                id="profile-displayName"
                value={displayName}
                readOnly
                aria-readonly
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-email">Email</FieldLabel>
              <Input
                id="profile-email"
                value={email}
                readOnly
                aria-readonly
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
          <div className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPasswordDialogOpen(true)}
            >
              Ubah password
            </Button>
          </div>
        </div>
      </div>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </>
  );
}
