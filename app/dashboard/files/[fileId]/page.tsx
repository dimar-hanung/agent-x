import { notFound } from "next/navigation";

import { FileChatLayout } from "@/components/dashboard/files/file-chat-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  getOrCreateChatForFile,
  loadChatMessagesPage,
} from "@/lib/db/repositories/chat-repository";
import { isIndexableFile } from "@/lib/files/constants";
import { getFileIndexStatus } from "@/lib/files/index-repository";
import { getFileById } from "@/lib/files/repository";
import { appRoutes } from "@/lib/site-config";

export default async function FileChatPage({
  params,
}: {
  params: Promise<{ fileId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const { fileId } = await params;
  const file = await getFileById(user.userId, fileId);

  if (!file || file.kind !== "file" || file.status !== "ready") {
    notFound();
  }

  if (!isIndexableFile(file.mimeType, file.name)) {
    notFound();
  }

  const chatId = await getOrCreateChatForFile(user.userId, fileId, file.name);
  const index = await getFileIndexStatus(user.userId, fileId);
  const indexStatus = index?.status ?? "none";

  let initialMessages: Awaited<
    ReturnType<typeof loadChatMessagesPage>
  >["messages"] = [];
  try {
    const page = await loadChatMessagesPage(chatId, user.userId, { limit: 30 });
    initialMessages = page.messages;
  } catch {
    initialMessages = [];
  }

  const uiMessages = initialMessages.map(
    ({ sequence: _sequence, ...message }) => message
  );

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={appRoutes.dashboard}>
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink href={appRoutes.files}>File</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Tanya isi</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col p-4 pt-0">
        <FileChatLayout
          fileId={fileId}
          fileName={file.name}
          chatId={chatId}
          initialIndexStatus={indexStatus}
          initialMessages={uiMessages}
        />
      </div>
    </>
  );
}
