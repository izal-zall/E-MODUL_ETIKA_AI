/* EthicAI Core & Interactive Engine Script */

// Web Audio API Sound Effects Synthesizer Class
class SoundEffects {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('ethic_ai_muted') === 'true';
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('ethic_ai_muted', this.muted);
        return this.muted;
    }

    playTone(freq, type, duration, delay = 0) {
        if (this.muted) return;
        try {
            this.init();
            setTimeout(() => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = type || 'sine';
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                
                gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            }, delay * 1000);
        } catch (e) {
            console.warn("Audio Context not allowed or initialized yet", e);
        }
    }

    playClick() {
        this.playTone(800, 'sine', 0.04);
    }

    playSuccess() {
        // C-major arpeggio
        this.playTone(523.25, 'sine', 0.1, 0);      // C5
        this.playTone(659.25, 'sine', 0.1, 0.06);   // E5
        this.playTone(783.99, 'sine', 0.1, 0.12);   // G5
        this.playTone(1046.50, 'sine', 0.2, 0.18);  // C6
    }

    playError() {
        this.playTone(200, 'sawtooth', 0.15, 0);
        this.playTone(130, 'sawtooth', 0.25, 0.08);
    }

    playFlip() {
        this.playTone(380, 'triangle', 0.06);
        this.playTone(580, 'triangle', 0.06, 0.02);
    }

    playTab() {
        this.playTone(350, 'sine', 0.04);
        this.playTone(450, 'sine', 0.04, 0.02);
    }
}

// Global SFX instantiation
const sfx = new SoundEffects();

// SPA state management
let currentProgress = 0;
let activeTab = 'dashboard';
let activeChapter = 1;
let activeMiniQuizChapter = 1;
let finalQuizScore = null;
let isFinalQuizSubmitted = false;
let finalQuizTimer = null;
let finalQuizSecondsRemaining = 600; // 10 minutes

// State trackers for progress increments
let progressState = {
    chaptersRead: new Set(),
    videosChecked: new Set(),
    miniQuizPassed: new Set(),
    dilemmaCompleted: false,
    classificationCompleted: false
};

// Simulated video players data
const videosData = {
    1: { question: "Jika hasil tulisan AI terbukti melakukan plagiarisme, siapakah yang bertanggung jawab secara akademis?", options: ["Perusahaan pengembang AI (OpenAI/Google)", "Dosen yang memberikan tugas", "Mahasiswa yang menggunakan AI tersebut"], correct: 2 },
    2: { question: "Manakah tindakan di bawah ini yang melanggar prinsip Transparansi Penggunaan AI?", options: ["Menyatakan secara jujur kapan dan bagaimana AI digunakan dalam tugas", "Menyembunyikan penggunaan AI agar tulisan terkesan 100% buatan sendiri", "Melampirkan transkrip prompt pada lampiran tugas akhir"], correct: 1 },
    3: { question: "Apa bahaya dari halusinasi data (AI Hallucination) bagi integritas penulisan karya ilmiah?", options: ["Komputer pengguna mengalami kelebihan beban pemrosesan", "AI menghasilkan data referensi fiktif yang tidak pernah ada", "Akun platform AI akan terhapus otomatis"], correct: 1 },
    4: { question: "Apa ancaman sosial utama dari penyebaran konten video/audio deepfake palsu di masyarakat?", options: ["Memicu misinformasi massal dan kerusakan nama baik tokoh terkait", "Mempercepat proses pengeditan klip video secara profesional", "Mengurangi pemakaian kuota penyimpanan internet"], correct: 0 },
    5: { question: "Manakah yang merupakan praktik terbaik sebelum mengumpulkan esai hasil bantuan AI?", options: ["Memakai alat spinner kata demi mengecoh detektor Turnitin", "Melakukan verifikasi manual terhadap seluruh fakta dan rujukan yang ditawarkan AI", "Meminta AI menulis pernyataan jaminan bebas plagiarisme secara mandiri"], correct: 1 }
};

// Mini Quiz per Bab Data
const miniQuizzes = {
    1: {
        q1: { text: "Apakah Generative AI memiliki nurani dan pemahaman mendalam atas teks buatan dirinya?", options: ["Ya, AI modern memiliki kesadaran sendiri", "Tidak, AI hanya merangkai kata berdasarkan probabilitas data latih"], correct: 1 },
        q2: { text: "Pemanfaatan AI untuk mencari inspirasi outline topik penulisan tergolong tindakan yang...", options: ["Dilarang keras", "Bijak & diperbolehkan asal tetap dikembangkan mandiri"], correct: 1 }
    },
    2: {
        q1: { text: "Mengapa sistem kecerdasan buatan rekrutmen kerja bisa memiliki bias gender?", options: ["Mempelajari pola timpang data historis pelamar masa lalu", "Karena software mengalami gangguan kelistrikan"], correct: 0 },
        q2: { text: "Pilar Akuntabilitas menyatakan tanggung jawab validitas tulisan berada penuh pada...", options: ["Mesin komputasi server", "Akademisi/mahasiswa pengguna"], correct: 1 }
    },
    3: {
        q1: { text: "Apa bahaya dari halusinasi data (AI Hallucination)?", options: ["Teks yang dihasilkan mengandung fabrikasi rujukan fiktif palsu", "Layar monitor mendadak mati"], correct: 0 },
        q2: { text: "Tindakan menyalin mentah kalimat chatbot ke dalam tugas tanpa mencantumkan sitasi melanggar...", options: ["Integritas akademik", "Regulasi kelistrikan"], correct: 0 }
    },
    4: {
        q1: { text: "Apa ancaman sosial terbesar dari teknologi deepfake?", options: ["Peningkatan kualitas resolusi video", "Penyebaran hoaks visual/suara sintetis yang merusak reputasi"], correct: 1 },
        q2: { text: "Ketergantungan kognitif ekstrem pada AI berisiko menumpulkan...", options: ["Logika kritis dan nalar analisis mandiri", "Ukuran harddisk komputer"], correct: 0 }
    },
    5: {
        q1: { text: "Apa esensi dari Prompting Etis?", options: ["Menyembunyikan instruksi rahasia", "Memberikan konteks terperinci, batasan, dan meminta rujukan primer asli"], correct: 1 },
        q2: { text: "Checklist evaluasi diri mandiri (Self-Check) wajib dijalankan...", options: ["Sebelum menyerahkan tugas kepada dosen", "Setelah tugas dinilai"], correct: 0 }
    }
};

// Branching Scenario Dilemma Data
let currentDilemma = 0;
let ethicalPoints = 0;
const dilemmasData = [
    {
        stepTitle: "Dilema 1 Dari 3",
        category: "Kategori: Akademik",
        text: "Anda memiliki waktu tepat 1 jam sebelum batas akhir pengumpulan esai mata kuliah wajib. Anda baru menyelesaikan 60% tulisan dan merasa buntu. Rekan Anda menyarankan penggunaan tool AI untuk 'melengkapi' sisa esai agar Anda tidak melewati tenggat waktu.",
        choices: [
            { text: "Kumpulkan apa adanya (60%) dengan catatan jujur kepada dosen pembimbing.", score: 30, feedback: "Keputusan Jujur! Meskipun nilai Anda mungkin tidak maksimal, dosen sangat menghargai integritas moral kejujuran Anda." },
            { text: "Gunakan AI untuk menulis sisa esai secara penuh, lalu kumpulkan langsung.", score: 0, feedback: "Pelanggaran Integritas! Dosen mendeteksi plagiarisme tinggi melalui sistem detektor kampus. Anda dipanggil komisi disiplin." },
            { text: "Gunakan AI hanya untuk merancang kerangka (outline) poin tersisa, lalu kembangkan manual secara cepat.", score: 35, feedback: "Keputusan Cerdas! Anda memanfaatkan efisiensi AI untuk memecahkan kebuntuan ide tanpa mengorbankan kejujuran tulisan." }
        ]
    },
    {
        stepTitle: "Dilema 2 Dari 3",
        category: "Kategori: Dampak Sosial",
        text: "Di grup chat angkatan, seorang teman membagikan video deepfake wajah dekan fakultas yang diedit menari konyol dengan latar musik jenaka. Teman Anda menantang Anda untuk ikut membagikannya ke media sosial publik agar viral.",
        choices: [
            { text: "Ikut membagikan ke TikTok/X untuk mendapatkan apresiasi humor dari teman angkatan.", score: 0, feedback: "Pelanggaran Privasi! Anda ikut menyebarluaskan media manipulatif yang mencemarkan martabat orang lain." },
            { text: "Mengabaikan postingan tersebut tanpa mengambil tindakan apa pun.", score: 15, feedback: "Sikap Pasif. Anda tidak melakukan kesalahan langsung, tetapi membiarkan penyebaran manipulasi informasi berlangsung." },
            { text: "Menolak membagikan, menegur teman tersebut secara pribadi, dan memintanya menghapus video demi etika.", score: 35, feedback: "Ksatria Etika Digital! Anda aktif menjaga integritas sosial dan melindungi kehormatan dosen Anda." }
        ]
    },
    {
        stepTitle: "Dilema 3 Dari 3",
        category: "Kategori: Profesional & Privasi",
        text: "Saat magang di laboratorium riset kesehatan, supervisor meminta Anda meringkas portofolio data medis riwayat penyakit pasien rahasia instansi. Portofolionya sangat besar. Anda tergoda mengunggah file spreadsheet pasien tersebut ke platform AI publik agar diringkas instan.",
        choices: [
            { text: "Mengunggah seluruh file Excel ke AI publik demi efisiensi waktu kerja.", score: 0, feedback: "Kebocoran Data Fatal! Server publik merekam riwayat medis privat pasien, melanggar undang-undang privasi data." },
            { text: "Melakukan anonimisasi (menghapus nama & nomor identitas) terlebih dahulu sebelum meminta AI merangkum pola.", score: 25, feedback: "Keputusan Waspada! Anda menyeimbangkan akselerasi teknologi dengan keharusan mematuhi kerahasiaan informasi pasien." },
            { text: "Mengerjakan secara offline / memakai sistem aman milik instansi untuk mematuhi regulasi.", score: 30, feedback: "Sangat Profesional! Anda menempatkan regulasi kepatuhan privasi data di atas kemudahan instan." }
        ]
    }
];

// Classification items
const dragItemsData = [
    { id: "drag-1", text: "Menggunakan AI untuk proofreading tata bahasa tulisan orisinal.", correctZone: "ethical" },
    { id: "drag-2", text: "Menyalin bulat-bulat esai ChatGPT lalu diklaim buatan sendiri.", correctZone: "violation" },
    { id: "drag-3", text: "Mengunggah identitas nama & data responden riset ke AI publik.", correctZone: "violation" },
    { id: "drag-4", text: "Memakai AI untuk membantu memetakan kerangka kerja (outline) awal.", correctZone: "ethical" }
];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadProgressFromStorage();
    setupMobileMenu();
    initDilemmaGame();
    initMiniQuiz();
    initClassificationGame();
    initTheme();
    initMuteState();
    initNetworkCanvas();
    
    // Sync status UIs for videos
    for(let i=1; i<=5; i++) {
        updateVideoStatusUI(i);
    }
    
    // Bind global page-click event to resume AudioContext (browser security)
    document.addEventListener('click', () => {
        sfx.init();
    }, { once: true });
});

// Theme Initialization & Management
function initTheme() {
    const savedTheme = localStorage.getItem('ethic_ai_theme') || 'dark';
    const htmlEl = document.documentElement;
    const themeIcon = document.getElementById('theme-toggle-icon');
    const themeBtn = document.getElementById('theme-toggle-btn');
    
    if (savedTheme === 'light') {
        htmlEl.classList.remove('dark');
        if (themeIcon) themeIcon.innerText = 'dark_mode';
        if (themeBtn) themeBtn.title = 'Ubah ke Mode Gelap';
    } else {
        htmlEl.classList.add('dark');
        if (themeIcon) themeIcon.innerText = 'light_mode';
        if (themeBtn) themeBtn.title = 'Ubah ke Mode Terang';
    }
}

function toggleTheme() {
    sfx.playClick();
    const htmlEl = document.documentElement;
    const themeIcon = document.getElementById('theme-toggle-icon');
    const themeBtn = document.getElementById('theme-toggle-btn');
    
    if (themeIcon) {
        themeIcon.classList.add('rotate-anim');
        setTimeout(() => themeIcon.classList.remove('rotate-anim'), 500);
    }
    
    if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        localStorage.setItem('ethic_ai_theme', 'light');
        if (themeIcon) themeIcon.innerText = 'dark_mode';
        if (themeBtn) themeBtn.title = 'Ubah ke Mode Gelap';
    } else {
        htmlEl.classList.add('dark');
        localStorage.setItem('ethic_ai_theme', 'dark');
        if (themeIcon) themeIcon.innerText = 'light_mode';
        if (themeBtn) themeBtn.title = 'Ubah ke Mode Terang';
    }
}

// Sound Volume Toggle
function initMuteState() {
    const muteIcon = document.getElementById('mute-toggle-icon');
    const muteBtn = document.getElementById('mute-toggle-btn');
    if (sfx.muted) {
        if (muteIcon) muteIcon.innerText = 'volume_off';
        if (muteBtn) muteBtn.title = 'Suara: Senyap';
    } else {
        if (muteIcon) muteIcon.innerText = 'volume_up';
        if (muteBtn) muteBtn.title = 'Suara: Aktif';
    }
}

function toggleMute() {
    const isMuted = sfx.toggleMute();
    const muteIcon = document.getElementById('mute-toggle-icon');
    const muteBtn = document.getElementById('mute-toggle-btn');
    
    if (isMuted) {
        if (muteIcon) muteIcon.innerText = 'volume_off';
        if (muteBtn) muteBtn.title = 'Suara: Senyap';
    } else {
        if (muteIcon) muteIcon.innerText = 'volume_up';
        if (muteBtn) muteBtn.title = 'Suara: Aktif';
        sfx.playClick();
    }
}

// Interactive Network Canvas Background
function initNetworkCanvas() {
    const canvas = document.getElementById('network-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });
    
    const particles = [];
    const particleCount = Math.min(50, Math.floor((width * height) / 30000));
    
    let mouse = { x: null, y: null, radius: 140 };
    
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    
    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });
    
    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.radius = Math.random() * 2 + 1;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
            
            // Mouse interaction
            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    this.x -= dx * force * 0.015;
                    this.y -= dy * force * 0.015;
                }
            }
        }
        
        draw() {
            const isDark = document.documentElement.classList.contains('dark');
            ctx.fillStyle = isDark ? 'rgba(187, 195, 255, 0.3)' : 'rgba(61, 90, 254, 0.2)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        const isDark = document.documentElement.classList.contains('dark');
        const lineColor = isDark ? 'rgba(187, 195, 255, 0.05)' : 'rgba(61, 90, 254, 0.04)';
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        // Draw network connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 120) {
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = (120 - dist) / 120 * 0.8;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// SPA Switch Tabs
function switchTab(tabId) {
    sfx.playTab();
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    const targetPane = document.getElementById('pane-' + tabId);
    if (targetPane) {
        targetPane.classList.add('active');
        activeTab = tabId;
    }

    // Update Active State in Desktop Nav
    const navIds = ['dashboard', 'chapters', 'activities', 'quiz', 'resources'];
    navIds.forEach(id => {
        const btn = document.getElementById('nav-' + id);
        if (btn) {
            if (id === tabId) {
                btn.className = "w-full flex items-center gap-4 py-3.5 px-5 rounded-xl bg-primary/10 text-primary border border-primary/20 font-semibold transition-all active:scale-95 text-left nav-active-glow";
            } else {
                btn.className = "w-full flex items-center gap-4 py-3.5 px-5 rounded-xl text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-all active:scale-95 text-left";
            }
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Mobile sidebar navigation
function setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('aside');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', (e) => {
            sfx.playClick();
            e.stopPropagation();
            sidebar.classList.toggle('hidden');
            sidebar.classList.toggle('flex');
            sidebar.classList.toggle('w-[85%]');
            sidebar.classList.toggle('bg-background');
        });

        // Close sidebar on item click (mobile)
        document.querySelectorAll('aside nav button').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth < 1024) {
                    sidebar.classList.add('hidden');
                    sidebar.classList.remove('flex', 'w-[85%]', 'bg-background');
                }
            });
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 1024 && !sidebar.contains(e.target) && e.target !== menuBtn) {
                sidebar.classList.add('hidden');
                sidebar.classList.remove('flex', 'w-[85%]', 'bg-background');
            }
        });
    }
}

// Chapter pane switching
function switchChapter(chNumber) {
    sfx.playClick();
    switchTab('chapters');
    document.querySelectorAll('.chapter-pane').forEach(pane => {
        pane.classList.remove('block');
        pane.classList.add('hidden');
    });
    
    const targetChapter = document.getElementById('chapter-pane-' + chNumber);
    if (targetChapter) {
        targetChapter.classList.remove('hidden');
        targetChapter.classList.add('block');
    }
    
    activeChapter = chNumber;

    // Highlight Chapter Button
    for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById('btn-ch-' + i);
        if (btn) {
            if (i === chNumber) {
                btn.className = "px-5 py-2.5 rounded-xl font-semibold text-xs transition-all bg-primary/10 text-primary border border-primary/20 pulse-glow";
            } else {
                btn.className = "px-5 py-2.5 rounded-xl font-semibold text-xs transition-all text-on-surface-variant hover:bg-white/5 hover:text-white";
            }
        }
    }

    // Track chapter read progress
    if (!progressState.chaptersRead.has(chNumber)) {
        progressState.chaptersRead.add(chNumber);
        calculateTotalProgress();
    }
}

// YouTube video select switcher
function changeYoutubeVideo(chNumber) {
    sfx.playClick();
    const select = document.getElementById('vid-select-' + chNumber);
    const iframe = document.getElementById('vid-iframe-' + chNumber);
    if (select && iframe) {
        iframe.src = `https://www.youtube.com/embed/${select.value}?enablejsapi=1`;
    }
}

// YouTube video checkpoint kuis trigger
function triggerVideoCheckpoint(chNumber) {
    sfx.playClick();
    const data = videosData[chNumber];
    if (progressState.videosChecked.has(chNumber)) {
        sfx.playSuccess();
        Swal.fire({
            title: 'Checkpoint Terverifikasi',
            text: 'Anda sudah menyelesaikan kuis checkpoint untuk Bab ' + chNumber + '.',
            icon: 'success',
            confirmButtonColor: '#3d5afe',
            background: 'var(--color-surface-container)',
            color: 'var(--color-on-surface)'
        });
        return;
    }

    Swal.fire({
        title: 'Checkpoint Kuis Bab ' + chNumber,
        text: data.question,
        icon: 'question',
        input: 'radio',
        inputOptions: data.options.reduce((acc, opt, idx) => {
            acc[idx] = opt;
            return acc;
        }, {}),
        inputValidator: (value) => {
            if (!value) {
                return 'Pilihlah salah satu jawaban untuk memverifikasi checkpoint!';
            }
        },
        confirmButtonText: 'Kirim Jawaban',
        confirmButtonColor: '#3d5afe',
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface)'
    }).then((result) => {
        if (result.value !== undefined) {
            const selectedAnswer = parseInt(result.value);
            if (selectedAnswer === data.correct) {
                sfx.playSuccess();
                Swal.fire({
                    title: 'Jawaban Benar!',
                    text: 'Hebat! Checkpoint video Bab ' + chNumber + ' berhasil terverifikasi.',
                    icon: 'success',
                    confirmButtonColor: '#3d5afe',
                    background: 'var(--color-surface-container)',
                    color: 'var(--color-on-surface)'
                });
                progressState.videosChecked.add(chNumber);
                calculateTotalProgress();
                updateVideoStatusUI(chNumber);
            } else {
                sfx.playError();
                Swal.fire({
                    title: 'Jawaban Kurang Tepat!',
                    text: 'Pahami kembali video di atas dan materi bab ini untuk mencoba lagi checkpoint kuis.',
                    icon: 'error',
                    confirmButtonColor: '#3d5afe',
                    background: 'var(--color-surface-container)',
                    color: 'var(--color-on-surface)'
                });
            }
        }
    });
}

function updateVideoStatusUI(chNumber) {
    const badge = document.getElementById('vid-badge-' + chNumber);
    const btn = document.getElementById('btn-checkpoint-' + chNumber);
    if (progressState.videosChecked.has(chNumber)) {
        if (badge) {
            badge.innerText = "Status: Terverifikasi (+3% Progress)";
            badge.className = "text-[9px] text-green-500 font-bold text-center";
        }
        if (btn) {
            btn.innerHTML = `<span class="material-symbols-outlined text-sm font-bold">check_circle</span> Terverifikasi`;
            btn.className = "w-full py-2.5 bg-green-600 text-white font-bold text-[10px] rounded-xl cursor-default flex items-center justify-center gap-1";
        }
    } else {
        if (badge) {
            badge.innerText = "Status: Belum Terverifikasi (+3% Progress)";
            badge.className = "text-[9px] text-on-surface-variant text-center";
        }
        if (btn) {
            btn.innerHTML = `<span class="material-symbols-outlined text-sm font-bold">verified</span> Verifikasi Checkpoint Pemahaman Video`;
            btn.className = "w-full py-2.5 bg-primary text-on-primary font-bold text-[10px] rounded-xl hover:shadow-[0_0_15px_rgba(187,195,255,0.4)] transition-all flex items-center justify-center gap-1 btn-magnetic";
        }
    }
}

// Help Center modal trigger
function showHelpCenter() {
    sfx.playClick();
    Swal.fire({
        title: 'Help Center',
        html: `<div class="text-left space-y-3 text-xs leading-relaxed">
            <p><strong>Bagaimana cara menaikkan progress?</strong><br/>Baca kelima bab materi, selesaikan video interaktif, dan taklukkan kuis di menu Aktivitas.</p>
            <p><strong>Apa batas kelulusan Evaluasi Akhir?</strong><br/>Anda harus mendapatkan nilai minimal 80 (menjawab 4 dari 5 pertanyaan dengan benar).</p>
            <p><strong>Data saya tersimpan ke mana?</strong><br/>Modul menggunakan penyimpanan lokal browser (localStorage) agar kemajuan belajar Anda tidak hilang saat memuat ulang halaman.</p>
        </div>`,
        icon: 'info',
        confirmButtonColor: '#3d5afe',
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface)'
    });
}

// User info popup
function showUserProfile() {
    sfx.playClick();
    Swal.fire({
        title: 'Informasi Pengguna',
        html: `<div class="text-center space-y-2 text-xs">
            <p class="font-bold text-sm text-primary">Jane Doe</p>
            <p class="text-on-surface-variant">NIM: L100260487</p>
            <p class="text-on-surface-variant font-mono">Status: Akademis Aktif</p>
            <button onclick="logoutSession()" class="mt-4 px-4 py-2 bg-error/20 text-error border border-error/30 rounded-xl hover:bg-error/30 transition-all text-[10px] font-bold">LOGOUT</button>
        </div>`,
        showConfirmButton: false,
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface)'
    });
}

function logoutSession() {
    sfx.playClick();
    Swal.fire({
        title: 'Keluar dari Modul?',
        text: 'Kemajuan belajar Anda akan direset sepenuhnya.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ba1a1a',
        cancelButtonColor: '#444656',
        confirmButtonText: 'Ya, Reset & Keluar',
        cancelButtonText: 'Batal',
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface)'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            location.reload();
        }
    });
}

// Global search function
function handleGlobalSearch(event) {
    if (event.key === 'Enter') {
        const query = document.getElementById('global-search-input').value.toLowerCase().trim();
        if (!query) return;

        sfx.playClick();
        // Simple keyword router to chapters or tabs
        if (query.includes('etika') || query.includes('mengenal') || query.includes('bab 1')) {
            switchChapter(1);
        } else if (query.includes('prinsip') || query.includes('pilar') || query.includes('bab 2')) {
            switchChapter(2);
        } else if (query.includes('akademik') || query.includes('plagiarisme') || query.includes('bab 3')) {
            switchChapter(3);
        } else if (query.includes('deepfake') || query.includes('sosial') || query.includes('bab 4')) {
            switchChapter(4);
        } else if (query.includes('checklist') || query.includes('tanggung') || query.includes('bab 5')) {
            switchChapter(5);
        } else if (query.includes('dilema') || query.includes('aktivitas') || query.includes('klasifikasi')) {
            switchTab('activities');
        } else if (query.includes('evaluasi') || query.includes('kuis') || query.includes('cbt')) {
            switchTab('quiz');
        } else {
            sfx.playError();
            Swal.fire({
                title: 'Pencarian Tidak Ditemukan',
                text: `Kata kunci "${query}" tidak terindeks. Cobalah kata "etika", "bias", atau "deepfake".`,
                icon: 'warning',
                confirmButtonColor: '#3d5afe',
                background: 'var(--color-surface-container)',
                color: 'var(--color-on-surface)'
            });
        }
    }
}

// Dilemma branching scenario engine
function initDilemmaGame() {
    const data = dilemmasData[currentDilemma];
    const stepTitleEl = document.getElementById('dilemma-step-title');
    const categoryEl = document.getElementById('dilemma-category');
    const textEl = document.getElementById('dilemma-text');
    const container = document.getElementById('dilemma-choices');
    
    if (!stepTitleEl || !container) return;

    stepTitleEl.innerText = data.stepTitle;
    categoryEl.innerText = data.category;
    textEl.innerText = data.text;
    container.innerHTML = '';

    data.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.className = "group flex items-center gap-4 p-5 rounded-2xl border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-highest transition-all text-left glass-card w-full btn-magnetic";
        btn.onclick = () => selectDilemmaChoice(idx);
        
        const labelArr = ['A', 'B', 'C'];
        btn.innerHTML = `
            <div class="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-all font-bold">${labelArr[idx]}</div>
            <div class="flex-1">
                <p class="font-bold text-on-surface group-hover:text-primary transition-colors text-xs">${choice.text}</p>
            </div>
        `;
        container.appendChild(btn);
    });
}

function selectDilemmaChoice(choiceIdx) {
    sfx.playClick();
    const data = dilemmasData[currentDilemma];
    const choice = data.choices[choiceIdx];
    
    ethicalPoints += choice.score;

    const isGood = choice.score > 15;
    if (isGood) sfx.playSuccess();
    else sfx.playError();

    Swal.fire({
        title: 'Konsekuensi Keputusan',
        text: choice.feedback,
        icon: isGood ? 'success' : 'error',
        confirmButtonColor: '#3d5afe',
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface)'
    }).then(() => {
        if (currentDilemma < dilemmasData.length - 1) {
            currentDilemma++;
            initDilemmaGame();
        } else {
            // Show final report card
            let label = "Butuh Bimbingan Moril";
            let desc = "Pikirkan matang-matang implikasi hukum dan integritas penggunaan kecerdasan buatan.";
            
            if (ethicalPoints >= 80) {
                label = "Ksatria Etika Digital (Sangat Etis)";
                desc = "Luar biasa! Anda menjunjung tinggi nilai orisinalitas riset dan kejujuran akademik digital.";
                sfx.playSuccess();
                if (window.confetti) confetti({ particleCount: 60, spread: 50 });
            } else if (ethicalPoints >= 50) {
                label = "Praktisi Etis (Cukup Beretika)";
                desc = "Bagus, namun berhati-hatilah pada detail-detail kepatuhan data privasi pasien/responden.";
                sfx.playSuccess();
            } else {
                sfx.playError();
            }

            Swal.fire({
                title: 'Simulasi Selesai!',
                html: `<div class="space-y-3">
                    <p class="text-xs text-on-surface-variant">Rapor Kesadaran Etis Anda:</p>
                    <p class="text-3xl font-extrabold text-primary font-mono">${ethicalPoints} / 100</p>
                    <p class="text-xs font-bold text-white">${label}</p>
                    <p class="text-[10px] text-on-surface-variant italic">${desc}</p>
                </div>`,
                icon: 'info',
                confirmButtonText: 'Reset Simulasi',
                confirmButtonColor: '#3d5afe',
                background: 'var(--color-surface-container)',
                color: 'var(--color-on-surface)'
            }).then(() => {
                currentDilemma = 0;
                ethicalPoints = 0;
                initDilemmaGame();
            });

            // Track completion progress
            if (!progressState.dilemmaCompleted) {
                progressState.dilemmaCompleted = true;
                calculateTotalProgress();
            }
        }
    });
}

// Mini Quiz per Bab
function initMiniQuiz() {
    switchMiniQuizChapter(activeMiniQuizChapter);
}

function switchMiniQuizChapter(chIdx) {
    sfx.playClick();
    activeMiniQuizChapter = chIdx;

    // Highlight sub-tab button
    for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById('quiz-tab-' + i);
        if (btn) {
            if (i === chIdx) {
                btn.className = "py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all bg-tertiary/10 text-tertiary border border-tertiary/20 pulse-glow";
            } else {
                btn.className = "py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all text-on-surface-variant hover:bg-white/5";
            }
        }
    }

    const data = miniQuizzes[chIdx];
    const q1Text = document.getElementById('mq-q1-text');
    const q2Text = document.getElementById('mq-q2-text');
    const options1 = document.getElementById('mq-q1-options');
    const options2 = document.getElementById('mq-q2-options');

    if (!q1Text || !options1) return;

    q1Text.innerText = `1. ${data.q1.text}`;
    q2Text.innerText = `2. ${data.q2.text}`;

    options1.innerHTML = '';
    data.q1.options.forEach((opt, idx) => {
        options1.innerHTML += `
            <label class="flex items-center gap-3 p-3 bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-tertiary rounded-xl cursor-pointer text-xs font-medium text-on-surface-variant hover:text-white transition-all">
                <input type="radio" name="mq-ans-1" value="${idx}" class="text-tertiary focus:ring-tertiary bg-slate-900 border-slate-700" required />
                <span>${opt}</span>
            </label>
        `;
    });

    options2.innerHTML = '';
    data.q2.options.forEach((opt, idx) => {
        options2.innerHTML += `
            <label class="flex items-center gap-3 p-3 bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-tertiary rounded-xl cursor-pointer text-xs font-medium text-on-surface-variant hover:text-white transition-all">
                <input type="radio" name="mq-ans-2" value="${idx}" class="text-tertiary focus:ring-tertiary bg-slate-900 border-slate-700" required />
                <span>${opt}</span>
            </label>
        `;
    });
}

function submitMiniQuiz() {
    const rad1 = document.querySelector('input[name="mq-ans-1"]:checked');
    const rad2 = document.querySelector('input[name="mq-ans-2"]:checked');

    if (!rad1 || !rad2) {
        sfx.playError();
        Swal.fire({
            title: 'Formulir Belum Lengkap',
            text: 'Harap jawab kedua pertanyaan kuis bab terlebih dahulu!',
            icon: 'warning',
            confirmButtonColor: '#3d5afe',
            background: 'var(--color-surface-container)',
            color: 'var(--color-on-surface)'
        });
        return;
    }

    sfx.playClick();
    const ans1 = parseInt(rad1.value);
    const ans2 = parseInt(rad2.value);
    const data = miniQuizzes[activeMiniQuizChapter];

    if (ans1 === data.q1.correct && ans2 === data.q2.correct) {
        sfx.playSuccess();
        Swal.fire({
            title: 'Kuis Bab Lulus!',
            text: 'Selamat! Pemahaman Anda mengenai Bab ' + activeMiniQuizChapter + ' sempurna.',
            icon: 'success',
            confirmButtonColor: '#3d5afe',
            background: 'var(--color-surface-container)',
            color: 'var(--color-on-surface)'
        });

        if (!progressState.miniQuizPassed.has(activeMiniQuizChapter)) {
            progressState.miniQuizPassed.add(activeMiniQuizChapter);
            calculateTotalProgress();
        }
    } else {
        sfx.playError();
        Swal.fire({
            title: 'Jawaban Kurang Tepat!',
            text: 'Evaluasi ulang materi bab ini secara mendalam lalu ulangi pengerjaan.',
            icon: 'error',
            confirmButtonColor: '#3d5afe',
            background: 'var(--color-surface-container)',
            color: 'var(--color-on-surface)'
        });
    }
}

// Classification Drag & Drop Game
let classificationDropped = { ethical: [], violation: [] };

function initClassificationGame() {
    const pool = document.getElementById('drag-items-pool');
    const ethicalTarget = document.getElementById('ethical-items-target');
    const violationTarget = document.getElementById('violation-items-target');
    
    if (!pool || !ethicalTarget) return;

    pool.innerHTML = '';
    ethicalTarget.innerHTML = '';
    violationTarget.innerHTML = '';
    classificationDropped = { ethical: [], violation: [] };

    dragItemsData.forEach(item => {
        const node = document.createElement('div');
        node.id = item.id;
        node.className = "px-4 py-3 bg-surface-container rounded-xl border border-outline-variant/30 cursor-grab active:cursor-grabbing text-xs font-semibold text-white hover:border-tertiary flex items-center justify-between transition-all duration-200";
        node.setAttribute('draggable', 'true');
        node.setAttribute('ondragstart', 'dragStart(event)');
        
        // Content text + mobile sorting buttons for accessibility
        node.innerHTML = `
            <span class="flex-1 pr-2">${item.text}</span>
            <div class="flex gap-1 shrink-0">
                <button onclick="moveItemAccessibility('${item.id}', 'ethical')" class="sm:hidden px-2 py-1 bg-primary/20 text-primary border border-primary/20 text-[9px] rounded-lg font-bold">ETIS</button>
                <button onclick="moveItemAccessibility('${item.id}', 'violation')" class="sm:hidden px-2 py-1 bg-error/20 text-error border border-error/20 text-[9px] rounded-lg font-bold">FRAUD</button>
            </div>
        `;
        pool.appendChild(node);
    });
}

function dragStart(ev) {
    ev.dataTransfer.setData("text/plain", ev.target.id);
    sfx.playClick();
}

function allowDrop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('drag-over');
}

function clearDragOver(ev) {
    ev.currentTarget.classList.remove('drag-over');
}

function handleDrop(ev, zone) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('drag-over');
    const itemId = ev.dataTransfer.getData("text/plain");
    const node = document.getElementById(itemId);
    
    if (node) {
        moveItemToZone(node, zone);
    }
}

function moveItemAccessibility(itemId, zone) {
    sfx.playClick();
    const node = document.getElementById(itemId);
    if (node) {
        moveItemToZone(node, zone);
    }
}

function moveItemToZone(node, zone) {
    sfx.playTone(500, 'triangle', 0.08);
    const targetContainer = document.getElementById(zone + '-items-target');
    if (!targetContainer) return;

    node.className = "px-3 py-1.5 bg-surface-container-highest border border-outline-variant/50 text-[10px] rounded-xl text-white transition-all";
    node.setAttribute('draggable', 'false');
    
    // Hide accessibility buttons
    const buttons = node.querySelector('div');
    if (buttons) buttons.classList.add('hidden');

    targetContainer.appendChild(node);

    // Record item zone mapping
    const itemObj = dragItemsData.find(i => i.id === node.id);
    if (zone === 'ethical') {
        classificationDropped.ethical.push(itemObj);
    } else {
        classificationDropped.violation.push(itemObj);
    }
}

function checkClassificationResults() {
    let totalCheckedCount = classificationDropped.ethical.length + classificationDropped.violation.length;
    if (totalCheckedCount < 4) {
        sfx.playError();
        Swal.fire({
            title: 'Kotak Klasifikasi Kosong',
            text: 'Harap tempatkan keempat kartu studi ke dalam kotak target!',
            icon: 'warning',
            confirmButtonColor: '#3d5afe',
            background: 'var(--color-surface-container)',
            color: 'var(--color-on-surface)'
        });
        return;
    }

    let errors = false;
    classificationDropped.ethical.forEach(item => {
        if (item.correctZone !== 'ethical') errors = true;
    });
    classificationDropped.violation.forEach(item => {
        if (item.correctZone !== 'violation') errors = true;
    });

    if (!errors) {
        sfx.playSuccess();
        Swal.fire({
            title: 'Hasil Klasifikasi Akurat!',
            text: 'Anda berhasil menyaring tindakan etis vs pelanggaran dengan sempurna.',
            icon: 'success',
            confirmButtonColor: '#3d5afe',
            background: 'var(--color-surface-container)',
            color: 'var(--color-on-surface)'
        });

        if (!progressState.classificationCompleted) {
            progressState.classificationCompleted = true;
            calculateTotalProgress();
        }
    } else {
        sfx.playError();
        Swal.fire({
            title: 'Klasifikasi Keliru!',
            text: 'Terdapat studi kasus yang diletakkan pada wadah yang salah. Coba ulang kembali.',
            icon: 'error',
            confirmButtonColor: '#3d5afe',
            background: 'var(--color-surface-container)',
            color: 'var(--color-on-surface)'
        }).then(() => {
            initClassificationGame();
        });
    }
}

// Flipping card animation trigger
function flipCardElement(boxNode, fId) {
    sfx.playFlip();
    boxNode.classList.toggle('flipped');
}

// Dynamic print/download checklist simulation
function downloadChecklist() {
    sfx.playSuccess();
    Swal.fire({
        title: 'Unduh Berkas Panduan',
        text: 'Berkas instrumen checklist dan regulasi moral AI disimulasikan siap unduh.',
        icon: 'success',
        confirmButtonColor: '#3d5afe',
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface)'
    });
}

// Privacy Policy Mock
function showPrivacyPolicy() {
    sfx.playClick();
    Swal.fire({
        title: 'Privacy Policy',
        text: 'Kami menjaga keamanan data log interaksi Anda dengan tidak mengunggahnya ke server publik eksternal.',
        icon: 'info',
        confirmButtonColor: '#3d5afe',
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface)'
    });
}

// Ethical Guidelines Mock
function showGuidelines() {
    sfx.playClick();
    Swal.fire({
        title: 'Ethical Guidelines',
        text: 'Regulasi moral UMS mewajibkan minimal 80% porsi pemikiran mandiri di atas otomasi AI generatif.',
        icon: 'info',
        confirmButtonColor: '#3d5afe',
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface)'
    });
}

// Self-Check checks tracker
function checkSelfListStatus() {
    const c1 = document.getElementById('chk-self-1').checked;
    const c2 = document.getElementById('chk-self-2').checked;
    const c3 = document.getElementById('chk-self-3').checked;

    sfx.playClick();

    if (c1 && c2 && c3) {
        sfx.playSuccess();
        if (window.confetti) confetti({ particleCount: 30, spread: 40 });
        Swal.fire({
            title: 'Self-Check Selesai!',
            text: 'Integritas moral Anda siap dipertanggungjawabkan di ujian akhir.',
            icon: 'success',
            confirmButtonColor: '#3d5afe',
            background: 'var(--color-surface-container)',
            color: 'var(--color-on-surface)'
        });
    }
}

// Final Quiz (CBT Engine)
let activeQuizQuestionIdx = 1;

function startFinalQuiz() {
    sfx.playClick();
    document.getElementById('quiz-start-screen').classList.add('hidden');
    document.getElementById('quiz-play-screen').classList.remove('hidden');
    activeQuizQuestionIdx = 1;
    showQuizQuestionBox(1);

    // Start Countdown
    finalQuizSecondsRemaining = 600;
    if (finalQuizTimer) clearInterval(finalQuizTimer);
    
    finalQuizTimer = setInterval(() => {
        if (finalQuizSecondsRemaining <= 0) {
            clearInterval(finalQuizTimer);
            sfx.playError();
            Swal.fire({
                title: 'Waktu Habis!',
                text: 'Waktu pengerjaan CBT telah usai. Mengumpulkan jawaban otomatis...',
                icon: 'warning',
                confirmButtonColor: '#3d5afe',
                background: 'var(--color-surface-container)',
                color: 'var(--color-on-surface)'
            }).then(() => {
                submitFinalQuiz();
            });
        } else {
            finalQuizSecondsRemaining--;
            let min = Math.floor(finalQuizSecondsRemaining / 60);
            let sec = finalQuizSecondsRemaining % 60;
            const timerEl = document.getElementById('quiz-timer');
            if (timerEl) {
                timerEl.innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            }
        }
    }, 1000);
}

function showQuizQuestionBox(idx) {
    document.querySelectorAll('.quiz-question-box').forEach(box => {
        box.classList.add('hidden');
    });
    const targetQBox = document.getElementById('q-box-' + idx);
    if (targetQBox) targetQBox.classList.remove('hidden');
    
    document.getElementById('quiz-progress-text').innerText = `Soal ${idx} dari 5`;
    document.getElementById('quiz-progress-bar').style.width = (idx / 5) * 100 + '%';

    // Navigation Button Toggle
    const prevBtn = document.getElementById('quiz-btn-prev');
    const nextBtn = document.getElementById('quiz-btn-next');
    const submitBtn = document.getElementById('quiz-btn-submit');

    if (idx === 1) {
        prevBtn.classList.add('invisible');
    } else {
        prevBtn.classList.remove('invisible');
    }

    if (idx === 5) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

function navigateQuizQuestion(direction) {
    sfx.playClick();
    let nextIndex = activeQuizQuestionIdx + direction;
    if (nextIndex >= 1 && nextIndex <= 5) {
        activeQuizQuestionIdx = nextIndex;
        showQuizQuestionBox(activeQuizQuestionIdx);
    }
}

function validateEsaiWordCount() {
    const text = document.getElementById('fq-5-text').value;
    const wordsCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    document.getElementById('word-count-badge').innerText = `Jumlah kata: ${wordsCount} / 15`;

    const warning = document.getElementById('word-count-warning');
    if (wordsCount >= 15) {
        warning.innerText = "Lulus Syarat Kata";
        warning.className = "text-green-500 font-bold";
    } else {
        warning.innerText = `Kurang ${15 - wordsCount} kata`;
        warning.className = "text-amber-500 font-bold";
    }
}

function submitFinalQuiz() {
    clearInterval(finalQuizTimer);

    // Retrieve and score answers
    // Answer keys: Q1: B, Q2: A, Q3: Salah, Q4: B, Q5: checked word count >= 15
    const q1 = document.querySelector('input[name="fq-1"]:checked');
    const q2 = document.querySelector('input[name="fq-2"]:checked');
    const q3 = document.querySelector('input[name="fq-3"]:checked');
    const q4 = document.querySelector('input[name="fq-4"]:checked');
    const q5Text = document.getElementById('fq-5-text').value;
    const q5WordCount = q5Text.trim().split(/\s+/).filter(w => w.length > 0).length;

    let score = 0;
    if (q1 && q1.value === 'B') score += 20;
    if (q2 && q2.value === 'A') score += 20;
    if (q3 && q3.value === 'Salah') score += 20;
    if (q4 && q4.value === 'B') score += 20;
    if (q5WordCount >= 15) score += 20;

    finalQuizScore = score;
    isFinalQuizSubmitted = true;

    // Display results page
    document.getElementById('quiz-play-screen').classList.add('hidden');
    document.getElementById('quiz-result-screen').classList.remove('hidden');

    const scoreBadge = document.getElementById('quiz-final-score');
    if (scoreBadge) scoreBadge.innerText = `${score} / 100`;

    const msg = document.getElementById('result-message');
    if (score >= 80) {
        sfx.playSuccess();
        msg.innerText = "Selamat, Anda dinyatakan lulus dengan kompetensi etis unggul!";
        msg.className = "text-xs text-green-500 font-bold mt-2";
        if (window.confetti) confetti({ particleCount: 80, spread: 60 });
    } else {
        sfx.playError();
        msg.innerText = "Nilai Anda di bawah standar kelulusan minimum (80). Ulangi pengerjaan.";
        msg.className = "text-xs text-error font-bold mt-2";
    }

    const refleksi = document.getElementById('result-refleksi-pribadi');
    if (refleksi) {
        refleksi.innerText = `Komitmen Pribadi: "${q5Text || 'Tidak diisi'}"`;
    }

    // Calculate progress increment for quiz
    calculateTotalProgress();
}

function resetQuizState() {
    sfx.playClick();
    document.getElementById('quiz-result-screen').classList.add('hidden');
    document.getElementById('quiz-start-screen').classList.remove('hidden');
    
    // reset fields
    document.querySelectorAll('input[name^="fq-"]').forEach(inp => {
        inp.checked = false;
    });
    const textEl = document.getElementById('fq-5-text');
    if (textEl) textEl.value = '';
    
    const countBadge = document.getElementById('word-count-badge');
    if (countBadge) countBadge.innerText = 'Jumlah kata: 0 / 15';
    
    const warning = document.getElementById('word-count-warning');
    if (warning) {
        warning.innerText = 'Kurang 15 kata';
        warning.className = "text-amber-500 font-bold";
    }

    isFinalQuizSubmitted = false;
    finalQuizScore = null;
    calculateTotalProgress();
}

// Scroll to Top shortcut
function scrollToTop() {
    sfx.playClick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Progress Calculation and persist via localStorage
function calculateTotalProgress() {
    let total = 0;

    // 1. Chapters Read (Max 25% -> 5% each)
    let chaptersCount = progressState.chaptersRead.size;
    total += chaptersCount * 5;

    // 2. Videos Checked (Max 15% -> 3% each)
    let videosCount = progressState.videosChecked.size;
    total += videosCount * 3;

    // 3. Mini Quiz passed (Max 20% -> 4% each)
    let miniQuizzesCount = progressState.miniQuizPassed.size;
    total += miniQuizzesCount * 4;

    // 4. Dilemma Simulation (Max 20%)
    if (progressState.dilemmaCompleted) total += 20;

    // 5. Classification drag & drop (Max 20%)
    if (progressState.classificationCompleted) total += 20;

    currentProgress = Math.min(total, 100);
    
    // Update DOM progress
    const textEl = document.getElementById('progress-percentage-text');
    if (textEl) textEl.innerText = currentProgress + '%';
    
    const barEl = document.getElementById('progress-percentage-bar');
    if (barEl) barEl.style.width = currentProgress + '%';

    // Update real-time stats widget on dashboard
    updateDashboardStats();

    saveProgressToStorage();
}

function updateDashboardStats() {
    const chapters = progressState.chaptersRead.size;
    const videos = progressState.videosChecked.size;
    const quizzes = progressState.miniQuizPassed.size;
    
    // Update text and progress bars
    const chEl = document.getElementById('stat-chapters');
    if (chEl) chEl.innerText = `${chapters} / 5`;
    const chBar = document.getElementById('stat-chapters-bar');
    if (chBar) chBar.style.width = `${(chapters / 5) * 100}%`;
    
    const viEl = document.getElementById('stat-videos');
    if (viEl) viEl.innerText = `${videos} / 5`;
    const viBar = document.getElementById('stat-videos-bar');
    if (viBar) viBar.style.width = `${(videos / 5) * 100}%`;
    
    const qzEl = document.getElementById('stat-quizzes');
    if (qzEl) qzEl.innerText = `${quizzes} / 5`;
    const qzBar = document.getElementById('stat-quizzes-bar');
    if (qzBar) qzBar.style.width = `${(quizzes / 5) * 100}%`;
    
    const fsEl = document.getElementById('stat-final-score');
    const fsBar = document.getElementById('stat-final-score-bar');
    if (fsEl) {
        if (isFinalQuizSubmitted && finalQuizScore !== null) {
            fsEl.innerText = `${finalQuizScore} / 100`;
            if (fsBar) fsBar.style.width = `${finalQuizScore}%`;
        } else {
            fsEl.innerText = `-`;
            if (fsBar) fsBar.style.width = `0%`;
        }
    }
}

function saveProgressToStorage() {
    const dataToSave = {
        chaptersRead: Array.from(progressState.chaptersRead),
        videosChecked: Array.from(progressState.videosChecked),
        miniQuizPassed: Array.from(progressState.miniQuizPassed),
        dilemmaCompleted: progressState.dilemmaCompleted,
        classificationCompleted: progressState.classificationCompleted
    };
    localStorage.setItem('ethic_ai_progress_2026', JSON.stringify(dataToSave));
}

function loadProgressFromStorage() {
    const stored = localStorage.getItem('ethic_ai_progress_2026');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            progressState.chaptersRead = new Set(parsed.chaptersRead || []);
            progressState.videosChecked = new Set(parsed.videosChecked || []);
            progressState.miniQuizPassed = new Set(parsed.miniQuizPassed || []);
            progressState.dilemmaCompleted = !!parsed.dilemmaCompleted;
            progressState.classificationCompleted = !!parsed.classificationCompleted;
            
            calculateTotalProgress();
        } catch (e) {
            console.error("Gagal load progress dari storage", e);
        }
    }
}
