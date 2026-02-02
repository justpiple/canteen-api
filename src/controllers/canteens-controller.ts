import {
  Body,
  Controller,
  Get,
  Patch,
  Path,
  Post,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";
import type { AuthenticatedRequest } from "@/middlewares/authentication";
import {
  upsertCanteenBodySchema,
  type UpsertCanteenRequest,
} from "@/schemas/canteens";

export type CanteenPublic = {
  id: string;
  name: string;
  description: string | null;
};

export type MenuPublic = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  stock: number;
};

export type ListCanteensResponse = {
  canteens: Array<
    CanteenPublic & {
      menusCount: number;
    }
  >;
};

export type GetCanteenResponse = {
  canteen: CanteenPublic;
  menus: MenuPublic[];
};

export type GetCanteenMenusResponse = {
  canteen: CanteenPublic;
  menus: MenuPublic[];
};

@Route("canteens")
@Tags("Canteens")
export class CanteensController extends Controller {
  /**
   * List all available canteens.
   */
  @Get()
  public async listCanteens(): Promise<ListCanteensResponse> {
    const canteens = await prisma.canteen.findMany({
      orderBy: { name: "asc" },
      include: {
        menus: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    return {
      canteens: canteens.map((canteen) => ({
        id: canteen.id,
        name: canteen.name,
        description: canteen.description,
        menusCount: canteen.menus.length,
      })),
    };
  }

  /**
   * Get a single canteen along with its available menus.
   */
  @Get("{canteenId}")
  public async getCanteen(
    @Path() canteenId: string
  ): Promise<GetCanteenResponse> {
    const canteen = await prisma.canteen.findUnique({
      where: { id: canteenId, owner: { deletedAt: null } },
      include: {
        menus: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!canteen) {
      throw toHttpError(404, "Canteen not found");
    }

    return {
      canteen: {
        id: canteen.id,
        name: canteen.name,
        description: canteen.description,
      },
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
   * Create canteen for current canteen owner.
   */
  @Post()
  @Security("bearerAuth", ["CANTEEN_OWNER"])
  public async createMyCanteen(
    @Request() request: AuthenticatedRequest,
    @Body() body: UpsertCanteenRequest
  ): Promise<{ message: string; canteen: CanteenPublic }> {
    const data = upsertCanteenBodySchema.parse(body);
    const ownerId = request.user?.id!;

    const existing = await prisma.canteen.findFirst({
      where: { ownerId },
    });
    if (existing) {
      throw toHttpError(400, "Canteen already exists for this owner");
    }

    const canteen = await prisma.canteen.create({
      data: {
        ownerId,
        name: data.name,
        description: data.description ?? null,
      },
    });

    return {
      message: "Canteen created successfully",
      canteen: {
        id: canteen.id,
        name: canteen.name,
        description: canteen.description,
      },
    };
  }

  /**
   * Update current owner's canteen.
   */
  @Patch()
  @Security("bearerAuth", ["CANTEEN_OWNER"])
  public async updateMyCanteen(
    @Request() request: AuthenticatedRequest,
    @Body() body: UpsertCanteenRequest
  ): Promise<{ message: string; canteen: CanteenPublic }> {
    const data = upsertCanteenBodySchema.parse(body);
    const ownerId = request.user?.id!;

    const existing = await prisma.canteen.findFirst({
      where: { ownerId },
    });
    if (!existing) {
      throw toHttpError(404, "Canteen not found for this owner");
    }

    const canteen = await prisma.canteen.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        description: data.description ?? null,
      },
    });

    return {
      message: "Canteen updated successfully",
      canteen: {
        id: canteen.id,
        name: canteen.name,
        description: canteen.description,
      },
    };
  }
}
