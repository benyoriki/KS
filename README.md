# Kartu Stock Online V3 – Depo Parung
HTML + CSS + JavaScript modular, data di `localStorage`. Tanpa backend, siap GitHub Pages (path relatif).

## Konsep V3 (alur dokumen)
1. **Admin** input **BKB** (Penjualan Depo → Toko), **Supplier** (Pabrik ↔ Depo), **Mutasi** (Depo ↔ Depo/Toko) dan **Saldo Awal**.
2. **Checker** (Galon hanya galon, SPS hanya SPS) hanya mengecek data Admin:
   - BKB baru → notifikasi → **Cek & Muat** → tekan **Selesai Muat** (tercatat driver, tanggal, jam).
   - Driver pulang dari toko → Checker cek fisik → **Input BTB** (sisa isi + botol kosong kembali / retur SPS). Admin dapat notifikasi, **1 dokumen Penjualan selesai = 1 ritase**.
   - Barang masuk (Supplier / Mutasi masuk) → Checker input **BTB** (jumlah fisik diterima). Selisih dengan dokumen Admin ditandai, catatan wajib.
3. **Saldo** = saldo awal (manual per tanggal, bisa diubah) + masuk (semua BTB) − keluar (semua BKB). Galon dipisah **Isi** dan **Kosong**. Jika saldo awal suatu hari belum disimpan, disarankan saldo akhir hari sebelumnya.

## Akun demo
admin/admin123 · checker_galon/checker123 · checker_sps/checker123 · ka_gudang/spv123 (login lama "supervisor" tetap diterima)

## Aturan
- BKB keluar mengurangi stock saat disimpan; BKB ditolak bila stock tidak cukup.
- Barang masuk menambah stock saat BTB disimpan. Sisa/kosong kembali dari toko menambah stock saat BTB.
- Admin boleh membatalkan dokumen selama belum diproses Checker; setelahnya hanya KA Gudang (reset Muat/BTB atau batalkan, wajib alasan, masuk Audit Log).
- Closing hanya snapshot, tidak mengubah saldo.

## Data & migrasi
Key baru: `ks_docs`, `ks_openings`, `ks_notifs`. Data V2 tidak dihapus (backup otomatis `ks_backup_v2`); saldo V2 hari ini dijadikan saldo awal hari ini.

## Batasan penting
- localStorage hanya satu browser. Notifikasi real-time hanya antar **tab di browser yang sama**. Untuk beberapa HP berbeda diperlukan backend (Firebase/Supabase).
- Jugrak, Pallet, BS A/B, BJ, Tisue disembunyikan sementara (belum divalidasi).

## Revisi V3.1
- **Ritase otomatis**: field Sales dihapus. Driver yang sama di tanggal yang sama, setiap BKB Penjualan = Rit 1, Rit 2, dst. (tampil di kartu, notifikasi, BTB, laporan). Label field: *Nama Driver / Nama Sales*.
- **Filter per tanggal**: Dokumen, Notifikasi, Riwayat Checker, Laporan memakai bar tanggal (‹ tanggal ›, Hari Ini, Kemarin, Belum Selesai, Semua) dan dikelompokkan per tanggal. Dashboard hanya menampilkan data hari ini; yang tertunda dari tanggal lalu dipisah.
- **Input BTB** didesain ulang (kartu per produk, dua kolom sejajar, hasil terjual/selisih langsung terlihat).
- **Produk berupa pilihan** (dari Excel KODE DEPO): Galon Aqua/Vit, SPS Aqua/Vit/Mizone/SGM (+ "SPS Beverage Lain"). Tombol **+ Tambah produk lain**: Supplier Galon → Jugrak, Supplier SPS → Pallet (Pallet tidak dihitung di Total Stock SPS).
- Daftar produk ada di `products.js`; database otomatis dimigrasi ke versi 4.
- Catatan: localStorage tidak tersinkron antar perangkat; untuk multi-perangkat perlu backend (Firebase/Supabase).

## V3.3
- Tema Otomatis / Terang / Gelap (tombol di header, menu samping, dan halaman login).
- BKB Penjualan: kolom "Input Nomor PB" (wajib), "Kode Driver / Kode Sales"; Shift WIB: 1 = 07-15, 2 = 15-23, 3 = 23-07.
- Supplier: "Kode Pabrik" (dari Master Data → Kode Pabrik), pilihan "Jenis Produk", "Nama Driver".
- Mutasi masuk dari depo bisa "Langsung dijual": Admin input BTB (tanpa cek Checker), lalu BKB Penjualan memilih mutasi tsb (status langsung Di Jalan).
- Master Data → Driver / Sales / Kode Pabrik punya fitur Impor (tempel data dari website UangRitase).

## V3.4
- Kode asli dari website UangRitase v20 (refcodes.js): 23 DMS Kode Pabrik, 30 Kode Galon (Driver), 18 Kode SPS (Driver). Otomatis dimuat saat aplikasi dibuka; tombol "Muat ulang data UangRitase v20" ada di Master Data.
- Driver/sales demo lama (HERI, YUGA, ASEP, dst.) dinonaktifkan dari pilihan; dokumen lama tetap utuh.

## V3.5
- Nama menu: BKB/BTB Distribusi, BKB/BTB Supplier, BKB/BTB Mutasi Depo, Saldo Per Tanggal KS.
- Supplier dan Mutasi Depo: "Nama Driver" diketik manual. BKB/BTB Distribusi tetap memilih Kode Driver / Kode Sales.

## V3.6
- Menu **Reset Data** (Admin & KA Gudang): cadangan, titik pulih otomatis, reset per kategori / per tanggal / penuh, pulihkan dari titik pulih atau file.
- Tampilan baru: login dengan kartu peran, tombol Bantuan (alur kerja + arti istilah), bar "MODE UJI COBA", checklist hari ini (Admin), kartu "Tugas berikutnya" (Checker), form bertahap, header HP lebih lega.

## V3.7
- **Update Depo (Checker Galon)**: menu baru + kartu hijau di dashboard. Isi JR BOTOL PC / PET / KOSONG dan antrian Jugrak AQ, Lasah AQ, Lasah VIT (tombol + / − atau ketik), pratinjau seperti WhatsApp, lalu **Salin untuk WhatsApp** atau **Buka WhatsApp**. Nama depo, tanggal, dan jam (WIB) otomatis. Isian tersimpan sebagai draf, riwayat hari ini bisa disalin ulang. Kode: `assets/js/depoupd.js`.
- Peran **Supervisor** diganti nama menjadi **KA Gudang** (data lama otomatis dimigrasi; kunci internal tidak berubah).
- Icon peran memakai gambar baru (`role-*.webp`) di halaman login, menu samping, dan dashboard.
- Tema terang: putih dengan gradasi tipis aqua/cyan. Tema gelap: midnight lebih elegan dan profesional. Halaman login mengikuti tema.

## Struktur file (V3.9)
Semua file berada di satu level, tanpa folder — langsung upload semua isi ke root repository GitHub, lalu aktifkan GitHub Pages (Settings → Pages → Branch `main` / root). Buka `index.html`.

## V3.11 — kompatibilitas & performa
- Tanpa `color-mix`, `backdrop-filter`, `filter: blur`, dan `inset` (diberi cadangan warna biasa) → tampilan sama di Chrome/Firefox lama (Windows 7).
- Bayangan lebih ringan, tanpa efek blur; JavaScript tetap gaya ES5.
- Login muat penuh di laptop 1366×768.
