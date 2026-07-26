"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MicrosoftIcon } from "@/components/icons/microsoft-icon";
import { DualProviderConnectWarningDialog } from "@/components/settings/dual-provider-connect-warning-dialog";
import { IntegrationRow } from "@/components/settings/integration-row";
import { Button } from "@/components/ui/button";
import type { MicrosoftIntegrationStatus } from "@/lib/integrations/microsoft-repository";

interface MicrosoftIntegrationCardProps {
  initialStatus: MicrosoftIntegrationStatus;
  otherProviderConnected: boolean;
}

const MICROSOFT_ERROR_MESSAGES: Record<string, string> = {
  denied: "Koneksi Microsoft dibatalkan.",
  invalid_state: "Sesi OAuth tidak valid. Coba hubungkan lagi.",
  unauthorized: "Login dulu sebelum menghubungkan Microsoft.",
  error: "Gagal menghubungkan Microsoft. Coba lagi.",
};

const AUTHORIZE_URL = "/api/integrations/microsoft/authorize";

export function MicrosoftIntegrationCard({
  initialStatus,
  otherProviderConnected,
}: MicrosoftIntegrationCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    const microsoftParam = searchParams.get("microsoft");

    if (!microsoftParam) {
      return;
    }

    if (microsoftParam === "connected") {
      setError(null);
      router.replace("/dashboard/settings");
      router.refresh();
      return;
    }

    setError(
      MICROSOFT_ERROR_MESSAGES[microsoftParam] ??
        "Gagal menghubungkan Microsoft.",
    );
    router.replace("/dashboard/settings");
  }, [searchParams, router]);

  async function handleDisconnect() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/microsoft", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "Gagal memutuskan Microsoft.");
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
        icon={<MicrosoftIcon className="size-6" />}
        title="Microsoft"
        description={
          status.connected
            ? (status.email ?? "Terhubung")
            : "Outlook, Calendar, dan OneDrive"
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
        connectingProvider="microsoft"
        activeProvider="google"
        authorizeUrl={AUTHORIZE_URL}
      />
    </>
  );
}
