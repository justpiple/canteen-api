import { Controller, Post, Body, Route, SuccessResponse, Tags } from "tsoa";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { toHttpError } from "@/lib/errors";
import {
  registerBodySchema,
  loginBodySchema,
  type RegisterRequest,
  type LoginRequest,
} from "@/schemas/auth";

export type RegisterResponse = {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    phone: string | null;
  };
};

export type LoginResponse = {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    phone: string | null;
  };
  token: string;
};

@Route("auth")
@Tags("Auth")
export class AuthController extends Controller {
  @Post("register")
  @SuccessResponse(201, "Created")
  public async register(
    @Body() body: RegisterRequest
  ): Promise<RegisterResponse> {
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
      },
    });

    this.setStatus(201);
    return {
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  @Post("login")
  public async login(@Body() body: LoginRequest): Promise<LoginResponse> {
    const data = loginBodySchema.parse(body);

    const user = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (!user) {
      throw toHttpError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      throw toHttpError(401, "Invalid email or password");
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
      token,
    };
  }
}
