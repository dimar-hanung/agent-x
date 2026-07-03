"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { GmailIntegrationStatus } from "@/lib/integrations/gmail-repository";

interface GmailIntegrationCardProps {
  initialStatus: GmailIntegrationStatus;
}

export function GmailIntegrationCard({
  initialStatus,
}: GmailIntegrationCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, appPassword }),
      });

      const data = (await response.json()) as GmailIntegrationStatus & {
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Failed to connect Gmail.");
        return;
      }

      setStatus(data);
      setEmail("");
      setAppPassword("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/gmail", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "Failed to disconnect Gmail.");
        return;
      }

      setStatus({ connected: false });
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
          <CardDescription>
            Your Gmail account is connected for send and inbox tools in chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Connected as </span>
            <span className="font-medium">{status.email}</span>
          </p>
          {status.lastVerifiedAt ? (
            <p className="text-muted-foreground text-sm">
              Last verified:{" "}
              {new Date(status.lastVerifiedAt).toLocaleString()}
            </p>
          ) : null}
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gmail</CardTitle>
        <CardDescription>
          Connect your Gmail account with a Google app password to send and read
          email from chat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleConnect}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="gmail-email">Gmail address</FieldLabel>
              <Input
                id="gmail-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@gmail.com"
                required
                autoComplete="email"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="gmail-app-password">App password</FieldLabel>
              <Input
                id="gmail-app-password"
                type="password"
                value={appPassword}
                onChange={(event) => setAppPassword(event.target.value)}
                placeholder="16-character app password"
                required
                autoComplete="off"
              />
              <FieldDescription>
                Create an app password in your Google Account under Security →
                2-Step Verification → App passwords.{" "}
                <a
                  href="https://support.google.com/accounts/answer/185833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  Learn more
                </a>
              </FieldDescription>
            </Field>
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Connecting..." : "Connect Gmail"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
