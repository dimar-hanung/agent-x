"use client";

import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { OnboardingStep } from "@/lib/onboarding/steps";
import { appRoutes } from "@/lib/site-config";
import { cn } from "@/lib/utils";

interface PanduanWorkspaceProps {
  steps: OnboardingStep[];
  displayName: string;
  isCompleted: boolean;
}

function exampleBody(example: string): string {
  return example.replace(/^Contoh:\s*/i, "");
}

function StepExample({ example }: { example: string }) {
  return (
    <div className="border-border/80 bg-card mt-4 rounded-md border px-3.5 py-3">
      <p className="text-foreground/80 text-xs font-semibold tracking-wide uppercase">
        Contoh
      </p>
      <p className="text-foreground mt-1.5 text-sm leading-relaxed">
        {exampleBody(example)}
      </p>
    </div>
  );
}

export function PanduanWorkspace({
  steps,
  displayName,
  isCompleted,
}: PanduanWorkspaceProps) {
  const router = useRouter();
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [viewedStepIds, setViewedStepIds] = useState<Set<string>>(new Set());
  const [activeStepId, setActiveStepId] = useState(steps[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = displayName.trim().split(/\s+/)[0] || displayName;
  const contentSteps = steps.filter((step) => step.id !== "selesai");
  const finishStep = steps.find((step) => step.id === "selesai");
  const viewedCount = viewedStepIds.size;
  const progressPercent = Math.round((viewedCount / contentSteps.length) * 100);

  const markViewed = useCallback((stepId: string) => {
    setViewedStepIds((current) => {
      if (current.has(stepId)) {
        return current;
      }
      const next = new Set(current);
      next.add(stepId);
      return next;
    });
  }, []);

  useEffect(() => {
    const elements = contentSteps
      .map((step) => sectionRefs.current.get(step.id))
      .filter((element): element is HTMLElement => element != null);

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveStepId(visible[0].target.id);
        }

        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            markViewed(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [contentSteps, markViewed]);

  function scrollToStep(stepId: string) {
    sectionRefs.current.get(stepId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleComplete() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
      });
      const data = (await response.json()) as {
        message?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal menyelesaikan panduan.");
        return;
      }

      router.push(data.redirectTo ?? appRoutes.dashboard);
      router.refresh();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-col gap-6 pb-28 lg:flex-row lg:items-start lg:gap-8">
        <aside className="lg:sticky lg:top-4 lg:w-72 lg:shrink-0">
          <div className="surface-panel rounded-lg border p-4">
            <p className="text-foreground/70 text-xs font-semibold tracking-wide uppercase">
              Checklist
            </p>
            <p className="text-foreground mt-1 text-sm font-medium">
              {viewedCount} dari {contentSteps.length} langkah
            </p>
            <div
              className="bg-border mt-3 h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres panduan"
            >
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <nav
              className="mt-4 hidden flex-col gap-0.5 lg:flex"
              aria-label="Langkah panduan"
            >
              {contentSteps.map((step) => {
                const isViewed = viewedStepIds.has(step.id);
                const isActive = activeStepId === step.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => scrollToStep(step.id)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-md border-l-2 py-2 pr-2 pl-2.5 text-left text-sm transition-colors",
                      isActive
                        ? "border-primary bg-primary/8 text-foreground font-medium"
                        : "text-foreground/70 hover:bg-muted/50 hover:text-foreground border-transparent"
                    )}
                  >
                    {isViewed ? (
                      <Check
                        className="text-primary mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="text-foreground/40 mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                    )}
                    <span>{step.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Halo, {firstName}
            </h1>
            <p className="text-foreground/70 mt-1.5 text-sm leading-relaxed">
              {isCompleted
                ? "Buka kapan saja kalau perlu ingat fitur AgentX."
                : "Baca dulu sebelum mulai. Scroll tiap bagian untuk melengkapi checklist."}
            </p>
          </div>

          {isCompleted ? (
            <div className="border-primary/25 bg-primary/5 rounded-lg border px-4 py-3.5">
              <p className="text-foreground font-medium">Panduan selesai</p>
              <p className="text-foreground/75 mt-1 text-sm">
                Onboarding sudah selesai.{" "}
                <Link
                  href={appRoutes.dashboard}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Buka Dashboard
                </Link>
              </p>
            </div>
          ) : null}

          <div className="divide-border surface-panel divide-y overflow-hidden rounded-lg border">
            {contentSteps.map((step, index) => (
              <section
                key={step.id}
                id={step.id}
                ref={(element) => {
                  if (element) {
                    sectionRefs.current.set(step.id, element);
                  } else {
                    sectionRefs.current.delete(step.id);
                  }
                }}
                className="scroll-mt-20 p-5 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <span className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-foreground text-lg font-semibold tracking-tight">
                      {step.title}
                    </h2>
                    <p className="text-foreground/75 mt-2 text-sm leading-relaxed">
                      {step.description}
                    </p>
                    {step.example ? <StepExample example={step.example} /> : null}
                    {step.href ? (
                      <Button asChild variant="outline" size="sm" className="mt-4">
                        <Link href={step.href}>Buka {step.title}</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </section>
            ))}

            <section id="selesai" className="scroll-mt-20 p-5 sm:p-6">
              <h2 className="text-foreground text-lg font-semibold tracking-tight">
                Selesai
              </h2>
              <p className="text-foreground/75 mt-2 text-sm leading-relaxed">
                {finishStep?.description}
              </p>
              {finishStep?.example ? (
                <StepExample example={finishStep.example} />
              ) : null}
            </section>
          </div>
        </div>
      </div>

      {!isCompleted ? (
        <div className="border-border bg-card/95 fixed inset-x-0 bottom-0 z-10 border-t backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <p className="text-foreground/75 hidden text-sm sm:block">
              Tandai selesai setelah membaca panduan.
            </p>
            <div className="flex w-full flex-col items-stretch gap-2 sm:ml-auto sm:w-auto sm:items-end">
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="sm:min-w-44"
              >
                {isSubmitting ? "Menyimpan..." : "Selesaikan panduan"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
