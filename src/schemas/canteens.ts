import { z } from "zod";

export const upsertCanteenBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z
    .union([z.string().min(1, "Description must not be empty"), z.null()])
    .optional(),
});

/**
 * @example {
 *   "name": "Good Canteen",
 *   "description": "The best canteen in the world"
 * }
 */
export interface UpsertCanteenRequest {
  name: string;
  description?: string | null;
}
