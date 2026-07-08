import { z } from "zod";

export const roleInfoInputSchema = z.object({});

export type RoleInfoInput = z.infer<typeof roleInfoInputSchema>;
