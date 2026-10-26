<?php
header("Content-Type: application/json; charset=utf-8");
require "koneksi.php";

function balas($sukses, $pesan, $extra = []) {
  echo json_encode(array_merge(["sukses" => $sukses, "pesan" => $pesan], $extra));
  exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  balas(false, "Metode tidak valid.");
}

$id_pengguna = 1;   // sementara: Mahasiswa Contoh
$id_ruangan  = isset($_POST["id_ruangan"]) ? (int) $_POST["id_ruangan"] : 0;
$tgl_pinjam  = isset($_POST["tgl_pinjam"]) ? $_POST["tgl_pinjam"] : "";
$jam_mulai   = isset($_POST["jam_mulai"]) ? $_POST["jam_mulai"] : "";
$jam_selesai = isset($_POST["jam_selesai"]) ? $_POST["jam_selesai"] : "";
$keperluan   = isset($_POST["keperluan"]) ? trim($_POST["keperluan"]) : "";

// 1. Cek kolom wajib
if ($id_ruangan <= 0 || $tgl_pinjam === "" || $jam_mulai === "" ||
    $jam_selesai === "" || strlen($keperluan) < 10) {
  balas(false, "Data belum lengkap atau tidak valid.");
}
if ($jam_selesai <= $jam_mulai) {
  balas(false, "Jam selesai harus setelah jam mulai.");
}

// 1b. Cek file
if (!isset($_FILES["file_surat"]) || $_FILES["file_surat"]["error"] !== UPLOAD_ERR_OK) {
  balas(false, "Surat peminjaman gagal diunggah.");
}
$file = $_FILES["file_surat"];
$ekstensi = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
if ($ekstensi !== "pdf") {
  balas(false, "File harus berformat PDF.");
}
if ($file["size"] > 5 * 1024 * 1024) {
  balas(false, "Ukuran file maksimal 5 MB.");
}

// 2. Ambil tarif ruangan, hitung jenis hari dan biaya
$stmt = mysqli_prepare($koneksi,
  "SELECT tarif_akhir_pekan, status FROM ruangan WHERE id_ruangan = ?");
mysqli_stmt_bind_param($stmt, "i", $id_ruangan);
mysqli_stmt_execute($stmt);
$ruangan = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

if (!$ruangan) {
  balas(false, "Ruangan tidak ditemukan.");
}
if ($ruangan["status"] !== "tersedia") {
  balas(false, "Ruangan sedang tidak tersedia.");
}

$hari = (int) date("w", strtotime($tgl_pinjam));   // 0 = Minggu, 6 = Sabtu
$akhir_pekan = ($hari === 0 || $hari === 6);
$jenis_hari  = $akhir_pekan ? "akhir_pekan" : "hari_kerja";
$total_biaya = $akhir_pekan ? $ruangan["tarif_akhir_pekan"] : 0;

// 3. Cek bentrok jadwal (jam saling tumpang tindih)
$stmt = mysqli_prepare($koneksi,
  "SELECT COUNT(*) AS jumlah FROM peminjaman_ruangan
   WHERE id_ruangan = ? AND tgl_pinjam = ? AND status <> 'ditolak'
   AND jam_mulai < ? AND jam_selesai > ?");
mysqli_stmt_bind_param($stmt, "isss", $id_ruangan, $tgl_pinjam, $jam_selesai, $jam_mulai);
mysqli_stmt_execute($stmt);
$cek = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

if ($cek["jumlah"] > 0) {
  balas(false, "Jadwal bentrok dengan peminjaman lain pada ruangan dan waktu tersebut.");
}

// 4. Simpan file PDF
$folder = __DIR__ . "/../uploads/";
$nama_file = "surat_" . time() . "_" . $id_pengguna . ".pdf";
if (!move_uploaded_file($file["tmp_name"], $folder . $nama_file)) {
  balas(false, "Gagal menyimpan file. Pastikan folder uploads ada.");
}

// 5. Simpan ke database
$stmt = mysqli_prepare($koneksi,
  "INSERT INTO peminjaman_ruangan
   (id_pengguna, id_ruangan, tgl_pengajuan, tgl_pinjam, jam_mulai, jam_selesai,
    keperluan, file_surat, jenis_hari, total_biaya, status)
   VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, 'menunggu')");
mysqli_stmt_bind_param($stmt, "iissssssd",
  $id_pengguna, $id_ruangan, $tgl_pinjam, $jam_mulai, $jam_selesai,
  $keperluan, $nama_file, $jenis_hari, $total_biaya);

if (!mysqli_stmt_execute($stmt)) {
  balas(false, "Gagal menyimpan data ke database.");
}

// 6. Balasan sukses
balas(true, "Pengajuan berhasil dikirim.", [
  "id_pengajuan" => mysqli_insert_id($koneksi),
  "jenis_hari"   => $jenis_hari,
  "total_biaya"  => $total_biaya,
  "status"       => "menunggu"
]);