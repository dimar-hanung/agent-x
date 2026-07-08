import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { IndonesianFlagIcon } from "@/components/icons/indonesian-flag-icon";
import { siteConfig } from "@/lib/site-config";

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <IndonesianFlagIcon className="size-6" />
          {siteConfig.name}
        </a>
        <Suspense fallback={<div className="text-muted-foreground text-sm">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
