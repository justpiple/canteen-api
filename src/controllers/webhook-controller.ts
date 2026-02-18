import { Body, Controller, Post, Route, Tags, Response } from "tsoa";
import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";
import { webhookHandler } from "@/lib/midtrans";
import { MidtransWebhookBody } from "midtrans-ts-wrapper";

export type WebhookResponse = {
  message: string;
};

@Route("webhooks")
@Tags("Webhooks")
export class WebhookController extends Controller {
  /**
   * Midtrans webhook endpoint. Receives payment notifications and updates order payment status.
   */
  @Post("midtrans")
  @Response<WebhookResponse>(200, "OK")
  public async handleMidtransWebhook(
    @Body() body: MidtransWebhookBody
  ): Promise<WebhookResponse> {
    if (!webhookHandler) {
      throw toHttpError(500, "Webhook handler not configured");
    }

    const isValid = webhookHandler.verifySignature(body);

    if (!isValid) {
      throw toHttpError(401, "Invalid webhook signature");
    }

    const orderId = body.order_id;
    const transactionStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw toHttpError(404, `Order not found: ${orderId}`);
    }

    let paymentStatus: "PAID" | "UNPAID" | "CANCELLED" = "UNPAID";

    switch (transactionStatus) {
      case "settlement":
      case "capture":
        if (fraudStatus === "accept") {
          paymentStatus = "PAID";
        }
        break;
      case "cancel":
      case "expire":
      case "deny":
      case "failure":
        paymentStatus = "CANCELLED";
        break;
    }

    if (order.paymentStatus !== paymentStatus) {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus },
      });

      if (paymentStatus === "CANCELLED") {
        for (const item of order.items) {
          await prisma.menu.update({
            where: { id: item.menuId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }
    }

    return {
      message: "OK",
    };
  }
}
