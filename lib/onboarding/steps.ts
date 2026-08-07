import { appRoutes } from "@/lib/site-config";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  example?: string;
  href?: string;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "selamat-datang",
    title: "Selamat datang",
    description:
      "AgentX bantu kerja harian: jawab pertanyaan, kelola todo, jadwalkan otomatisasi. Di sini ringkasan fitur utamanya.",
    example:
      "Contoh: \"Ringkas email penting hari ini\" atau \"Buat todo follow-up rapat besok pagi.\"",
  },
  {
    id: "chat",
    title: "Chat",
    description:
      "Buka Chat untuk bicara dengan agent. Tanya apa saja, minta buat todo, jadwalkan otomatisasi, atau cari info. Percakapan tersimpan, bisa dilanjutkan kapan saja.",
    example:
      "Contoh: \"Cari berita terbaru soal regulasi pajak\" atau \"Buatkan draft balasan email ke vendor.\"",
    href: appRoutes.chat,
  },
  {
    id: "todo",
    title: "Todo",
    description:
      "Kelola tugas di Todo. Buat sendiri atau minta agent lewat chat. Cek status (Belum mulai, Berjalan, Menunggu, Selesai) dan tenggat di dashboard.",
    example:
      "Contoh: \"Siapkan laporan bulanan\" dengan tenggat Jumat, atau minta di chat: \"Tambah todo review kontrak, deadline besok.\"",
    href: appRoutes.todos,
  },
  {
    id: "otomatisasi",
    title: "Otomatisasi",
    description:
      "Jadwalkan tugas berulang di Otomatisasi. Agent jalanin prompt otomatis, misalnya ringkasan harian atau pengingat mingguan.",
    example:
      "Contoh: setiap Senin jam 08.00, prompt \"Ringkas todo terbuka minggu ini dan yang terlambat.\"",
    href: appRoutes.schedules,
  },
  {
    id: "memory",
    title: "Memory",
    description:
      "Memory simpan preferensi yang diingatkan ke agent: gaya bahasa, konteks kerja, atau aturan khusus. Dipakai di semua chat.",
    example:
      "Contoh: \"Ingat, balasan email pakai bahasa formal\" atau \"Saya kerja di divisi keuangan, fokus ke angka dan tenggat.\"",
    href: appRoutes.memories,
  },
  {
    id: "file",
    title: "File",
    description:
      "Upload dokumen ke File, lalu tanya isinya lewat chat file. Cocok untuk laporan, kontrak, atau catatan panjang.",
    example:
      "Contoh: upload laporan_Q3.pdf, lalu tanya \"Apa tiga poin utama dan risiko yang disebut?\"",
    href: appRoutes.files,
  },
  {
    id: "whatsapp",
    title: "Ringkasan WhatsApp",
    description:
      "Hubungkan WhatsApp di Pengaturan, lalu buka Ringkasan WhatsApp. Lihat ringkasan chat penting; agent bisa bantu pantau inbox.",
    example:
      "Contoh: minta di chat \"Ringkas chat grup proyek X hari ini\" atau buka Ringkasan WhatsApp untuk lihat digest harian.",
    href: appRoutes.whatsappInbox,
  },
  {
    id: "integrasi",
    title: "Integrasi",
    description:
      "Sambungkan Google, Microsoft, atau layanan lain di Pengaturan → Integrasi. Agent bisa akses email, kalender, dan drive.",
    example:
      "Contoh: setelah hubungkan Gmail, tanya \"Ada email urgent hari ini?\" atau \"Buat event rapat besok jam 10 di kalender.\"",
    href: appRoutes.settings,
  },
  {
    id: "selesai",
    title: "Selesai",
    description:
      "Siap mulai. Buka Chat untuk percakapan pertama, atau lihat menu di sidebar. Panduan ini tetap ada di menu Panduan.",
    example:
      "Contoh langkah pertama: buka Chat, kirim \"Apa yang bisa kamu bantu hari ini?\" lalu coba buat satu todo dari balasannya.",
  },
];
