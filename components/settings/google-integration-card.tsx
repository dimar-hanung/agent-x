"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleIcon } from "@/components/icons/google-icon";
import { DualProviderConnectWarningDialog } from "@/components/settings/dual-provider-connect-warning-dialog";
import { IntegrationRow } from "@/components/settings/integration-row";
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
import type { GoogleIntegrationStatus } from "@/lib/integrations/google-repository";

interface GoogleIntegrationCardProps {
  initialStatus: GoogleIntegrationStatus;
  otherProviderConnected: boolean;
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  denied: "Koneksi Google dibatalkan.",
  invalid_state: "Sesi OAuth tidak valid. Coba hubungkan lagi.",
  unauthorized: "Login dulu sebelum menghubungkan Google.",
  error: "Gagal menghubungkan Google. Coba lagi.",
};

const AUTHORIZE_URL = "/api/integrations/google/authorize";

export function GoogleIntegrationCard({
  initialStatus,
  otherProviderConnected,
}: GoogleIntegrationCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const googleParam = searchParams.get("google");

    if (!googleParam) {
      return;
    }

    if (googleParam === "connected") {
      setError(null);
      router.replace("/dashboard/settings");
      router.refresh();
      return;
    }

    setError(GOOGLE_ERROR_MESSAGES[googleParam] ?? "Gagal menghubungkan Google.");
    router.replace("/dashboard/settings");
  }, [searchParams, router]);

  async function handleDisconnect() {
    setDisconnectError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/google", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setDisconnectError(data.message ?? "Gagal memutuskan Google.");
        return;
      }

      setStatus({ connected: false });
      setConfirmOpen(false);
      router.refresh();
    } catch {
      setDisconnectError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleConnectClick() {
    if (otherProviderConnected) {
      setWarningOpen(true);
      return;
    }

    window.location.href = AUTHORIZE_URL;
  }

  return (
    <>
      <IntegrationRow
        icon={<GoogleIcon className="size-6" />}
        title="Google"
        description={
          status.connected
            ? (status.email ?? "Terhubung")
            : "Calendar, Gmail, dan Drive"
        }
        statusTone={status.connected ? "connected" : "muted"}
        statusLabel={status.connected ? "Terhubung" : "Belum terhubung"}
        actions={
          status.connected ? (
            <Button
              variant="outline"
              onClick={() => {
                setDisconnectError(null);
                setConfirmOpen(true);
              }}
              disabled={isSubmitting}
            >
              Putuskan
            </Button>
          ) : (
            <Button onClick={handleConnectClick} disabled={isSubmitting}>
              Hubungkan
            </Button>
          )
        }
      >
        {error ? <p className="text-destructive">{error}</p> : null}
      </IntegrationRow>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setDisconnectError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Putuskan Google?</AlertDialogTitle>
            <AlertDialogDescription>
              {status.connected && status.email
                ? `Koneksi ${status.email} akan diputus. Tool Google di chat tidak bisa dipakai sampai dihubungkan lagi.`
                : "Koneksi Google akan diputus. Tool Google di chat tidak bisa dipakai sampai dihubungkan lagi."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {disconnectError ? (
            <p className="text-destructive" role="alert">
              {disconnectError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void handleDisconnect();
              }}
            >
              {isSubmitting ? "Memutuskan…" : "Putuskan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DualProviderConnectWarningDialog
        open={warningOpen}
        onOpenChange={setWarningOpen}
        connectingProvider="google"
        activeProvider="microsoft"
        authorizeUrl={AUTHORIZE_URL}
      />
    </>
  );
}
