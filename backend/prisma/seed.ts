import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (!existingAdmin) {
    // Create default admin user (password: admin123)
    const hashedPassword = await Bun.password.hash("admin123", {
      algorithm: "bcrypt",
      cost: 10,
    });

    await prisma.user.create({
      data: {
        username: "admin",
        password: hashedPassword,
        name: "Administrator",
        role: "admin",
      },
    });

    console.log("✅ Default admin user created (username: admin, password: admin123)");
  } else {
    console.log("ℹ️ Admin user already exists, skipping seed");
  }

  // Create sample products if none exist
  const productCount = await prisma.product.count();
  
  if (productCount === 0) {
    const sampleProducts = [
      { name: "Indomie Goreng", sku: "PRD001", price: 3500, stock: 100, qrCode: "QR-PRD001" },
      { name: "Aqua 600ml", sku: "PRD002", price: 4000, stock: 50, qrCode: "QR-PRD002" },
      { name: "Teh Botol Sosro", sku: "PRD003", price: 5000, stock: 75, qrCode: "QR-PRD003" },
      { name: "Roti Tawar Sari Roti", sku: "PRD004", price: 15000, stock: 30, qrCode: "QR-PRD004" },
      { name: "Susu Ultra 250ml", sku: "PRD005", price: 6500, stock: 40, qrCode: "QR-PRD005" },
    ];

    for (const product of sampleProducts) {
      await prisma.product.create({ data: product });
    }

    console.log("✅ Sample products created");
  } else {
    console.log("ℹ️ Products already exist, skipping seed");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
