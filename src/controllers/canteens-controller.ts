import { Controller, Get, Path, Route, Tags } from "tsoa";
import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";

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
}
