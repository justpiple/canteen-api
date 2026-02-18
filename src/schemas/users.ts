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
export type UpdateProfileRequest = z.infer<typeof updateProfileBodySchema>;

/**
 * @example {
 *   "oldPassword": "password123",
 *   "newPassword": "newpassword123"
 * }
 */
export type UpdatePasswordRequest = z.infer<typeof updatePasswordBodySchema>;

/**
 * @example {
 *   "email": "owner@example.com",
 *   "name": "Canteen Owner",
 *   "phone": "08123456789"
 * }
 */
export type AdminUpdateCanteenOwnerRequest = z.infer<
  typeof adminUpdateCanteenOwnerBodySchema
>;
