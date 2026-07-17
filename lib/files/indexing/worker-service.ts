import { claimNextIndexJob } from "@/lib/files/index-repository";
import { runIndexJobForFile } from "@/lib/files/indexing/run-index-job";

export async function runFilesIndexWorkerOnce(): Promise<boolean> {
  const job = await claimNextIndexJob();
  if (!job) {
    return false;
  }

  await runIndexJobForFile(job.userId, job.fileId);
  return true;
}
