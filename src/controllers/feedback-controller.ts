import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
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
import { getCanteenByOwnerId } from "@/utils/canteens";
import {
  createFeedbackBodySchema,
  type CreateFeedbackRequest,
} from "@/schemas/feedback";
import {
  AUTH_ERROR_401,
  AUTH_ERROR_403,
  type AuthenticatedRequest,
  type AuthenticationErrorResponse,
} from "@/middlewares/authentication";
import { OrderStatus } from "@prisma-client";

export type FeedbackResponse = {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
};

export type CreateFeedbackResponse = {
  message: string;
  feedback: FeedbackResponse;
};

export type GetFeedbackResponse = {
  feedback: FeedbackResponse;
};

export type ListFeedbacksResponse = {
  feedbacks: FeedbackResponse[];
};

@Route("feedback")
@Tags("Feedback")
@Response<AuthenticationErrorResponse>(401, AUTH_ERROR_401)
@Response<AuthenticationErrorResponse>(403, AUTH_ERROR_403)
export class FeedbackController extends Controller {
  /**
   * Create feedback for a completed order. Users can only leave feedback for their own completed orders.
   */
  @Post()
  @SuccessResponse(201, "Created")
  @Security("bearerAuth", ["USER"])
  public async createFeedback(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateFeedbackRequest
  ): Promise<CreateFeedbackResponse> {
    const data = createFeedbackBodySchema.parse(body);
    const userId = request.user?.id!;

    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        userId: userId,
      },
    });

    if (!order) {
      throw toHttpError(404, "Order not found");
    }

    if (order.orderStatus !== OrderStatus.COMPLETED) {
      throw toHttpError(
        400,
        "Feedback can only be created for completed orders"
      );
    }

    const existingFeedback = await prisma.feedback.findFirst({
      where: {
        orderId: data.orderId,
      },
    });

    if (existingFeedback) {
      throw toHttpError(409, "Feedback already exists for this order");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const feedback = await prisma.feedback.create({
      data: {
        orderId: data.orderId,
        userId: userId,
        rating: data.rating,
        comment: data.comment ?? null,
      },
    });

    this.setStatus(201);
    return {
      message: "Feedback created successfully",
      feedback: {
        id: feedback.id,
        orderId: feedback.orderId,
        userId: feedback.userId,
        userName: user!.name,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
      },
    };
  }

  /**
   * List feedbacks. For USER: returns their own feedbacks. For CANTEEN_OWNER: returns feedbacks for their canteen orders.
   */
  @Get()
  @Security("bearerAuth", ["USER", "CANTEEN_OWNER"])
  public async listFeedbacks(
    @Request() request: AuthenticatedRequest
  ): Promise<ListFeedbacksResponse> {
    const user = request.user!;

    let canteenId: string | undefined;

    if (user.role === "CANTEEN_OWNER") {
      const canteen = await getCanteenByOwnerId(user.id);
      canteenId = canteen.id;
    }

    const feedbacks = await prisma.feedback.findMany({
      where: {
        deletedAt: null,
        ...(user.role === "USER" ? { userId: user.id } : {}),
        ...(user.role === "CANTEEN_OWNER" && canteenId
          ? {
              order: {
                canteenId: canteenId,
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      feedbacks: feedbacks.map((feedback) => ({
        id: feedback.id,
        orderId: feedback.orderId,
        userId: feedback.userId,
        userName: feedback.user.name,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
      })),
    };
  }

  /**
   * Delete feedback. Canteen owners can delete feedbacks for orders in their canteen.
   */
  @Delete("{feedbackId}")
  @SuccessResponse(204, "Success - No Content")
  @Security("bearerAuth", ["CANTEEN_OWNER"])
  public async deleteFeedback(
    @Request() request: AuthenticatedRequest,
    @Path() feedbackId: string
  ): Promise<void> {
    const ownerId = request.user?.id!;

    const canteen = await getCanteenByOwnerId(ownerId);

    const feedback = await prisma.feedback.updateMany({
      where: { id: feedbackId, order: { canteenId: canteen.id } },
      data: {
        deletedAt: new Date(),
      },
    });

    if (feedback.count === 0) {
      throw toHttpError(404, "Feedback not found");
    }

    this.setStatus(204);
  }
}
