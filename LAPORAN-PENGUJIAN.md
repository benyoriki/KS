# Laporan Pengujian V3
Chromium headless (Playwright), 7 Nov 2026: **45 pengujian lulus, 0 error console/JS.**
Cakupan: skenario Heri → Toko ABC 450 galon (BKB → notifikasi realtime antar tab → Selesai Muat → BTB → ritase 1, saldo isi 112.801 / kosong 20.303); Supplier SPS dengan selisih BTB; stock tidak cukup; saldo awal manual & saran besok; RBAC lintas role (UI + fungsi tulis); reset BTB/batal oleh Supervisor; semua halaman Admin/Supervisor; tampilan 390 px dan 1366 px.
Belum diuji: perangkat fisik, multi-perangkat, GitHub Pages sungguhan.

## V3.1 — Pengujian ulang
68 pemeriksaan otomatis (Playwright, layar HP 390px) lulus, 0 error konsol. Tambahan: Rit 1/Rit 2 otomatis, pemisahan per tanggal (dokumen, notifikasi, laporan), Jugrak/Pallet via Supplier, Pallet ditolak di luar Supplier, grup produk dari Excel.
