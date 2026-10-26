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
// ===== TAMBAHAN: CEK JADWAL DAN ESTIMASI BIAYA (versi perbaikan) =====
$(document).ready(function () {

  var namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  var dataTarif = {};   // menyimpan tarif per id_ruangan

  // Ambil tarif sekali saat halaman pertama dibuka
  $.getJSON("php/get_ruangan.php", function (data) {
    $.each(data, function (i, r) {
      dataTarif[r.id_ruangan] = Number(r.tarif_akhir_pekan);
    });
  });

  function rupiah(angka) {
    return "Rp" + Number(angka).toLocaleString("id-ID");
  }

  function cekJadwal() {
    var idRuangan = $("#pilih-ruangan-jadwal").val();
    var tanggal   = $("#tanggal-jadwal").val();

    if (!idRuangan || !tanggal) {
      $("#hasil-jadwal").html("Pilih ruangan dan tanggal untuk melihat jadwal.");
      return;
    }

    var hariKe     = new Date(tanggal + "T00:00:00").getDay();
    var akhirPekan = (hariKe === 0 || hariKe === 6);
    var biaya      = akhirPekan ? (dataTarif[idRuangan] || 0) : 0;

    var info = "<p><strong>" + namaHari[hariKe] + ", " + tanggal + "</strong>: " +
               (akhirPekan ? "Akhir pekan (berbayar)" : "Hari kerja (gratis)") + "</p>" +
               "<p>Estimasi biaya: <strong>" + rupiah(biaya) + "</strong></p>";

    $("#hasil-jadwal").html(info + "<p>Memuat jadwal...</p>");

    $.getJSON("php/get_jadwal.php", { id_ruangan: idRuangan, tanggal: tanggal }, function (data) {
      var daftar = "<p>Belum ada jadwal pada tanggal ini. Ruangan kosong.</p>";
      if (data.length > 0) {
        daftar = "<p>Jadwal yang sudah terisi:</p><ul>";
        $.each(data, function (i, j) {
          daftar += "<li>" + j.jam_mulai.substring(0, 5) + " - " +
                    j.jam_selesai.substring(0, 5) + " (" + j.status + ")</li>";
        });
        daftar += "</ul>";
      }
      $("#hasil-jadwal").html(info + daftar);
    }).fail(function () {
      $("#hasil-jadwal").html(info + "<p>Jadwal gagal dimuat. Cek php/get_jadwal.php.</p>");
    });
  }

  $(document).on("change", "#pilih-ruangan-jadwal, #tanggal-jadwal", cekJadwal);
});

// ===== TAMBAHAN: KOTAK BIAYA & VALIDASI FORM =====
$(document).ready(function () {

  var tarifForm = {};   // id_ruangan -> tarif akhir pekan

  // Ambil tarif sekali (sama seperti di Cek Jadwal)
  $.getJSON("php/get_ruangan.php", function (data) {
    $.each(data, function (i, r) {
      tarifForm[r.id_ruangan] = Number(r.tarif_akhir_pekan);
    });
  });

  function rp(angka) {
    return "Rp" + Number(angka).toLocaleString("id-ID");
  }

  // ---------- 1. HITUNG BIAYA OTOMATIS ----------
  function hitungBiayaForm() {
    var id      = $("#id_ruangan").val();
    var tanggal = $("#tgl_pinjam").val();

    if (!id || !tanggal) {
      $("#info-jenis-hari").text("-");
      $("#info-total-biaya").text("Rp0");
      return;
    }

    var hari = new Date(tanggal + "T00:00:00").getDay();
    var akhirPekan = (hari === 0 || hari === 6);
    var biaya = akhirPekan ? (tarifForm[id] || 0) : 0;

    $("#info-jenis-hari").text(akhirPekan ? "Akhir pekan" : "Hari kerja");
    $("#info-total-biaya").text(rp(biaya));
  }

  $(document).on("change", "#id_ruangan, #tgl_pinjam", hitungBiayaForm);

  // ---------- 2. FUNGSI BANTU ERROR ----------
  function tampilError(idKolom, pesan) {
    $("#error-" + idKolom).text(pesan);
    $("#" + idKolom).addClass("input-salah");
  }

  function bersihkanError() {
    $(".pesan-error").text("");
    $(".input-salah").removeClass("input-salah");
  }

  // ---------- 3. VALIDASI ----------
  function validasiForm() {
    bersihkanError();
    var valid = true;

    var ruangan = $("#id_ruangan").val();
    var tanggal = $("#tgl_pinjam").val();
    var mulai   = $("#jam_mulai").val();
    var selesai = $("#jam_selesai").val();
    var perlu   = $.trim($("#keperluan").val());
    var file    = $("#file_surat")[0].files[0];

    // Ruangan
    if (ruangan === "") {
      tampilError("id_ruangan", "Ruangan wajib dipilih.");
      valid = false;
    }

    // Tanggal
    if (tanggal === "") {
      tampilError("tgl_pinjam", "Tanggal wajib diisi.");
      valid = false;
    } else {
      var hariIni = new Date();
      var teksHariIni = hariIni.getFullYear() + "-" +
        ("0" + (hariIni.getMonth() + 1)).slice(-2) + "-" +
        ("0" + hariIni.getDate()).slice(-2);
      if (tanggal < teksHariIni) {
        tampilError("tgl_pinjam", "Tanggal tidak boleh sebelum hari ini.");
        valid = false;
      }
    }

    // Jam
    if (mulai === "") {
      tampilError("jam_mulai", "Jam mulai wajib diisi.");
      valid = false;
    }
    if (selesai === "") {
      tampilError("jam_selesai", "Jam selesai wajib diisi.");
      valid = false;
    } else if (mulai !== "" && selesai <= mulai) {
      tampilError("jam_selesai", "Jam selesai harus setelah jam mulai.");
      valid = false;
    }

    // Keperluan
    if (perlu.length < 10) {
      tampilError("keperluan", "Keperluan minimal 10 karakter.");
      valid = false;
    }

    // File surat
    if (!file) {
      tampilError("file_surat", "Surat peminjaman wajib diunggah.");
      valid = false;
    } else if (!/\.pdf$/i.test(file.name)) {
      tampilError("file_surat", "File harus berformat PDF.");
      valid = false;
    } else if (file.size > 5 * 1024 * 1024) {
      tampilError("file_surat", "Ukuran file maksimal 5 MB.");
      valid = false;
    }

    return valid;
  }

  // ---------- 4. SAAT TOMBOL KIRIM DITEKAN ----------
  $(document).on("submit", "#form-peminjaman", function (e) {
    e.preventDefault();             // tahan dulu, jangan kirim

    if (!validasiForm()) {
      $("html, body").scrollTop(0);
      return;                       // ada error: berhenti di sini
    }

    // ---- Kirim ke server lewat AJAX ----
    var form     = this;
    var formData = new FormData(form);   // membungkus semua isian + file PDF
    var tombol   = $(form).find("button[type='submit']");

    // Catat dulu isi form untuk ringkasan (sebelum form dikosongkan)
    var ringkasan = {
      ruangan: $("#id_ruangan option:selected").text(),
      tanggal: $("#tgl_pinjam").val(),
      mulai:   $("#jam_mulai").val(),
      selesai: $("#jam_selesai").val()
    };

    tombol.prop("disabled", true).text("Mengirim...");   // cegah klik dua kali
    $("#hasil-pengajuan").empty();

    $.ajax({
      url: "php/proses_peminjaman.php",
      type: "POST",
      data: formData,
      processData: false,   // wajib kalau mengirim file
      contentType: false,   // wajib kalau mengirim file
      dataType: "json"      // balasan PHP dibaca sebagai JSON
    }).done(function (res) {

      if (res.sukses) {
        var akhirPekan = (res.jenis_hari === "akhir_pekan");
        var catatan = akhirPekan
          ? "<p>Setelah disetujui admin, lakukan pembayaran di luar sistem, lalu unggah bukti pembayaran.</p>"
          : "<p>Peminjaman hari kerja tidak dikenai biaya.</p>";

        $("#hasil-pengajuan").html(
          "<div class='kotak-sukses'>" +
            "<h3>" + res.pesan + "</h3>" +
            "<ul>" +
              "<li>Nomor pengajuan: #" + res.id_pengajuan + "</li>" +
              "<li>Ruangan: " + ringkasan.ruangan + "</li>" +
              "<li>Tanggal: " + ringkasan.tanggal + " (" + (akhirPekan ? "Akhir pekan" : "Hari kerja") + ")</li>" +
              "<li>Jam: " + ringkasan.mulai + " - " + ringkasan.selesai + "</li>" +
              "<li>Total biaya: " + rp(res.total_biaya) + "</li>" +
              "<li>Status: Menunggu</li>" +
            "</ul>" + catatan +
          "</div>"
        );

        form.reset();            // kosongkan form
        bersihkanError();
        $("#info-jenis-hari").text("-");
        $("#info-total-biaya").text("Rp0");
      } else {
        // ditolak server (misalnya jadwal bentrok)
        $("#hasil-pengajuan").html("<div class='kotak-gagal'>" + res.pesan + "</div>");
      }

    }).fail(function () {
      $("#hasil-pengajuan").html(
        "<div class='kotak-gagal'>Server tidak dapat dihubungi atau balasannya tidak sesuai. " +
        "Cek Apache, MySQL, dan php/proses_peminjaman.php.</div>"
      );
    }).always(function () {
      tombol.prop("disabled", false).text("Kirim Pengajuan");
      $("#hasil-pengajuan")[0].scrollIntoView({ behavior: "smooth" });
    });
  });

  // ---------- 5. TOMBOL BATAL ----------
  $(document).on("click", ".tombol-batal", function () {
    bersihkanError();
    $("#info-jenis-hari").text("-");
    $("#info-total-biaya").text("Rp0");
    $("#hasil-pengajuan").empty();
  });

});

// ===== TAMBAHAN: ISI PILIHAN RUANGAN DI FORM + VALIDASI HIDUP =====
$(document).ready(function () {

  var ruanganDipilih = "";   // id ruangan dari tombol di katalog

  function hariIniTeks() {
    var d = new Date();
    return d.getFullYear() + "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
      ("0" + d.getDate()).slice(-2);
  }

  // ---------- 1. ISI DROPDOWN RUANGAN DI FORM ----------
  function initForm() {
    $("#tgl_pinjam").attr("min", hariIniTeks());   // tanggal lampau tidak bisa dipilih

    $.getJSON("php/get_ruangan.php", function (data) {
      var opsi = "<option value=''>-- Pilih ruangan --</option>";

      $.each(data, function (i, r) {
        var tersedia = (r.status === "tersedia");
        opsi += "<option value='" + r.id_ruangan + "'" + (tersedia ? "" : " disabled") + ">" +
                r.nama_ruangan + (tersedia ? "" : " (tidak tersedia)") + "</option>";
      });
      $("#id_ruangan").html(opsi);

      // datang dari tombol "Ajukan Peminjaman" di katalog? langsung pilih ruangannya
      if (ruanganDipilih !== "") {
        $("#id_ruangan").val(ruanganDipilih).trigger("change");
        ruanganDipilih = "";
      }
    }).fail(function () {
      $("#error-id_ruangan").text("Daftar ruangan gagal dimuat. Cek Apache, MySQL, dan php/get_ruangan.php.");
    });
  }

  // Jalankan initForm setiap kali form.html selesai dimuat lewat AJAX
  $(document).ajaxComplete(function (event, xhr, settings) {
    if (settings.url.indexOf("pages/form.html") !== -1) {
      initForm();
    }
  });

  // Tombol "Ajukan Peminjaman" di kartu katalog
  $(document).on("click", ".btn-ajukan", function () {
    ruanganDipilih = String($(this).data("id-ruangan"));
    $(".menu a[href='pages/form.html']").trigger("click");
  });

  // ---------- 2. PERIKSA SATU KOLOM ----------
  function salah(id, pesan) {
    $("#error-" + id).text(pesan);
    $("#" + id).addClass("input-salah").removeClass("input-benar");
    return false;
  }

  function benar(id) {
    $("#error-" + id).text("");
    $("#" + id).removeClass("input-salah").addClass("input-benar");
    return true;
  }

  function validasiKolom(id) {
    var nilai = $.trim($("#" + id).val());

    if (id === "id_ruangan" && nilai === "") {
      return salah(id, "Ruangan wajib dipilih.");
    }

    if (id === "tgl_pinjam") {
      if (nilai === "") return salah(id, "Tanggal wajib diisi.");
      if (nilai < hariIniTeks()) return salah(id, "Tanggal tidak boleh sebelum hari ini.");
    }

    if (id === "jam_mulai" && nilai === "") {
      return salah(id, "Jam mulai wajib diisi.");
    }

    if (id === "jam_selesai") {
      var mulai = $("#jam_mulai").val();
      if (nilai === "") return salah(id, "Jam selesai wajib diisi.");
      if (mulai !== "" && nilai <= mulai) return salah(id, "Jam selesai harus setelah jam mulai.");
    }

    if (id === "keperluan" && nilai.length < 10) {
      return salah(id, "Keperluan minimal 10 karakter (baru " + nilai.length + ").");
    }

    if (id === "file_surat") {
      var file = $("#file_surat")[0].files[0];
      if (!file) return salah(id, "Surat peminjaman wajib diunggah.");
      if (!/\.pdf$/i.test(file.name)) return salah(id, "File harus berformat PDF.");
      if (file.size > 5 * 1024 * 1024) return salah(id, "Ukuran file maksimal 5 MB.");
    }

    return benar(id);
  }

  // ---------- 3. KAPAN DIPERIKSA (INI YANG MEMBUATNYA "HIDUP") ----------

  // A. Pilihan (ruangan, tanggal, jam, file): periksa langsung saat nilainya berubah
  $(document).on("change", "#id_ruangan, #tgl_pinjam, #jam_mulai, #jam_selesai, #file_surat", function () {
    validasiKolom(this.id);
    if (this.id === "jam_mulai" && $("#jam_selesai").val() !== "") {
      validasiKolom("jam_selesai");   // jam mulai berubah, jam selesai ikut diperiksa ulang
    }
  });

  // B. Keperluan: periksa setiap huruf yang diketik, setelah kolom pernah ditinggalkan
  $(document).on("input", "#keperluan", function () {
    if ($(this).data("disentuh")) {
      validasiKolom("keperluan");
    }
  });

  // C. Saat pindah dari kolom (termasuk kolom yang dibiarkan kosong)
  $(document).on("focusout", "#id_ruangan, #tgl_pinjam, #jam_mulai, #jam_selesai, #keperluan", function () {
    $(this).data("disentuh", true);
    validasiKolom(this.id);
  });

  // D. Tombol Batal: hapus tanda hijau dan catatan "disentuh"
  $(document).on("reset", "#form-peminjaman", function () {
    $(".input-benar").removeClass("input-benar");
    $("#form-peminjaman").find("input, select, textarea").removeData("disentuh");
  });

});