const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// PENGATURAN CORS TERBUKA UNTUK INTEGRASI
// ==========================================
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Konfigurasi Koneksi Database MariaDB menggunakan Pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper untuk penanganan error database global
const handleDbError = (err, res) => {
    return res.status(500).json({ status: "error", message: err.message });
};

// ==========================================
// INDEX ROUTE (Biar tidak Kosong saat diakses root)
// ==========================================
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "API Airport Asset Management Running",
        student: {
            name: process.env.STUDENT_NAME || "Maghfira Islami",
            nim: process.env.STUDENT_NIM || "2311521010"
        }
    });
});

// ==========================================
// 1. ENDPOINT /health (Mengecek Status Server & DB)
// ==========================================
app.get('/health', (req, res) => {
    db.query('SELECT 1', (err) => {
        if (err) {
            return res.status(500).json({
                status: "error",
                message: "Backend is running, but database is not connected",
                database: "disconnected",
                student: {
                    name: process.env.STUDENT_NAME || "Maghfira Islami",
                    nim: process.env.STUDENT_NIM || "2311521010"
                }
            });
        }

        res.json({
            status: "success",
            message: "Backend is running",
            database: "connected",
            student: {
                name: process.env.STUDENT_NAME || "Maghfira Islami",
                nim: process.env.STUDENT_NIM || "2311521010"
            }
        });
    });
});

// ==========================================
// 2. ENDPOINT /schema (Struktur Data untuk Frontend)
// ==========================================
app.get('/schema', (req, res) => {
    res.json({
        student: { 
            name: process.env.STUDENT_NAME || "Maghfira Islami", 
            nim: process.env.STUDENT_NIM || "2311521010"
        },
        resource: {
            name: "airport-assets",
            label: "Data Aset Bandara",
            description: "Aplikasi untuk memonitoring dan mengelola data aset operasional di lingkungan bandara"
        },
        fields: [
            { name: "asset_name", label: "Nama Aset", type: "text", required: true, showInTable: true },
            { name: "location_zone", label: "Zona Lokasi", type: "text", required: true, showInTable: true },
            { name: "maintenance_year", label: "Tahun Perawatan", type: "number", required: false, showInTable: true }
        ],
        endpoints: {
            list: "/airport-assets",
            detail: "/airport-assets/{id}",
            create: "/airport-assets",
            update: "/airport-assets/{id}",
            delete: "/airport-assets/{id}"
        }
    });
});

// ==========================================
// 3. GET ALL DATA (Menampilkan semua aset bandara)
// ==========================================
app.get('/airport-assets', (req, res) => {
    const query = 'SELECT * FROM airport_assets';
    db.query(query, (err, results) => {
        if (err) return handleDbError(err, res);
        
        // Menambahkan properti 'total' dan 'count' agar counter frontend tidak bernilai 0
        res.json({
            status: "success",
            message: "Data retrieved successfully",
            total: results.length,   // Ditambahkan untuk counter asisten
            count: results.length,   // Ditambahkan sebagai cadangan counter
            items: results,
            data: results
        });
    });
});

// ==========================================
// 4. GET DATA BY ID (Menampilkan detail satu aset)
// ==========================================
app.get('/airport-assets/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM airport_assets WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) return handleDbError(err, res);
        if (results.length === 0) {
            return res.status(404).json({ status: "error", message: "Data not found" });
        }
        res.json({
            status: "success",
            message: "Data retrieved successfully",
            data: results[0]
        });
    });
});

// ==========================================
// 5. POST DATA (Menambahkan aset baru)
// ==========================================
app.post('/airport-assets', (req, res) => {
    const { asset_name, location_zone, maintenance_year } = req.body;
    
    if (!asset_name || !location_zone) {
        return res.status(400).json({ status: "error", message: "Asset name and location zone are required" });
    }

    const query = 'INSERT INTO airport_assets (asset_name, location_zone, maintenance_year) VALUES (?, ?, ?)';
    db.query(query, [asset_name, location_zone, maintenance_year], (err, result) => {
        if (err) return handleDbError(err, res);
        res.json({
            status: "success",
            message: "Data created successfully",
            id: result.insertId, // Letakkan ID di root objek response jika frontend membutuhkannya langsung
            data: {
                id: result.insertId,
                asset_name,
                location_zone,
                maintenance_year: maintenance_year ? parseInt(maintenance_year) : null
            }
        });
    });
});

// ==========================================
// 6. PUT DATA (Mengubah data aset berdasarkan ID)
// ==========================================
app.put('/airport-assets/:id', (req, res) => {
    const { id } = req.params;
    const { asset_name, location_zone, maintenance_year } = req.body;

    if (!asset_name || !location_zone) {
        return res.status(400).json({ status: "error", message: "Asset name and location zone are required" });
    }

    const query = 'UPDATE airport_assets SET asset_name = ?, location_zone = ?, maintenance_year = ? WHERE id = ?';
    db.query(query, [asset_name, location_zone, maintenance_year, id], (err, result) => {
        if (err) return handleDbError(err, res);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: "error", message: "Data not found" });
        }
        res.json({
            status: "success",
            message: "Data updated successfully",
            data: {
                id: parseInt(id),
                asset_name,
                location_zone,
                maintenance_year: maintenance_year ? parseInt(maintenance_year) : null
            }
        });
    });
});

// ==========================================
// 7. DELETE DATA (Menghapus aset berdasarkan ID)
// ==========================================
app.delete('/airport-assets/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM airport_assets WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) return handleDbError(err, res);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: "error", message: "Data not found" });
        }
        res.json({
            status: "success",
            message: "Data deleted successfully"
        });
    });
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});