"use client";

import { KeyRound, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { IntegrationCardHeader } from "@/components/settings/integration-card-header";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ApiKeyListItem } from "@/lib/api-keys/schemas";

interface ApiKeyIntegrationCardProps {
  initialKeys: ApiKeyListItem[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}

export function ApiKeyIntegrationCard({
  initialKeys,
}: ApiKeyIntegrationCardProps) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<ApiKeyListItem | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const mcpUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "/api/mcp/mcp";
    }
    return `${window.location.origin}/api/mcp/mcp`;
  }, []);

  const hasKeys = keys.length > 0;

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = (await response.json()) as {
        key?: string;
        record?: ApiKeyListItem;
        message?: string;
      };

      if (!response.ok || !data.key || !data.record) {
        setError(data.message ?? "Gagal membuat API key.");
        return;
      }

      setKeys((prev) => [data.record!, ...prev]);
      setCreatedKey(data.key);
      setName("");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;

    setRevokeError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/integrations/api-keys/${revokeTarget.id}`,
        { method: "DELETE" }
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setRevokeError(data.message ?? "Gagal mencabut API key.");
        return;
      }

      setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
      setRevokeTarget(null);
      router.refresh();
    } catch {
      setRevokeError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal menyalin ke clipboard.");
    }
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setCreatedKey(null);
    setName("");
    setError(null);
    setCopied(false);
  }

  const sampleConfig = `{
  "mcpServers": {
    "agentx-todos": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer ${createdKey ?? "<API_KEY>"}"
      }
    }
  }
}`;

  return (
    <>
      <Card className="gap-0 py-0 md:col-span-2">
        <IntegrationCardHeader
          icon={<KeyRound className="size-6" />}
          title="API Key / MCP"
          description="Akses todo lewat MCP (Cursor, Claude, dll.)."
          statusTone={hasKeys ? "connected" : "muted"}
          statusLabel={hasKeys ? `${keys.length} key` : "Belum ada key"}
        />
        <CardContent className="space-y-4 p-4">
          <div className="bg-muted space-y-2 rounded-lg p-3 text-xs">
            <p className="text-muted-foreground">Endpoint MCP</p>
            <div className="flex items-start gap-2">
              <code className="bg-background flex-1 break-all rounded px-2 py-1 font-mono text-[11px]">
                {mcpUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => void copyText(mcpUrl)}
                aria-label="Salin URL MCP"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground">
              Header:{" "}
              <code className="font-mono">Authorization: Bearer &lt;key&gt;</code>
            </p>
          </div>

          {keys.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada API key. Buat key untuk menghubungkan client MCP.
            </p>
          ) : (
            <ul className="divide-border divide-y rounded-lg border">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{key.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {key.tokenPrefix}…
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Dibuat {formatDate(key.createdAt)}
                      {key.lastUsedAt
                        ? ` · Terakhir dipakai ${formatDate(key.lastUsedAt)}`
                        : " · Belum dipakai"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive shrink-0"
                    onClick={() => {
                      setRevokeError(null);
                      setRevokeTarget(key);
                    }}
                  >
                    Cabut
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={() => {
              setError(null);
              setCreatedKey(null);
              setName("");
              setCreateOpen(true);
            }}
          >
            Buat API key
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) closeCreateDialog();
          else setCreateOpen(true);
        }}
      >
        <DialogContent>
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API key dibuat</DialogTitle>
                <DialogDescription>
                  Salin key sekarang. Setelah dialog ditutup, key tidak
                  ditampilkan lagi.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="bg-muted flex items-start gap-2 rounded-lg p-3">
                  <code className="flex-1 break-all font-mono text-xs">
                    {createdKey}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => void copyText(createdKey)}
                    aria-label="Salin API key"
                  >
                    {copied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">
                    Contoh konfigurasi client
                  </p>
                  <pre className="bg-muted max-h-40 overflow-auto rounded-lg p-3 font-mono text-[11px] whitespace-pre-wrap">
                    {sampleConfig}
                  </pre>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={closeCreateDialog}>
                  Selesai
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Buat API key</DialogTitle>
                <DialogDescription>
                  Key dipakai untuk autentikasi MCP todo (Bearer token).
                </DialogDescription>
              </DialogHeader>
              <FieldGroup className="py-4">
                <Field>
                  <FieldLabel htmlFor="api-key-name">Nama</FieldLabel>
                  <Input
                    id="api-key-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mis. Cursor laptop"
                    maxLength={128}
                    required
                    autoFocus
                  />
                </Field>
              </FieldGroup>
              {error ? (
                <p className="text-destructive mb-3 text-sm" role="alert">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCreateDialog}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting || !name.trim()}>
                  {isSubmitting ? "Membuat…" : "Buat"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
            setRevokeError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cabut API key?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget
                ? `"${revokeTarget.name}" (${revokeTarget.tokenPrefix}…) akan dicabut. Client yang memakai key ini tidak bisa mengakses MCP lagi.`
                : "API key akan dicabut."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revokeError ? (
            <p className="text-destructive text-sm" role="alert">
              {revokeError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void handleRevoke();
              }}
            >
              {isSubmitting ? "Mencabut…" : "Cabut"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
