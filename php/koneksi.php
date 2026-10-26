<?php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "sipta";

$koneksi = mysqli_connect($host, $user, $pass, $db);

if (!$koneksi) {
  http_response_code(500);
  die(json_encode(["error" => "Koneksi database gagal"]));
}

mysqli_set_charset($koneksi, "utf8mb4");