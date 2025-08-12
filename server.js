// Import library yang dibutuhkan
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const PORT = process.env.PORT || 8080;

// ===== KONEKSI DATABASE (DENGAN LOGGING TAMBAHAN) =====
const uri = process.env.MONGODB_URI;
let db;

// Pengecekan awal URI
if (!uri) {
  console.error("FATAL ERROR: MONGODB_URI tidak ditemukan di environment variables.");
  process.exit(1);
}

const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectToDb() {
  console.log("Mencoba menghubungkan ke database..."); // <-- LOG TAMBAHAN 1
  try {
    await mongoClient.connect();
    db = mongoClient.db("aquaponic_db");
    console.log("✓ Berhasil terhubung ke MongoDB Atlas!");
  } catch(error) {
    // --- BLOK ERROR YANG DISEMPURNAKAN ---
    console.error("!!! GAGAL TERHUBUNG KE MONGODB !!!");
    console.error("Pesan Error Lengkap:");
    console.error(error); // <-- LOG TAMBAHAN 2: Tampilkan seluruh objek error
    process.exit(1); // <-- Paksa aplikasi berhenti setelah error fatal
    // ------------------------------------
  }
}
// ===================================

const app = express();
app.use(cors());
app.get('/', (req, res) => res.send('WebSocket Server with MongoDB is running!'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client baru terhubung!');
  ws.send('Selamat datang di WebSocket Server!');

  ws.on('message', async (message) => {
    console.log('Menerima pesan: %s', message);

    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === 'sensorData') {
        if (db) {
          const collection = db.collection('sensor_readings');
          parsedMessage.createdAt = new Date();
          await collection.insertOne(parsedMessage);
          console.log('✓ Data sensor berhasil disimpan ke database.');
        } else {
          console.log('Database belum siap, data tidak disimpan.');
        }
      }
    } catch (e) { /* Abaikan pesan non-JSON */ }
    
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(String(message));
      }
    });
  });

  ws.on('close', () => console.log('Client terputus'));
  ws.on('error', (error) => console.error('WebSocket error:', error));
});

// Jalankan server
server.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  connectToDb();
});