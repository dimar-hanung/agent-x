import { appRoutes } from "@/lib/site-config";

export async function requestScheduleNotificationPermission(): Promise<NotificationPermission | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showScheduleCompleteNotification({
  title,
  success,
  chatId,
}: {
  title: string;
  success: boolean;
  chatId: string | null;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const body = success
    ? "Otomatisasi selesai dijalankan."
    : "Otomatisasi gagal dijalankan. Buka chat untuk detail.";

  const notification = new Notification(
    success ? `Otomatisasi selesai: ${title}` : `Otomatisasi gagal: ${title}`,
    {
      body,
      tag: `schedule-${title}`,
      icon: "/favicon.ico",
    }
  );

  if (chatId) {
    notification.onclick = () => {
      window.focus();
      window.location.assign(`${appRoutes.chat}/${chatId}`);
      notification.close();
    };
  }
}
