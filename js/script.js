$(document).ready(function () {

  // ===== DATA GLOBAL =====
  // Tempat menyimpan semua ruangan dari database (dipakai untuk cari & filter)
  var semuaRuangan = [];

  // ===== AJAX NAVIGASI =====

  // Fungsi: ambil halaman dari server, lalu taruh di #konten
  function muatHalaman(url) {
    $("#konten").html("<p class='memuat'>Memuat halaman...</p>");

    $("#konten").load(url, function (respons, status) {
      if (status === "error") {
        $("#konten").html(
          "<p class='memuat'>Halaman gagal dimuat. Pastikan Apache menyala dan file ada.</p>"
        );
        return;
      }

      // BARU: halaman sudah masuk ke #konten, jadi sekarang aman menjalankan
      // kode yang butuh elemen di halaman itu
      if (url.indexOf("katalog") !== -1) {
        initKatalog();
      }
    });

    // Tandai menu yang sedang aktif
    $(".menu a").removeClass("aktif");
    $(".menu a[href='" + url + "']").addClass("aktif");

    // Kembali ke atas halaman
    $("html, body").scrollTop(0);
  }

  // Saat tautan ber-class "nav-link" diklik
  $(document).on("click", ".nav-link", function (e) {
    e.preventDefault();             // batalkan pindah halaman biasa
    var url = $(this).attr("href"); // ambil alamat dari href
    muatHalaman(url);               // muat lewat AJAX
  });


  // ===== HALAMAN KATALOG =====

  // Ubah angka 250000 menjadi "Rp250.000"
  function formatRupiah(angka) {
    return "Rp" + Number(angka).toLocaleString("id-ID");
  }

  // Buat kartu untuk setiap ruangan, lalu tampilkan di #daftar-ruangan
  function tampilkanRuangan(daftar) {
    var html = "";

    $.each(daftar, function (i, r) {
      var tersedia = (r.status === "tersedia");
      var badge = tersedia
        ? "<span class='badge-tersedia'>Tersedia</span>"
        : "<span class='badge-tidak'>Tidak tersedia</span>";
      var disabled = tersedia ? "" : " disabled";

      html += "<article class='kartu-ruangan'>" +
                "<h3>" + r.nama_ruangan + "</h3>" +
                "<p>Kapasitas: " + r.kapasitas + " orang</p>" +
                "<p>Fasilitas termasuk: " + (r.fasilitas || "-") + "</p>" +
                "<p>Tarif Sabtu/Minggu: " + formatRupiah(r.tarif_akhir_pekan) + " / hari</p>" +
                "<p>Status: " + badge + "</p>" +
                "<button class='tombol btn-ajukan' data-id-ruangan='" + r.id_ruangan + "'" + disabled + ">" +
                  "Ajukan Peminjaman</button>" +
              "</article>";
    });

    if (html === "") {
      html = "<p>Tidak ada ruangan yang cocok.</p>";
    }

    $("#daftar-ruangan").html(html);
  }

  // Isi pilihan ruangan di bagian "Cek Jadwal dan Estimasi Biaya"
  function isiDropdownJadwal() {
    var opsi = "<option value=''>-- Pilih ruangan --</option>";

    $.each(semuaRuangan, function (i, r) {
      opsi += "<option value='" + r.id_ruangan + "'>" + r.nama_ruangan + "</option>";
    });

    $("#pilih-ruangan-jadwal").html(opsi);
  }

  // Dijalankan setiap kali halaman katalog selesai dimuat
  function initKatalog() {
    $.getJSON("php/get_ruangan.php", function (data) {
      semuaRuangan = data;
      tampilkanRuangan(semuaRuangan);
      isiDropdownJadwal();
    }).fail(function () {
      $("#daftar-ruangan").html(
        "<p class='memuat'>Data ruangan gagal dimuat. Cek Apache, MySQL, dan file php/get_ruangan.php.</p>"
      );
    });
  }

  // Cari nama dan filter status: jalan saat mengetik atau mengganti pilihan
  $(document).on("input change", "#cari-ruangan, #filter-status", function () {
    var kata   = $("#cari-ruangan").val().toLowerCase();
    var status = $("#filter-status").val();

    var hasil = semuaRuangan.filter(function (r) {
      var cocokNama   = r.nama_ruangan.toLowerCase().indexOf(kata) !== -1;
      var cocokStatus = (status === "semua") || (r.status === status);
      return cocokNama && cocokStatus;
    });

    tampilkanRuangan(hasil);
  });

});