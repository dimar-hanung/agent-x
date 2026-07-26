"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleIcon } from "@/components/icons/google-icon";
import { DualProviderConnectWarningDialog } from "@/components/settings/dual-provider-connect-warning-dialog";
import { IntegrationRow } from "@/components/settings/integration-row";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

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
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/google", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "Gagal memutuskan Google.");
        return;
      }

      setStatus({ connected: false });
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
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
              onClick={handleDisconnect}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Memutuskan..." : "Putuskan"}
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
