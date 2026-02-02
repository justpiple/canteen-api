import z from "zod";

export const createOrderBodySchema = z.object({
  items: z
    .array(
      z.object({
        menuId: z.string().min(1, "Menu ID is required"),
        quantity: z
          .number()
          .int("Quantity must be an integer")
          .positive("Quantity must be greater than 0"),
      })
    )
    .min(1, "At least one item is required"),
});

export type CreateOrderRequest = z.infer<typeof createOrderBodySchema>;
