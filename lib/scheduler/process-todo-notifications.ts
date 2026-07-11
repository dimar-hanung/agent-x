import {
  getUserWhatsAppPhone,
  isChannelConnected,
  sendWhatsAppToUser,
} from "@/lib/integrations/whatsapp-channel-repository";
import { formatTodoDate } from "@/lib/todos/labels";
import {
  claimDueReminders,
  completeTodoAfterStartNotify,
  listTodosDueToStart,
  listTodosWithDueReminders,
} from "@/lib/todos/repository";

async function canNotifyUser(userId: string): Promise<boolean> {
  const connected = await isChannelConnected();
  if (!connected) {
    return false;
  }
  const phone = await getUserWhatsAppPhone(userId);
  return Boolean(phone);
}

async function processEarlyReminders(now: Date): Promise<void> {
  const due = await listTodosWithDueReminders(now);

  for (const todo of due) {
    try {
      if (!(await canNotifyUser(todo.userId))) {
        console.warn(
          `[scheduler] skip todo reminder ${todo.code}: WhatsApp belum siap`
        );
        continue;
      }

      const claimed = await claimDueReminders(todo.id, now);
      if (!claimed || claimed.claimed.length === 0) {
        continue;
      }

      const startLabel = claimed.startsAt
        ? formatTodoDate(claimed.startsAt.toISOString())
        : "—";
      const message = `Pengingat: ${claimed.code} — ${claimed.title} (mulai ${startLabel})`;

      try {
        await sendWhatsAppToUser(claimed.userId, message);
      } catch (error) {
        console.error(
          `[scheduler] gagal kirim pengingat todo ${claimed.code}:`,
          error
        );
      }
    } catch (error) {
      console.error(`[scheduler] todo reminder ${todo.id} failed:`, error);
    }
  }
}

async function processStartNotifies(now: Date): Promise<void> {
  const due = await listTodosDueToStart(now);

  for (const todo of due) {
    try {
      if (!(await canNotifyUser(todo.userId))) {
        console.warn(
          `[scheduler] skip todo start ${todo.code}: WhatsApp belum siap`
        );
        continue;
      }

      const message = `Waktunya: ${todo.code} — ${todo.title}`;
      await sendWhatsAppToUser(todo.userId, message);

      const completed = await completeTodoAfterStartNotify(todo.id);
      if (completed) {
        console.log(
          `[scheduler] todo ${todo.code} selesai setelah notifikasi mulai`
        );
      }
    } catch (error) {
      console.error(`[scheduler] todo start ${todo.id} failed:`, error);
    }
  }
}

/** Process due todo early reminders and starts_at notifications. */
export async function processDueTodoNotifications(
  now: Date = new Date()
): Promise<void> {
  await processEarlyReminders(now);
  await processStartNotifies(now);
}
