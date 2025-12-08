import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

// Helper function to generate QR code value
const generateQRCode = (sku: string) => `QR-${sku}`;

export const productRoutes = new Elysia({ prefix: "/products" })
  // Get all products
  .get("/", async ({ query }) => {
    const { search, page = "1", limit = "10" } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: products,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  })

  // Get product by ID
  .get("/:id", async ({ params, set }) => {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!product) {
      set.status = 404;
      return { success: false, message: "Produk tidak ditemukan" };
    }

    return { success: true, data: product };
  })

  // Get product by QR code
  .get("/qr/:qrCode", async ({ params, set }) => {
    const product = await prisma.product.findUnique({
      where: { qrCode: params.qrCode },
    });

    if (!product) {
      set.status = 404;
      return { success: false, message: "Produk tidak ditemukan" };
    }

    return { success: true, data: product };
  })

  // Create product
  .post(
    "/",
    async ({ body, set }) => {
      const { name, sku, price, stock } = body;

      // Check if SKU already exists
      const existingProduct = await prisma.product.findUnique({
        where: { sku },
      });

      if (existingProduct) {
        set.status = 400;
        return { success: false, message: "SKU sudah digunakan" };
      }

      const qrCode = generateQRCode(sku);

      const product = await prisma.product.create({
        data: {
          name,
          sku,
          price,
          stock: stock || 0,
          qrCode,
        },
      });

      return {
        success: true,
        message: "Produk berhasil ditambahkan",
        data: product,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        sku: t.String(),
        price: t.Number(),
        stock: t.Optional(t.Number()),
      }),
    }
  )

  // Update product
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const { name, sku, price } = body;

      const existingProduct = await prisma.product.findUnique({
        where: { id: parseInt(params.id) },
      });

      if (!existingProduct) {
        set.status = 404;
        return { success: false, message: "Produk tidak ditemukan" };
      }

      // Check if new SKU conflicts with another product
      if (sku !== existingProduct.sku) {
        const skuConflict = await prisma.product.findUnique({
          where: { sku },
        });

        if (skuConflict) {
          set.status = 400;
          return { success: false, message: "SKU sudah digunakan" };
        }
      }

      const qrCode = sku !== existingProduct.sku ? generateQRCode(sku) : existingProduct.qrCode;

      const product = await prisma.product.update({
        where: { id: parseInt(params.id) },
        data: { name, sku, price, qrCode },
      });

      return {
        success: true,
        message: "Produk berhasil diupdate",
        data: product,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        sku: t.String(),
        price: t.Number(),
      }),
    }
  )

  // Delete product
  .delete("/:id", async ({ params, set }) => {
    const existingProduct = await prisma.product.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!existingProduct) {
      set.status = 404;
      return { success: false, message: "Produk tidak ditemukan" };
    }

    await prisma.product.delete({
      where: { id: parseInt(params.id) },
    });

    return { success: true, message: "Produk berhasil dihapus" };
  });
