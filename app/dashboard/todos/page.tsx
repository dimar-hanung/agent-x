import { TodoWorkspace } from "@/components/dashboard/todos/todo-workspace";
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
import { listTodosByUserId } from "@/lib/todos/repository";

export default async function TodosPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const todos = await listTodosByUserId(user.userId);

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
                <BreadcrumbPage>Todo</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Todo</h1>
          <p className="text-muted-foreground text-sm">
            Kelola tugas pribadi dalam tampilan Kanban atau tabel. Status
            Menunggu berarti tugas harus menunggu.
          </p>
        </div>
        <TodoWorkspace initialTodos={todos} />
      </div>
    </>
  );
}
