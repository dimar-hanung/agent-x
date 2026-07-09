export type AppRole = "admin" | "client" | "guest";

export interface UserContext {
  userId: string;
  email: string;
  role: AppRole;
  displayName: string;
}
