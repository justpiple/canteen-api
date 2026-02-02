import { Body, Controller, Patch, Request, Route, Security, Tags } from "tsoa";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";
import {
  updateProfileBodySchema,
  type UpdateProfileRequest,
  updatePasswordBodySchema,
  type UpdatePasswordRequest,
} from "@/schemas/users";
import type { AuthenticatedRequest } from "@/middlewares/authentication";

export type UpdateProfileResponse = {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    phone: string | null;
  };
};

export type UpdatePasswordResponse = {
  message: string;
};

@Route("users")
@Tags("Users")
export class UsersController extends Controller {
  /**
   * Update current user's profile.
   */
  @Patch("me")
  @Security("bearerAuth")
  public async updateMe(
    @Request() request: AuthenticatedRequest,
    @Body() body: UpdateProfileRequest
  ): Promise<UpdateProfileResponse> {
    const data = updateProfileBodySchema.parse(body);
    const userId = request.user?.id!;

    const existing = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!existing) {
      throw toHttpError(404, "User not found");
    }

    const updateData: { name?: string; phone?: string | null } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone ?? null;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return {
      message: "Profile updated successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  /**
   * Update current user's password.
   */
  @Patch("me/password")
  @Security("bearerAuth")
  public async updateMyPassword(
    @Request() request: AuthenticatedRequest,
    @Body() body: UpdatePasswordRequest
  ): Promise<UpdatePasswordResponse> {
    const data = updatePasswordBodySchema.parse(body);
    const userId = request.user?.id!;

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw toHttpError(404, "User not found");
    }

    const validOldPassword = await bcrypt.compare(
      data.oldPassword,
      user.password
    );
    if (!validOldPassword) {
      throw toHttpError(400, "Old password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: "Password updated successfully" };
  }
}
