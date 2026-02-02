import {
  Controller,
  Delete,
  FormField,
  Get,
  Patch,
  Path,
  Post,
  Request,
  Route,
  Security,
  Tags,
  UploadedFile,
  Response,
  SuccessResponse,
} from "tsoa";
import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";
import {
  AUTH_ERROR_401,
  AUTH_ERROR_403,
  type AuthenticatedRequest,
  type AuthenticationErrorResponse,
} from "@/middlewares/authentication";
import type { MenuPublic } from "@/controllers/canteens-controller";
import { createMenuBodySchema, updateMenuBodySchema } from "@/schemas/menus";
import { uploadMenuImage } from "@/lib/upload";

export type GetMyCanteenMenusResponse = {
  menus: MenuPublic[];
};

export type UpsertMyMenuResponse = {
  message: string;
  menu: MenuPublic;
};

@Route("menus")
@Tags("Menus")
@Security("bearerAuth", ["CANTEEN_OWNER"])
@Response<AuthenticationErrorResponse>(401, AUTH_ERROR_401)
@Response<AuthenticationErrorResponse>(403, AUTH_ERROR_403)
export class MenusController extends Controller {
  /**
   * List menus for current canteen owner.
   */
  @Get()
  public async listMyMenus(
    @Request() request: AuthenticatedRequest
  ): Promise<GetMyCanteenMenusResponse> {
    const ownerId = request.user?.id!;

    const canteen = await prisma.canteen.findFirst({
      where: { ownerId },
      include: {
        menus: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!canteen) {
      throw toHttpError(404, "Canteen not found for this owner");
    }

    return {
      menus: canteen.menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: menu.price,
        photoUrl: menu.photoUrl,
        stock: menu.stock,
      })),
    };
  }

  /**
   * Create a new menu for current canteen owner.
   */
  @Post()
  public async createMyMenu(
    @Request() request: AuthenticatedRequest,
    @FormField() name: string,
    @FormField() description?: string,
    @FormField() price?: string,
    @FormField() stock?: string,
    @UploadedFile() file?: Express.Multer.File
  ): Promise<UpsertMyMenuResponse> {
    const ownerId = request.user?.id!;

    const formData: Record<string, unknown> = {
      name,
      description: description || undefined,
      price: price ? Number.parseInt(price, 10) : undefined,
      stock: stock ? Number.parseInt(stock, 10) : undefined,
    };

    const data = createMenuBodySchema.parse(formData);

    let photoUrl: string | null = null;
    console.log(file);
    if (file) {
      photoUrl = await uploadMenuImage(file.buffer, file.filename);
    }

    const canteen = await prisma.canteen.findFirst({
      where: { ownerId },
    });

    if (!canteen) {
      throw toHttpError(404, "Canteen not found for this owner");
    }

    const menu = await prisma.menu.create({
      data: {
        canteenId: canteen.id,
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        photoUrl,
        stock: data.stock ?? 0,
      },
    });

    return {
      message: "Menu created successfully",
      menu: {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: menu.price,
        photoUrl: menu.photoUrl,
        stock: menu.stock,
      },
    };
  }

  /**
   * Update existing menu for current canteen owner.
   */
  @Patch("{menuId}")
  public async updateMyMenu(
    @Request() request: AuthenticatedRequest,
    @Path() menuId: string,
    @FormField() name: string,
    @FormField() description?: string,
    @FormField() price?: string,
    @FormField() stock?: string,
    @UploadedFile() file?: Express.Multer.File
  ): Promise<UpsertMyMenuResponse> {
    const ownerId = request.user?.id!;

    const formData: Record<string, unknown> = {
      name,
      description: description || undefined,
      price: price ? Number.parseInt(price, 10) : undefined,
      stock: stock ? Number.parseInt(stock, 10) : undefined,
    };

    const data = updateMenuBodySchema.parse(formData);

    const canteen = await prisma.canteen.findFirst({
      where: { ownerId },
    });

    if (!canteen) {
      throw toHttpError(404, "Canteen not found for this owner");
    }

    const existingMenu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        canteenId: canteen.id,
        deletedAt: null,
      },
    });

    if (!existingMenu) {
      throw toHttpError(404, "Menu not found for this owner");
    }

    let photoUrl: string | null | undefined = undefined;
    if (file) {
      photoUrl = await uploadMenuImage(file.buffer, file.filename);
    }

    const menu = await prisma.menu.update({
      where: { id: existingMenu.id },
      data: {
        name: data.name,
        description: data.description ?? existingMenu.description,
        price: data.price ?? existingMenu.price,
        photoUrl: file ? photoUrl : existingMenu.photoUrl,
        stock: data.stock ?? existingMenu.stock,
      },
    });

    return {
      message: "Menu updated successfully",
      menu: {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: menu.price,
        photoUrl: menu.photoUrl,
        stock: menu.stock,
      },
    };
  }

  /**
   * Soft delete a menu for current canteen owner.
   */
  @Delete("{menuId}")
  @SuccessResponse(204, "Success - No Content")
  public async deleteMyMenu(
    @Request() request: AuthenticatedRequest,
    @Path() menuId: string
  ) {
    const ownerId = request.user?.id!;

    const canteen = await prisma.canteen.findFirst({
      where: { ownerId },
    });

    if (!canteen) {
      throw toHttpError(404, "Canteen not found for this owner");
    }

    const existingMenu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        canteenId: canteen.id,
        deletedAt: null,
      },
    });

    if (!existingMenu) {
      throw toHttpError(404, "Menu not found for this owner");
    }

    await prisma.menu.update({
      where: { id: existingMenu.id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.setStatus(204);
  }
}
