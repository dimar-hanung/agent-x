import { notFound } from "next/navigation";

import { TodoDetail } from "@/components/dashboard/todos/todo-detail";
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
import { appRoutes } from "@/lib/site-config";
import {
  getTodoByIdOrCode,
  listTodosByUserId,
} from "@/lib/todos/repository";

interface TodoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TodoDetailPage({ params }: TodoDetailPageProps) {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const { id } = await params;
  const todo = await getTodoByIdOrCode(user.userId, { id });

  if (!todo) {
    notFound();
  }

  const todos = await listTodosByUserId(user.userId);
  const projectSuggestions = [
    ...new Set(
      todos
        .map((item) => item.project)
        .filter((project): project is string => Boolean(project))
    ),
  ].sort((a, b) => a.localeCompare(b, "id"));

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
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink href={appRoutes.todos}>Todo</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{todo.code}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <TodoDetail todo={todo} projectSuggestions={projectSuggestions} />
      </div>
    </>
  );
}
