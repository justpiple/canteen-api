import express, {
  type Express,
  json,
  urlencoded,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import path from "node:path";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "../build/routes";
import swaggerDocument from "../build/swagger.json";
import type { HttpError } from "@/lib/errors";

export const app: Express = express();

app.use(urlencoded({ extended: true }));
app.use(json());
app.disable("x-powered-by");

const publicUploadsDir =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

app.use("/uploads", express.static(publicUploadsDir));
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

RegisterRoutes(app);

app.use((_req: Request, res: Response) => {
  return res.status(404).json({
    message: `Route ${_req.url} not found`,
  });
});

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    const errors: Record<string, string> = {};

    for (const issue of err.issues) {
      const key = issue.path.join(".");
      if (key) errors[key] = issue.message;
    }

    return res.status(400).json({
      message: validationError.message,
      errors,
    });
  }

  const status = err.statusCode ?? 500;
  const message = err.message ?? "Internal server error";

  return res.status(status).json({ message });
});
