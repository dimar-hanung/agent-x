export type AppRole = "admin" | "student" | "guest";

export interface UserContext {
  userId: string;
  email: string;
  role: AppRole;
  displayName: string;
}
