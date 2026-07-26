import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

export function MicrosoftIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
      {...props}
    >
      <path fill="#F25022" d="M6 6h17v17H6z" />
      <path fill="#7FBA00" d="M25 6h17v17H25z" />
      <path fill="#00A4EF" d="M6 25h17v17H6z" />
      <path fill="#FFB900" d="M25 25h17v17H25z" />
    </svg>
  );
}
