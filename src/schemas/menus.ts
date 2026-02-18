import z from "zod";

const baseMenuBodySchema = {
  name: z.string().min(1, "Name is required"),
  description: z
    .union([z.string().min(1, "Description must not be empty"), z.null()])
    .optional(),
  stock: z
    .number()
    .int("Stock must be an integer")
    .nonnegative("Stock must be greater than or equal to 0")
    .optional(),
};

export const createMenuBodySchema = z.object({
  ...baseMenuBodySchema,
  price: z
    .number()
    .int("Price must be an integer")
    .nonnegative("Price must be greater than or equal to 0"),
});

export const updateMenuBodySchema = z.object({
  ...baseMenuBodySchema,
  price: z
    .number()
    .int("Price must be an integer")
    .nonnegative("Price must be greater than or equal to 0")
    .optional(),
});

export type CreateMenuRequest = z.infer<typeof createMenuBodySchema>;
export type UpdateMenuRequest = z.infer<typeof updateMenuBodySchema>;
