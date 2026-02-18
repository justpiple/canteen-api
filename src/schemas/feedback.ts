import z from "zod";

export const createFeedbackBodySchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: z.string().optional(),
});

export type CreateFeedbackRequest = z.infer<typeof createFeedbackBodySchema>;
