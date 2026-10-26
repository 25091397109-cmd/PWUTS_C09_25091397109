<?php
header("Content-Type: application/json; charset=utf-8");
require "koneksi.php";

$sql = "SELECT r.id_ruangan, r.nama_ruangan, r.kapasitas,
               r.tarif_akhir_pekan, r.status,
               GROUP_CONCAT(f.nama_fasilitas SEPARATOR ', ') AS fasilitas
        FROM ruangan r
        LEFT JOIN fasilitas_ruangan f ON f.id_ruangan = r.id_ruangan
        GROUP BY r.id_ruangan
        ORDER BY r.id_ruangan";

$hasil = mysqli_query($koneksi, $sql);
$data = [];

while ($baris = mysqli_fetch_assoc($hasil)) {
  $data[] = $baris;
}

echo json_encode($data);