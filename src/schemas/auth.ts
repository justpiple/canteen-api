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

/**
 * @example {
 *   "email": "user@example.com",
 *   "password": "password123",
 *   "name": "John Doe",
 *   "phone": "08123456789"
 * }
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  /** Optional */
  phone?: string;
}

/**
 * @example {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 */
export interface LoginRequest {
  email: string;
  password: string;
}
