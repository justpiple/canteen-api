import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

export const loginBodySchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterRequest = z.infer<typeof registerBodySchema>;
export type LoginRequest = z.infer<typeof loginBodySchema>;
