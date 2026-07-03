import type { AppRole, UserContext } from "./types";

export const DEV_USERS: Record<AppRole, UserContext> = {
  guest: {
    userId: "dev-guest",
    email: "guest@example.com",
    role: "guest",
    displayName: "Dev Guest",
  },
  student: {
    userId: "dev-001",
    email: "student@example.com",
    role: "student",
    displayName: "Dev Student",
  },
  admin: {
    userId: "dev-admin",
    email: "admin@example.com",
    role: "admin",
    displayName: "Dev Admin",
  },
};

/** Edit this constant to switch the active dev user/role. */
export const HARDCODED_USER: UserContext = DEV_USERS.student;
