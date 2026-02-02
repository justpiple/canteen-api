import {
  Body,
  Controller,
  Post,
  Request,
  Route,
  Security,
  Tags,
  Response,
  SuccessResponse,
} from "tsoa";
import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";
import {
  createOrderBodySchema,
  type CreateOrderRequest,
} from "@/schemas/orders";
import {
  AUTH_ERROR_401,
  type AuthenticatedRequest,
  type AuthenticationErrorResponse,
} from "@/middlewares/authentication";

export type OrderItemResponse = {
  id: string;
  menuId: string;
  quantity: number;
  priceAtOrder: number;
};

export type OrderResponse = {
  id: string;
  userId: string;
  canteenId: string;
  paymentStatus: string;
  orderStatus: string;
  items: OrderItemResponse[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateOrderResponse = {
  message: string;
  order: OrderResponse;
};

@Route("orders")
@Tags("Orders")
@Security("bearerAuth")
@Response<AuthenticationErrorResponse>(401, AUTH_ERROR_401)
export class OrdersController extends Controller {
  /**
   * Create a new order. User can order multiple items from the same canteen.
   */
  @Post()
  @SuccessResponse(201, "Created")
  @Security("bearerAuth", ["USER"])
  public async createOrder(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateOrderRequest
  ): Promise<CreateOrderResponse> {
    const data = createOrderBodySchema.parse(body);
    const userId = request.user?.id!;

    const order = await prisma.$transaction(async (tx) => {
      const menuIds = data.items.map((item) => item.menuId);
      const menus = await tx.menu.findMany({
        where: {
          id: { in: menuIds },
          deletedAt: null,
        },
        include: {
          canteen: { select: { id: true } },
        },
      });

      if (menus.length !== menuIds.length) {
        const foundMenuIds = new Set(menus.map((m) => m.id));
        const missingMenuIds = menuIds.filter((id) => !foundMenuIds.has(id));
        throw toHttpError(
          404,
          `Menu(s) not found: ${missingMenuIds.join(", ")}`
        );
      }

      const canteenIds = [...new Set(menus.map((m) => m.canteenId))];
      if (canteenIds.length > 1) {
        throw toHttpError(400, "All items must be from the same canteen");
      }

      const canteenId = canteenIds[0];

      const orderItems: Array<{
        menuId: string;
        quantity: number;
        priceAtOrder: number;
      }> = [];

      for (const item of data.items) {
        const menu = menus.find((m) => m.id === item.menuId);
        if (!menu) {
          throw toHttpError(404, `Menu ${item.menuId} not found`);
        }

        if (menu.stock < item.quantity) {
          throw toHttpError(
            400,
            `Insufficient stock for menu "${menu.name}". Available: ${menu.stock}, Requested: ${item.quantity}`
          );
        }

        orderItems.push({
          menuId: menu.id,
          quantity: item.quantity,
          priceAtOrder: menu.price,
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          canteenId,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      });

      for (const item of data.items) {
        await tx.menu.update({
          where: { id: item.menuId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newOrder;
    });

    this.setStatus(201);
    return {
      message: "Order created successfully",
      order: {
        id: order.id,
        userId: order.userId,
        canteenId: order.canteenId,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        items: order.items.map((item) => ({
          id: item.id,
          menuId: item.menuId,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder,
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    };
  }
}
