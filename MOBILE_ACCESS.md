# Cara Mengakses Aplikasi POS dari HP

## Masalah
Browser HP membutuhkan HTTPS untuk mengakses kamera. HTTP biasa tidak diizinkan.

## Solusi 1: Chrome Android Flag (Termudah)

1. Buka Chrome di HP Android
2. Ketik di address bar: `chrome://flags`
3. Cari: **"Insecure origins treated as secure"**
4. Tambahkan alamat: `http://10.23.0.189:3000` (sesuaikan dengan IP komputer Anda)
5. Klik **Enable**
6. Restart Chrome
7. Akses `http://10.23.0.189:3000`

## Solusi 2: Menggunakan ngrok (Gratis)

### Install ngrok:
```bash
# Windows (dengan chocolatey)
choco install ngrok

# Atau download dari https://ngrok.com/download
```

### Jalankan ngrok:
```bash
ngrok http 3000
```

### Hasil:
Anda akan mendapat URL seperti:
```
https://abc123.ngrok.io
```

Buka URL tersebut di HP, kamera akan berfungsi karena sudah HTTPS.

## Solusi 3: iOS Safari
Untuk iPhone, Anda perlu menggunakan ngrok atau setup HTTPS yang proper.

## IP Address Komputer Anda
Berdasarkan hasil ipconfig, kemungkinan IP yang bisa digunakan:
- `10.23.0.189` - Kemungkinan WiFi/LAN utama
- `192.168.56.1` - Virtual network

Pastikan HP dan komputer terhubung ke jaringan WiFi yang sama.

## Test Koneksi
1. Dari HP, buka browser
2. Akses: `http://10.23.0.189:3000`
3. Jika muncul halaman login, berarti sudah terhubung
4. Untuk kamera, gunakan salah satu solusi di atas
