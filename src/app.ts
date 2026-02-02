import express, {
  type Express,
  json,
  urlencoded,
  type Request,
  type Response,
  NextFunction,
} from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "../build/routes";
import swaggerDocument from "../build/swagger.json";
import { HttpError } from "@/lib/errors";

export const app: Express = express();

app.use(urlencoded({ extended: true }));
app.use(json());
app.disable("x-powered-by");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
