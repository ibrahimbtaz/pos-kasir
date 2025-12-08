import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const { username, password } = body;

      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        set.status = 401;
        return { success: false, message: "Username atau password salah" };
      }

      const isValidPassword = await Bun.password.verify(password, user.password);

      if (!isValidPassword) {
        set.status = 401;
        return { success: false, message: "Username atau password salah" };
      }

      const token = await jwt.sign({
        id: user.id,
        username: user.username,
        role: user.role,
      });

      return {
        success: true,
        message: "Login berhasil",
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
          },
        },
      };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    }
  )
  .get("/me", async ({ jwt, headers, set }) => {
    const authHeader = headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      set.status = 401;
      return { success: false, message: "Token tidak valid" };
    }

    const token = authHeader.split(" ")[1];
    const payload = await jwt.verify(token);

    if (!payload) {
      set.status = 401;
      return { success: false, message: "Token tidak valid" };
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id as number },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      set.status = 401;
      return { success: false, message: "User tidak ditemukan" };
    }

    return { success: true, data: user };
  });
