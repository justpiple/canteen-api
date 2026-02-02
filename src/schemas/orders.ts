import {
  OrderStatus as PrismaOrderStatus,
  PaymentStatus as PrismaPaymentStatus,
} from "@prisma-client";
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

export type PaymentStatus = "PAID" | "UNPAID" | "CANCELLED";
export type OrderBy = "ASC" | "DESC";
export type OrderStatus = "WAITING" | "COOKING" | "READY" | "COMPLETED";

export const listOrdersQuerySchema = z.object({
  orderStatus: z.enum(PrismaOrderStatus).optional(),
  paymentStatus: z.enum(PrismaPaymentStatus).optional(),
  orderBy: z.enum(["asc", "desc"]).default("desc"),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
