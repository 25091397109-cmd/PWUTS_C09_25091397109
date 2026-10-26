<?php
header("Content-Type: application/json; charset=utf-8");
require "koneksi.php";

$id_ruangan = isset($_GET["id_ruangan"]) ? (int) $_GET["id_ruangan"] : 0;
$tanggal    = isset($_GET["tanggal"]) ? $_GET["tanggal"] : "";

$stmt = mysqli_prepare($koneksi,
  "SELECT jam_mulai, jam_selesai, keperluan, status
   FROM peminjaman_ruangan
   WHERE id_ruangan = ? AND tgl_pinjam = ? AND status <> 'ditolak'
   ORDER BY jam_mulai");

mysqli_stmt_bind_param($stmt, "is", $id_ruangan, $tanggal);
mysqli_stmt_execute($stmt);
$hasil = mysqli_stmt_get_result($stmt);

$data = [];
while ($baris = mysqli_fetch_assoc($hasil)) {
  $data[] = $baris;
}

echo json_encode($data);