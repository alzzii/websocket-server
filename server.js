// Import library yang dibutuhkan
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

// Gunakan port dari environment variable atau default ke 8080
const PORT = process.env.PORT || 8080;

// Inisialisasi server Express
const app = express();
app.use(cors()); // Mengizinkan koneksi dari domain lain (Vercel)

// Buat rute dasar untuk mengecek apakah server berjalan
app.get('/', (req, res) => {
  res.send('WebSocket Server is running!');
});

// Buat server HTTP dari aplikasi Express
const server = http.createServer(app);

// Inisialisasi WebSocket Server dan hubungkan ke server HTTP
const wss = new WebSocketServer({ server });

// Fungsi ini akan berjalan setiap kali ada koneksi baru (dari ESP32 atau website)
wss.on('connection', (ws) => {
  console.log('Client baru terhubung!');

  // Kirim pesan sambutan ke client yang baru terhubung
  ws.send('Selamat datang di WebSocket Server!');

  // Fungsi ini berjalan setiap kali server menerima pesan dari client
  ws.on('message', (message) => {
    // Tampilkan pesan yang diterima di log server
    console.log('Menerima pesan: %s', message);

    // --- LOGIKA UTAMA: BROADCAST ---
    // Kirim pesan yang diterima ke SEMUA client lain yang terhubung.
    // Ini adalah jembatan antara ESP32 dan website Anda.
    wss.clients.forEach((client) => {
      // Pastikan client lain itu masih terhubung dan bukan pengirim asli
      if (client !== ws && client.readyState === ws.OPEN) {
        // Kirim pesan sebagai string
        client.send(String(message));
      }
    });
  });

  // Fungsi ini berjalan saat client terputus
  ws.on('close', () => {
    console.log('Client terputus');
  });

  // Fungsi untuk menangani error
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Jalankan server HTTP
server.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});