"use client";

import { useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import type { AdminUserListItem } from "@/lib/admin/users/schemas";

import { UserFormDialog } from "./user-form-dialog";
import {
  formatCreatedAt,
  formatGenderLabel,
  formatRoleLabel,
} from "./user-labels";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UsersTableProps {
  initialUsers: AdminUserListItem[];
}

export function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function openCreateDialog() {
    setFormMode("create");
    setSelectedUser(null);
    setFormOpen(true);
  }

  function openEditDialog(user: AdminUserListItem) {
    if (user.role === "admin") {
      return;
    }

    setFormMode("edit");
    setSelectedUser(user);
    setFormOpen(true);
  }

  function handleUserSaved(user: AdminUserListItem) {
    setUsers((prev) => {
      const index = prev.findIndex((item) => item.id === user.id);

      if (index === -1) {
        return [user, ...prev];
      }

      const next = [...prev];
      next[index] = user;
      return next;
    });
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setDeleteError(data.message ?? "Gagal menghapus user.");
        return;
      }

      setUsers((prev) => prev.filter((user) => user.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreateDialog}>
          <PlusIcon />
          Tambah user
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Belum ada user.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Jenis kelamin</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isAdmin = user.role === "admin";

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.displayName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={isAdmin ? "secondary" : "outline"}>
                        {formatRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.whatsappPhoneE164 ?? "—"}</TableCell>
                    <TableCell>{formatGenderLabel(user.gender)}</TableCell>
                    <TableCell>{formatCreatedAt(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={isAdmin}
                          onClick={() => openEditDialog(user)}
                          aria-label={`Edit ${user.displayName}`}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={isAdmin}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(user);
                          }}
                          aria-label={`Hapus ${user.displayName}`}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialUser={selectedUser}
        onSuccess={handleUserSaved}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus user?</AlertDialogTitle>
            <AlertDialogDescription>
              User <strong>{deleteTarget?.displayName}</strong> akan dihapus
              permanen beserta data terkait.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <p className="text-destructive text-sm">{deleteError}</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
