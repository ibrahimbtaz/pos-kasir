import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

export const stockRoutes = new Elysia({ prefix: "/stock" })
  // Add stock (stock in)
  .post(
    "/in",
    async ({ body, jwt, headers, set }) => {
      const { productId, quantity, note } = body;

      // Verify token
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      const token = authHeader.split(" ")[1];
      const payload = await jwt.verify(token);

      if (!payload) {
        set.status = 401;
        return { success: false, message: "Token tidak valid" };
      }

      // Check product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        set.status = 404;
        return { success: false, message: "Produk tidak ditemukan" };
      }

      // Update stock and create log
      const [updatedProduct, stockLog] = await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: { stock: { increment: quantity } },
        }),
        prisma.stockLog.create({
          data: {
            productId,
            userId: payload.id as number,
            type: "in",
            quantity,
            note,
          },
        }),
      ]);

      return {
        success: true,
        message: `Stok berhasil ditambahkan sebanyak ${quantity}`,
        data: {
          product: updatedProduct,
          log: stockLog,
        },
      };
    },
    {
      body: t.Object({
        productId: t.Number(),
        quantity: t.Number({ minimum: 1 }),
        note: t.Optional(t.String()),
      }),
    }
  )

  // Reduce stock (stock out) - for scanning
  .post(
    "/out",
    async ({ body, jwt, headers, set }) => {
      const { productId, quantity, note } = body;

      // Verify token
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      const token = authHeader.split(" ")[1];
      const payload = await jwt.verify(token);

      if (!payload) {
        set.status = 401;
        return { success: false, message: "Token tidak valid" };
      }

      // Check product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        set.status = 404;
        return { success: false, message: "Produk tidak ditemukan" };
      }

      // Check sufficient stock
      if (product.stock < quantity) {
        set.status = 400;
        return { success: false, message: `Stok tidak cukup. Stok saat ini: ${product.stock}` };
      }

      // Update stock and create log
      const [updatedProduct, stockLog] = await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: { stock: { decrement: quantity } },
        }),
        prisma.stockLog.create({
          data: {
            productId,
            userId: payload.id as number,
            type: "out",
            quantity,
            note,
          },
        }),
      ]);

      return {
        success: true,
        message: `Stok berhasil dikurangi sebanyak ${quantity}`,
        data: {
          product: updatedProduct,
          log: stockLog,
        },
      };
    },
    {
      body: t.Object({
        productId: t.Number(),
        quantity: t.Number({ minimum: 1 }),
        note: t.Optional(t.String()),
      }),
    }
  )

  // Scan QR and reduce stock by 1
  .post(
    "/scan",
    async ({ body, jwt, headers, set }) => {
      const { qrCode } = body;

      // Verify token
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      const token = authHeader.split(" ")[1];
      const payload = await jwt.verify(token);

      if (!payload) {
        set.status = 401;
        return { success: false, message: "Token tidak valid" };
      }

      // Find product by QR code
      const product = await prisma.product.findUnique({
        where: { qrCode },
      });

      if (!product) {
        set.status = 404;
        return { success: false, message: "Produk tidak ditemukan" };
      }

      // Check sufficient stock
      if (product.stock < 1) {
        set.status = 400;
        return { success: false, message: "Stok habis!" };
      }

      // Update stock and create log
      const [updatedProduct, stockLog] = await prisma.$transaction([
        prisma.product.update({
          where: { id: product.id },
          data: { stock: { decrement: 1 } },
        }),
        prisma.stockLog.create({
          data: {
            productId: product.id,
            userId: payload.id as number,
            type: "out",
            quantity: 1,
            note: "Scan QR",
          },
        }),
      ]);

      return {
        success: true,
        message: `Produk ${product.name} berhasil discan. Stok berkurang 1.`,
        data: {
          product: updatedProduct,
          log: stockLog,
        },
      };
    },
    {
      body: t.Object({
        qrCode: t.String(),
      }),
    }
  )

  // Get stock logs
  .get("/logs", async ({ query }) => {
    const { productId, type, page = "1", limit = "20" } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (productId) where.productId = parseInt(productId);
    if (type) where.type = type;

    const [logs, total] = await Promise.all([
      prisma.stockLog.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true } },
          user: { select: { name: true, username: true } },
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockLog.count({ where }),
    ]);

    return {
      success: true,
      data: logs,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  })

  // Get stock report
  .get("/report", async () => {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        _count: {
          select: { stockLogs: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockProducts = products.filter((p) => p.stock <= 10);
    const outOfStockProducts = products.filter((p) => p.stock === 0);

    return {
      success: true,
      data: {
        summary: {
          totalProducts,
          totalStock,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
        },
        products,
        lowStockProducts,
        outOfStockProducts,
      },
    };
  });
