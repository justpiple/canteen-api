import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Path,
  Query,
  Request,
  Route,
  Security,
  Tags,
  Response,
  SuccessResponse,
} from "tsoa";
import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";
import { getCanteenByOwnerId } from "@/utils/canteens";
import {
  createOrderBodySchema,
  listOrdersQuerySchema,
  updateOrderStatusBodySchema,
  OrderBy,
  OrderStatus,
  PaymentStatus,
  type CreateOrderRequest,
  type UpdateOrderStatusRequest,
} from "@/schemas/orders";
import {
  AUTH_ERROR_401,
  AUTH_ERROR_403,
  type AuthenticatedRequest,
  type AuthenticationErrorResponse,
} from "@/middlewares/authentication";
import { snapClient } from "@/lib/midtrans";
import { PaymentStatus as PrismaPaymentStatus } from "generated/prisma/enums";

export type OrderItemResponse = {
  id: string;
  menuId: string;
  quantity: number;
  priceAtOrder: number;
};

export type OrderItemDetailResponse = {
  id: string;
  menuId: string;
  menuName: string;
  menuPhotoUrl: string | null;
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
  paymentLink: string | null;
};

export type OrderListResponse = {
  id: string;
  canteenId: string;
  canteenName: string;
  paymentStatus: string;
  orderStatus: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDetailResponse = {
  id: string;
  userId: string;
  userName: string;
  canteenId: string;
  canteenName: string;
  paymentStatus: string;
  orderStatus: string;
  items: OrderItemDetailResponse[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateOrderResponse = {
  message: string;
  order: OrderResponse;
};

export type ListOrdersResponse = {
  orders: OrderListResponse[];
};

export type GetOrderDetailResponse = {
  order: OrderDetailResponse;
};

export type UpdateOrderStatusResponse = {
  message: string;
};

@Route("orders")
@Tags("Orders")
@Security("bearerAuth")
@Response<AuthenticationErrorResponse>(401, AUTH_ERROR_401)
export class OrdersController extends Controller {
  /**
   * Create a new order. User can order multiple items from the same canteen.
   * Use https://simulator.sandbox.midtrans.com/ to test the payment link.
   */
  @Post()
  @SuccessResponse(201, "Created")
  @Security("bearerAuth", ["USER"])
  @Response<AuthenticationErrorResponse>(403, AUTH_ERROR_403)
  public async createOrder(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateOrderRequest
  ): Promise<CreateOrderResponse> {
    const data = createOrderBodySchema.parse(body);
    const user = request.user!;
    const userId = user.id;

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

      const paymentLink = await snapClient?.createTransaction({
        item_details: menus.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: orderItems.find((o) => o.menuId === item.id)?.quantity!,
        })),
        transaction_details: {
          order_id: newOrder.id,
          gross_amount: newOrder.items.reduce(
            (sum, item) => sum + item.priceAtOrder * item.quantity,
            0
          ),
        },
        customer_details: {
          email: user.email,
          phone: user.phone ?? undefined,
          first_name: user.name,
        },
      });

      const paymentLinkUrl = paymentLink?.redirect_url;
      if (paymentLinkUrl) {
        await tx.order.update({
          where: { id: newOrder.id },
          data: { paymentLink: paymentLinkUrl },
        });
      }

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

      return { ...newOrder, paymentLink: paymentLinkUrl };
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
        paymentLink: order.paymentLink ?? null,
      },
    };
  }

  /**
   * List orders. For USER: returns their own orders. For CANTEEN_OWNER: returns orders to their canteen.
   */
  @Get()
  @Security("bearerAuth", ["USER", "CANTEEN_OWNER"])
  @Response<AuthenticationErrorResponse>(403, AUTH_ERROR_403)
  public async listOrders(
    @Request() request: AuthenticatedRequest,
    @Query() orderStatus?: OrderStatus,
    @Query() paymentStatus?: PaymentStatus,
    @Query() orderBy?: OrderBy
  ): Promise<ListOrdersResponse> {
    const user = request.user!;
    const queryData = listOrdersQuerySchema.parse({
      orderStatus,
      paymentStatus,
      orderBy,
    });

    let canteenId: string | undefined;

    if (user.role === "CANTEEN_OWNER") {
      const canteen = await getCanteenByOwnerId(user.id);
      canteenId = canteen.id;
    }

    const orders = await prisma.order.findMany({
      where: {
        ...(user.role === "USER" ? { userId: user.id } : {}),
        ...(user.role === "CANTEEN_OWNER" && canteenId ? { canteenId } : {}),
        ...(queryData.orderStatus
          ? { orderStatus: queryData.orderStatus }
          : {}),
        ...(queryData.paymentStatus
          ? { paymentStatus: queryData.paymentStatus }
          : {}),
      },
      include: {
        canteen: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          select: {
            quantity: true,
            priceAtOrder: true,
          },
        },
      },
      orderBy: {
        createdAt: queryData.orderBy,
      },
    });

    return {
      orders: orders.map((order) => {
        const totalAmount = order.items.reduce(
          (sum: number, item: { quantity: number; priceAtOrder: number }) =>
            sum + item.priceAtOrder * item.quantity,
          0
        );

        return {
          id: order.id,
          canteenId: order.canteenId,
          canteenName: order.canteen.name,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          totalAmount,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          ...(user.role === "USER" ? { paymentLink: order.paymentLink } : {}),
        };
      }),
    };
  }

  /**
   * Get order detail with complete information including order items.
   */
  @Get("{orderId}")
  @Security("bearerAuth", ["USER", "CANTEEN_OWNER"])
  @Response<AuthenticationErrorResponse>(403, AUTH_ERROR_403)
  public async getOrderDetail(
    @Request() request: AuthenticatedRequest,
    @Path() orderId: string
  ): Promise<GetOrderDetailResponse> {
    const user = request.user!;

    let canteenId: string | undefined;

    if (user.role === "CANTEEN_OWNER") {
      const canteen = await getCanteenByOwnerId(user.id);
      canteenId = canteen.id;
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...(user.role === "USER" ? { userId: user.id } : {}),
        ...(user.role === "CANTEEN_OWNER" && canteenId ? { canteenId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        canteen: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            menu: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw toHttpError(404, "Order not found");
    }

    const totalAmount = order.items.reduce(
      (sum, item) => sum + item.priceAtOrder * item.quantity,
      0
    );

    return {
      order: {
        id: order.id,
        userId: order.userId,
        userName: order.user.name,
        canteenId: order.canteenId,
        canteenName: order.canteen.name,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        items: order.items.map((item) => ({
          id: item.id,
          menuId: item.menuId,
          menuName: item.menu.name,
          menuPhotoUrl: item.menu.photoUrl,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder,
        })),
        totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    };
  }

  /**
   * Update order status. For Canteen owners only. Can update status to Cooking, Ready, or Completed.
   */
  @Patch("{orderId}/status")
  @Security("bearerAuth", ["CANTEEN_OWNER"])
  @Response<AuthenticationErrorResponse>(403, AUTH_ERROR_403)
  public async updateOrderStatus(
    @Request() request: AuthenticatedRequest,
    @Path() orderId: string,
    @Body() body: UpdateOrderStatusRequest
  ): Promise<UpdateOrderStatusResponse> {
    const data = updateOrderStatusBodySchema.parse(body);
    const ownerId = request.user?.id!;

    const canteen = await getCanteenByOwnerId(ownerId);

    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        canteenId: canteen.id,
      },
    });

    if (!existingOrder) {
      throw toHttpError(404, "Order not found for this canteen");
    }

    if (existingOrder.paymentStatus !== PrismaPaymentStatus.PAID) {
      throw toHttpError(400, "Payment for this order is not completed");
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: data.orderStatus,
      },
    });

    return {
      message: "Order status updated successfully",
    };
  }
}
