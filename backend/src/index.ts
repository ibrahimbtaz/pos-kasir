import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { authRoutes } from "./routes/auth";
import { productRoutes } from "./routes/products";
import { stockRoutes } from "./routes/stock";

const app = new Elysia()
  .use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super-secret-jwt-key",
      exp: "7d",
    })
  )
  .get("/", () => ({
    success: true,
    message: "POS Kasir API",
    version: "1.0.0",
  }))
  .get("/health", () => ({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  }))
  .use(authRoutes)
  .use(productRoutes)
  .use(stockRoutes)
  .listen(3001);

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
