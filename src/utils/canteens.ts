import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";

/**
 * Get canteen by owner ID.
 * @throws HttpError 404 if canteen not found
 */
export async function getCanteenByOwnerId(ownerId: string) {
  const canteen = await prisma.canteen.findFirst({
    where: { ownerId },
  });

  if (!canteen) {
    throw toHttpError(404, "Canteen not found for this owner");
  }

  return canteen;
}

/**
 * Check if canteen exists for owner ID.
 */
export async function findCanteenByOwnerId(ownerId: string) {
  return await prisma.canteen.findFirst({
    where: { ownerId },
  });
}
