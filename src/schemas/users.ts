import { z } from "zod";

export const updateProfileBodySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  phone: z
    .union([z.string().min(1, "Phone must not be empty"), z.null()])
    .optional(),
});

export const updatePasswordBodySchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const adminUpdateCanteenOwnerBodySchema = z.object({
  email: z.email("Invalid email format").optional(),
  name: z.string().min(1, "Name is required").optional(),
  phone: z
    .union([z.string().min(1, "Phone must not be empty"), z.null()])
    .optional(),
});

/**
 * @example {
 *   "name": "John Doe",
 *   "phone": "08123456789"
 * }
 */
export interface UpdateProfileRequest {
  name?: string;
  phone?: string | null;
}

/**
 * @example {
 *   "oldPassword": "password123",
 *   "newPassword": "newpassword123"
 * }
 */
export interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * @example {
 *   "email": "owner@example.com",
 *   "name": "Canteen Owner",
 *   "phone": "08123456789"
 * }
 */
export interface AdminUpdateCanteenOwnerRequest {
  email?: string;
  name?: string;
  phone?: string | null;
}
