# POS Kasir Application

Aplikasi kasir berbasis website dengan fitur scan QR code untuk manajemen stok produk.

## Tech Stack

- **Frontend**: Next.js 14 + React + Tailwind CSS + shadcn/ui
- **Backend**: Elysia.js (Bun runtime)
- **Database**: MySQL 8.0
- **ORM**: Prisma
- **Container**: Docker & Docker Compose

## Menjalankan dengan Docker

### Prasyarat
- Docker Desktop terinstall dan berjalan

### Langkah-langkah

1. Clone atau download project ini

2. Jalankan dengan Docker Compose:
```bash
docker-compose up --build
```

3. Tunggu sampai semua container siap (biasanya 1-2 menit pertama kali)

4. Akses aplikasi:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

5. Login dengan kredensial default:
   - Username: `admin`
   - Password: `admin123`

### Menghentikan aplikasi
```bash
docker-compose down
```

### Menghentikan dan menghapus data
```bash
docker-compose down -v
```

## Menjalankan untuk Development (tanpa Docker)

### Prasyarat
- Node.js 18+
- Bun runtime (untuk backend)
- MySQL 8.0

### Backend

1. Masuk ke folder backend:
```bash
cd backend
```

2. Install dependencies:
```bash
bun install
```

3. Setup environment:
```bash
# Buat file .env
DATABASE_URL="mysql://user:password@localhost:3306/pos_kasir"
JWT_SECRET="your-secret-key"
```

4. Generate Prisma client dan migrate:
```bash
bun run db:generate
bun run db:push
bun run db:seed
```

5. Jalankan server:
```bash
bun run dev
```

Backend akan berjalan di http://localhost:3001

### Frontend

1. Masuk ke folder frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Jalankan development server:
```bash
npm run dev
```

Frontend akan berjalan di http://localhost:3000

## API Endpoints

### Auth
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

### Products
- `GET /products` - Get all products
- `GET /products/:id` - Get product by ID
- `GET /products/qr/:qrCode` - Get product by QR code
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Stock
- `POST /stock/in` - Add stock
- `POST /stock/out` - Reduce stock
- `POST /stock/scan` - Scan QR and reduce stock by 1
- `GET /stock/logs` - Get stock logs
- `GET /stock/report` - Get stock report

## License

MIT
