export const SCHEDULE_RUN_COMPLETE_EVENT = "agentx:schedule-run-complete";

export interface ScheduleRunCompleteDetail {
  scheduleId: string;
  title: string;
  chatId: string | null;
  success: boolean;
  lastError: string | null;
}

export function dispatchScheduleRunComplete(detail: ScheduleRunCompleteDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ScheduleRunCompleteDetail>(SCHEDULE_RUN_COMPLETE_EVENT, {
      detail,
    })
  );
}
