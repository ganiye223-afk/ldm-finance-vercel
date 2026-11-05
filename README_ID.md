# LDM Finance — Paket Publish ke Vercel

Paket ini memindahkan **frontend** LDM Finance ke Vercel, tetapi mempertahankan backend Google Apps Script dan database Supabase yang sudah digunakan. Cara ini menghindari migrasi ulang tabel dan mengurangi risiko perubahan logika keuangan.

## Arsitektur

Browser → Vercel static frontend → Vercel `/api` proxy → Google Apps Script backend → Supabase PostgreSQL.

Vercel tidak menerima Supabase Secret API Key. Kunci Supabase tetap berada di Script Properties Apps Script. Vercel hanya menyimpan URL deployment Apps Script dan satu proxy secret yang dibagi antara Vercel dan Apps Script.

## A. Siapkan Apps Script API Bridge

1. Buka project Apps Script LDM Finance yang saat ini aktif.
2. Tambahkan file script baru bernama `VercelBridge.gs`.
3. Salin isi file `VercelBridge.gs` dari paket ini ke file baru tersebut.
4. Di file `Code.gs`/`Kode.gs`, ubah fungsi `doGet()` yang lama menjadi:

```javascript
function doGet() {
  return ContentService.createTextOutput("LDM Finance API Bridge aktif.")
    .setMimeType(ContentService.MimeType.TEXT);
}
```

Perubahan `doGet()` hanya untuk deployment API baru. Deployment Web App lama yang tidak Anda ubah tetap dapat dipakai sebagai cadangan.

## B. Buat proxy secret

Buat secret acak minimal 32 byte (64 karakter heksadesimal). Jika tersedia Node.js di komputer, jalankan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Jangan gunakan contoh/placeholder sebagai secret produksi. Jangan kirim secret melalui chat dan jangan menaruhnya di file HTML atau repository.

Di Apps Script:

1. Buka Project Settings → Script Properties.
2. Tambahkan property `VERCEL_PROXY_SECRET`.
3. Isi dengan secret acak yang baru dibuat.
4. Simpan.

Jangan mengubah atau menghapus Script Properties Supabase yang sudah ada.

## C. Buat deployment API baru di Apps Script

1. Klik Deploy → New deployment.
2. Pilih type **Web app**.
3. Description: `LDM Finance Vercel API Bridge`.
4. Execute as: **Me**.
5. Who has access: **Anyone**.
6. Klik Deploy dan selesaikan otorisasi.
7. Salin URL Web App yang berakhiran `/exec`.

Catatan keamanan: endpoint API baru dapat dijangkau publik, tetapi `doPost()` menolak semua permintaan tanpa proxy secret yang benar. Semua operasi data juga tetap menjalankan autentikasi Supabase di backend. Pertahankan secret hanya di Apps Script Script Properties dan Vercel Environment Variables. Jangan membagikan URL deployment bersama secret.

**Penting:** buat deployment API baru. Jangan mengedit deployment lama yang sekarang masih digunakan sebagai cadangan.

## D. Deploy ke Vercel

1. Ekstrak ZIP ini.
2. Buat repository GitHub **Private** baru, misalnya `ldm-finance-vercel`.
3. Upload seluruh isi folder paket ke root repository. Jangan upload folder `_source_reference`.
4. Buka Vercel → Add New → Project.
5. Import repository GitHub `ldm-finance-vercel`.
6. Framework Preset: **Other**. Root Directory: `./`.
7. Sebelum deploy, buka Environment Variables dan tambahkan:

| Name | Value |
|---|---|
| `GAS_WEB_APP_URL` | URL `/exec` dari deployment API Apps Script yang baru |
| `GAS_PROXY_SECRET` | Secret acak yang sama dengan `VERCEL_PROXY_SECRET` di Apps Script |

Pilih environment Production. Tambahkan Preview hanya jika Anda memang akan menguji deployment preview.

8. Klik Deploy.
9. Setelah deployment berhasil, buka domain `.vercel.app` yang diberikan Vercel.

Jika mengubah Environment Variables, lakukan redeploy agar variabel baru masuk ke deployment.

## E. Uji aplikasi

1. Login dengan username dan password LDM Finance yang sekarang.
2. Pastikan dashboard terbuka dan status sinkronisasi berubah menjadi `Data terbaru`.
3. Buka menu Anggaran, Utang & Cicilan, Transaksi, Dana Tujuan, dan Pengaturan.
4. Uji penyimpanan transaksi atau perubahan yang memang ingin dicatat.
5. Pastikan perubahan muncul setelah dashboard diperbarui.
6. Logout dan login kembali.

## Yang tetap dipertahankan

- Supabase project dan semua tabel yang sudah ada.
- Seluruh data transaksi, anggaran, cicilan, pembayaran, dan dana tujuan.
- Username/password Supabase Auth.
- Apps Script business logic dan validasi.
- CacheService, snapshot cache, dan trigger pemanasan cache setiap 5 menit yang sudah dipasang.
- UI dashboard dan fitur CRUD.

Tidak perlu menjalankan SQL, mengulang migrasi, atau menaruh Supabase Secret API Key di Vercel.

## Catatan performa

Frontend dan API Proxy kini berada di Vercel, tetapi backend Apps Script tetap menjadi hop jaringan berikutnya. Kecepatan dipengaruhi lokasi region Vercel, Google Apps Script, Supabase, cold start, dan ukuran snapshot. Paket ini mempertahankan mekanisme Instant Loading yang sekarang; target 1 detik tidak dapat dijamin.

## Troubleshooting

- `Konfigurasi API server belum lengkap`: periksa `GAS_WEB_APP_URL` dan `GAS_PROXY_SECRET` pada Vercel, lalu redeploy.
- `Akses API ditolak`: pastikan `VERCEL_PROXY_SECRET` di Apps Script sama persis dengan `GAS_PROXY_SECRET` di Vercel.
- `Apps Script API belum merespons JSON`: pastikan deployment API baru menggunakan versi yang berisi `VercelBridge.gs`, akses **Anyone**, dan URL `/exec` benar.
- `Sesi login tidak valid`: login ulang dan pastikan akun Supabase Auth yang diizinkan tidak berubah.
- Dashboard lama masih tampil: periksa apakah yang dibuka domain Vercel, bukan URL Apps Script lama.

Jangan menghapus deployment lama, project Apps Script, atau project Supabase selama proses uji coba.
