"use client";

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

type IntegrationProvider = "google" | "microsoft";

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  google: "Google",
  microsoft: "Microsoft",
};

interface DualProviderConnectWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectingProvider: IntegrationProvider;
  activeProvider: IntegrationProvider;
  authorizeUrl: string;
}

export function DualProviderConnectWarningDialog({
  open,
  onOpenChange,
  connectingProvider,
  activeProvider,
  authorizeUrl,
}: DualProviderConnectWarningDialogProps) {
  const connectingLabel = PROVIDER_LABELS[connectingProvider];
  const activeLabel = PROVIDER_LABELS[activeProvider];

  function handleContinue() {
    window.location.href = authorizeUrl;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hubungkan {connectingLabel} juga?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left">
            <span className="block">
              Akun {activeLabel} sudah terhubung. Menghubungkan {connectingLabel}{" "}
              sekaligus bukan skenario ideal.
            </span>
            <span className="block">
              Tool email, kalender, dan drive terpisah per provider — AI harus
              memilih tool yang benar. Disarankan satu provider utama.
            </span>
            <span className="block">
              Anda tetap bisa melanjutkan jika memang membutuhkan keduanya.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>
            Lanjutkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
