-- ============================================================
-- Database UTS Pemrograman Web: SIPTA
-- Fitur: Peminjaman dan Sewa Ruangan (termasuk pembayaran akhir pekan)
-- Mengikuti struktur basis data pada proposal (Bab 3.1)
-- ============================================================
CREATE DATABASE IF NOT EXISTS sipta_uts
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE sipta_uts;

-- Hapus tabel lama (urutan: anak dulu, induk belakangan)
DROP TABLE IF EXISTS pembayaran;
DROP TABLE IF EXISTS peminjaman_ruangan;
DROP TABLE IF EXISTS fasilitas_ruangan;
DROP TABLE IF EXISTS ruangan;
DROP TABLE IF EXISTS pengguna;

-- ===== TABEL PENGGUNA =====
CREATE TABLE pengguna (
  id_pengguna INT AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(100) NOT NULL,
  nomor_induk VARCHAR(30) NULL UNIQUE,
  email       VARCHAR(100) NOT NULL UNIQUE,
  no_telepon  VARCHAR(20) NOT NULL,
  unit_prodi  VARCHAR(100) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  peran       ENUM('mahasiswa','admin') NOT NULL
);

-- ===== TABEL RUANGAN =====
CREATE TABLE ruangan (
  id_ruangan        INT AUTO_INCREMENT PRIMARY KEY,
  nama_ruangan      VARCHAR(100) NOT NULL,
  kapasitas         INT NOT NULL,
  tarif_akhir_pekan DECIMAL(10,2) NOT NULL,
  status            ENUM('tersedia','tidak tersedia') NOT NULL DEFAULT 'tersedia'
);

-- ===== TABEL FASILITAS_RUANGAN =====
CREATE TABLE fasilitas_ruangan (
  id_fasilitas   INT AUTO_INCREMENT PRIMARY KEY,
  id_ruangan     INT NOT NULL,
  nama_fasilitas VARCHAR(100) NOT NULL,
  jumlah         INT NOT NULL,
  FOREIGN KEY (id_ruangan) REFERENCES ruangan(id_ruangan)
);

-- ===== TABEL PEMINJAMAN_RUANGAN =====
CREATE TABLE peminjaman_ruangan (
  id_pinjam_ruangan INT AUTO_INCREMENT PRIMARY KEY,
  id_pengguna       INT NOT NULL,
  id_ruangan        INT NOT NULL,
  id_admin          INT NULL,
  tgl_pengajuan     DATETIME NOT NULL,
  tgl_pinjam        DATE NOT NULL,
  jam_mulai         TIME NOT NULL,
  jam_selesai       TIME NOT NULL,
  keperluan         TEXT NOT NULL,
  file_surat        VARCHAR(255) NOT NULL,
  jenis_hari        ENUM('hari_kerja','akhir_pekan') NOT NULL,
  total_biaya       DECIMAL(10,2) NOT NULL DEFAULT 0,
  status            ENUM('menunggu','disetujui','ditolak','menunggu_pembayaran','selesai')
                    NOT NULL DEFAULT 'menunggu',
  alasan_penolakan  TEXT NULL,
  FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna),
  FOREIGN KEY (id_ruangan)  REFERENCES ruangan(id_ruangan),
  FOREIGN KEY (id_admin)    REFERENCES pengguna(id_pengguna)
);

-- ===== TABEL PEMBAYARAN =====
-- Hanya dipakai untuk peminjaman akhir pekan (relasi 1:1 dengan peminjaman_ruangan)
CREATE TABLE pembayaran (
  id_pembayaran     INT AUTO_INCREMENT PRIMARY KEY,
  id_pinjam_ruangan INT NOT NULL UNIQUE,
  id_admin          INT NULL,
  jumlah_bayar      DECIMAL(10,2) NOT NULL,
  bukti_pembayaran  VARCHAR(255) NOT NULL,
  tgl_unggah        DATETIME NOT NULL,
  status_verifikasi ENUM('menunggu','valid','tidak_valid') NOT NULL DEFAULT 'menunggu',
  tgl_verifikasi    DATETIME NULL,
  FOREIGN KEY (id_pinjam_ruangan) REFERENCES peminjaman_ruangan(id_pinjam_ruangan),
  FOREIGN KEY (id_admin)          REFERENCES pengguna(id_pengguna)
);

-- ============================================================
-- DATA AWAL
-- ============================================================

-- Password contoh di bawah adalah hash dari kata "password"
INSERT INTO pengguna (nama, nomor_induk, email, no_telepon, unit_prodi, password, peran) VALUES
('Mahasiswa Contoh', '25091397109', 'mahasiswa@contoh.ac.id', '081234567890',
 'D4 Manajemen Informatika', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'mahasiswa'),
('Admin TU Vokasi', NULL, 'admin@contoh.ac.id', '081200000000',
 'Tata Usaha Fakultas Vokasi', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Kapasitas dan tarif adalah data contoh (ubah sesuai data asli)
INSERT INTO ruangan (nama_ruangan, kapasitas, tarif_akhir_pekan, status) VALUES
('Auditorium K10', 200, 1500000, 'tersedia'),       -- id 1
('K2.01.03',        40,  250000, 'tersedia'),       -- id 2
('K2.01.04',        40,  250000, 'tersedia'),       -- id 3
('K2.02.04',        40,  250000, 'tersedia'),       -- id 4
('K2.02.05',        40,  250000, 'tidak tersedia'), -- id 5
('K10.02.09',       40,  250000, 'tersedia'),       -- id 6
('K10.02.05',       40,  250000, 'tersedia');       -- id 7

INSERT INTO fasilitas_ruangan (id_ruangan, nama_fasilitas, jumlah) VALUES
(1,'Proyektor/LED',1),(1,'AC',2),(1,'mixer',1),(1,'speaker',1)
(2,'Proyektor',1),(2,'AC',2),(2,'Papan Tulis',1),
(3,'Proyektor',1),(3,'AC',2),(3,'Papan Tulis',1),
(4,'Proyektor',1),(4,'AC',1),(4,'Papan Tulis',1),
(5,'Proyektor',1),(5,'AC',1),(5,'Papan Tulis',1),
(6,'Proyektor',1),(6,'AC',2),(6,'Papan Tulis',1),
(7,'Proyektor',1),(7,'AC',2),(7,'Papan Tulis',1);

-- Contoh peminjaman (untuk simulasi jadwal bentrok dan status)
-- 2026-10-28 = Rabu, 2026-10-29 = Kamis, 2026-10-31 = Sabtu, 2026-11-07 = Sabtu
INSERT INTO peminjaman_ruangan
(id_pengguna, id_ruangan, id_admin, tgl_pengajuan, tgl_pinjam, jam_mulai, jam_selesai,
 keperluan, file_surat, jenis_hari, total_biaya, status) VALUES
-- id 1: hari kerja, sudah disetujui, tanpa pembayaran
(1, 2, 2, '2026-10-20 09:00:00', '2026-10-28', '08:00:00', '10:00:00',
 'Kuliah tambahan', 'uploads/surat/contoh1.pdf', 'hari_kerja', 0, 'disetujui'),
-- id 2: akhir pekan, sudah disetujui, belum ada bukti bayar (mahasiswa boleh unggah)
(1, 2, 2, '2026-10-21 10:00:00', '2026-10-31', '09:00:00', '12:00:00',
 'Workshop persiapan tugas akhir', 'uploads/surat/contoh2.pdf', 'akhir_pekan', 250000, 'menunggu_pembayaran'),
-- id 3: hari kerja, masih menunggu admin
(1, 1, NULL, '2026-10-22 11:00:00', '2026-10-29', '13:00:00', '15:00:00',
 'Seminar himpunan', 'uploads/surat/contoh3.pdf', 'hari_kerja', 0, 'menunggu'),
-- id 4: akhir pekan, sudah ada bukti bayar yang menunggu verifikasi admin
(1, 6, 2, '2026-10-23 08:30:00', '2026-11-07', '08:00:00', '16:00:00',
 'Pelatihan antar angkatan', 'uploads/surat/contoh4.pdf', 'akhir_pekan', 500000, 'menunggu_pembayaran');

-- Contoh pembayaran untuk peminjaman id 4 (belum diverifikasi, id_admin dan tgl_verifikasi NULL)
INSERT INTO pembayaran
(id_pinjam_ruangan, id_admin, jumlah_bayar, bukti_pembayaran, tgl_unggah, status_verifikasi, tgl_verifikasi) VALUES
(4, NULL, 500000, 'uploads/bukti/contoh4.jpg', '2026-10-24 14:00:00', 'menunggu', NULL);