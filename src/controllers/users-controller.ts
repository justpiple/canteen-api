import {
  Body,
  Controller,
  Delete,
  Patch,
  Post,
  Request,
  Response,
  Route,
  Security,
  Tags,
  Path,
  SuccessResponse,
} from "tsoa";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";
import {
  adminUpdateCanteenOwnerBodySchema,
  type AdminUpdateCanteenOwnerRequest,
  updatePasswordBodySchema,
  updateProfileBodySchema,
  type UpdatePasswordRequest,
  type UpdateProfileRequest,
} from "@/schemas/users";
import { registerBodySchema, type RegisterRequest } from "@/schemas/auth";
import type {
  AuthenticatedRequest,
  AuthenticationErrorResponse,
} from "@/middlewares/authentication";
import { AUTH_ERROR_401, AUTH_ERROR_403 } from "@/middlewares/authentication";

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
@Security("bearerAuth")
@Response<AuthenticationErrorResponse>(401, AUTH_ERROR_401)
export class UsersController extends Controller {
  /**
   * Update current user's profile.
   */
  @Patch("me")
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

  /**
   * Create a new canteen owner account. For Admin only.
   */
  @Post()
  @Security("bearerAuth", ["ADMIN"])
  @SuccessResponse(201, "Created")
  public async createCanteenOwner(@Body() body: RegisterRequest): Promise<{
    message: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      phone: string | null;
    };
  }> {
    const data = registerBodySchema.parse(body);

    const existing = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existing) {
      throw toHttpError(409, "Email already registered");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone ?? null,
        role: "CANTEEN_OWNER",
      },
    });

    this.setStatus(201);
    return {
      message: "Canteen owner created successfully",
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
   * Update an existing canteen owner account. For Admin only.
   */
  @Patch("{userId}")
  @Security("bearerAuth", ["ADMIN"])
  public async updateCanteenOwner(
    @Path() userId: string,
    @Body() body: AdminUpdateCanteenOwnerRequest
  ): Promise<{
    message: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      phone: string | null;
    };
  }> {
    const data = adminUpdateCanteenOwnerBodySchema.parse(body);

    const existing = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!existing) {
      throw toHttpError(404, "User not found");
    }
    if (existing.role !== "CANTEEN_OWNER") {
      throw toHttpError(400, "User is not a canteen owner");
    }

    const updateData: {
      email?: string;
      name?: string;
      phone?: string | null;
    } = {};

    if (data.email !== undefined && data.email !== existing.email) {
      const emailTaken = await prisma.user.findFirst({
        where: {
          email: data.email,
          deletedAt: null,
          id: { not: userId },
        },
      });
      if (emailTaken) {
        throw toHttpError(409, "Email already registered");
      }
      updateData.email = data.email;
    }

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone ?? null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return {
      message: "Canteen owner updated successfully",
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
   * Soft delete a user or canteen owner account. For Admin only.
   */
  @Delete("{userId}")
  @Security("bearerAuth", ["ADMIN"])
  @Response<AuthenticationErrorResponse>(403, AUTH_ERROR_403)
  public async deleteUser(
    @Path() userId: string
  ): Promise<{ message: string }> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw toHttpError(404, "User not found");
    }

    if (user.role === "ADMIN") {
      throw toHttpError(403, "Cannot delete admin account");
    }

    const existingDeletedCount = await prisma.user.count({
      where: {
        deletedAt: { not: null },
        email: {
          startsWith: "deleted_",
          endsWith: `_${user.email}`,
        },
      },
    });

    const increment = existingDeletedCount + 1;
    const deletedEmail = `deleted_${increment}_${user.email}`;

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: deletedEmail,
        deletedAt: new Date(),
      },
    });

    return {
      message: "User deleted successfully",
    };
  }
}
