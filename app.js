// Konfigurasi Supabase (Ganti dengan URL dan Anon Key dari Project Supabase Anda)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fungsi Modal Upload
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.remove('hidden');
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.add('hidden');
}

// Event Listener Utama saat Halaman Dimuat
document.addEventListener('DOMContentLoaded', async () => {
    // Simulasi user lokal sederhana (atau integrasikan Auth Supabase penuh)
    let currentUser = localStorage.getItem('picgram_user');
    if (!currentUser) {
        currentUser = 'User_' + Math.floor(Math.random() * 10000);
        localStorage.setItem('picgram_user', currentUser);
    }

    // Inisialisasi Halaman Profil
    const usernameDisplay = document.getElementById('usernameDisplay');
    const userInitial = document.getElementById('userInitial');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    
    if (usernameDisplay) {
        usernameDisplay.innerText = currentUser;
        userInitial.innerText = currentUser.charAt(0).toUpperCase();
        userEmailDisplay.innerText = `${currentUser.toLowerCase()}@picgram.app`;
        loadUserPosts(currentUser);
    }

    // Muat Feed di Beranda
    if (document.getElementById('feedContainer')) {
        loadFeed();
    }

    // Handle Form Upload
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('imageFile');
            const captionInput = document.getElementById('captionInput');
            const submitBtn = document.getElementById('submitBtn');

            if (fileInput.files.length === 0) return alert('Pilih foto terlebih dahulu!');

            submitBtn.innerText = 'Mengunggah...';
            submitBtn.disabled = true;

            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload Gambar ke Supabase Storage (Bucket: 'posts')
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('posts')
                .upload(filePath, file);

            if (uploadError) {
                alert('Gagal mengunggah foto: ' + uploadError.message);
                submitBtn.innerText = 'Bagikan Postingan';
                submitBtn.disabled = false;
                return;
            }

            // 2. Dapatkan Public URL dari Gambar
            const { data: { publicUrl } } = supabaseClient.storage
                .from('posts')
                .getPublicUrl(filePath);

            // 3. Simpan Data Postingan ke Database Tabel 'posts'
            const { error: dbError } = await supabaseClient
                .from('posts')
                .insert([
                    { username: currentUser, image_url: publicUrl, caption: captionInput.value }
                ]);

            if (dbError) {
                alert('Gagal menyimpan postingan ke database: ' + dbError.message);
            } else {
                alert('Foto berhasil dibagikan!');
                closeUploadModal();
                uploadForm.reset();
                loadUserPosts(currentUser);
            }

            submitBtn.innerText = 'Bagikan Postingan';
            submitBtn.disabled = false;
        });
    }
});

// Fungsi Memuat Feed Utama
async function loadFeed() {
    const feedContainer = document.getElementById('feedContainer');
    feedContainer.innerHTML = '<p class="text-neutral-400 text-center col-span-full py-10">Memuat postingan...</p>';

    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        feedContainer.innerHTML = `<p class="text-red-500 text-center col-span-full">Gagal memuat feed: ${error.message}</p>`;
        return;
    }

    if (posts.length === 0) {
        feedContainer.innerHTML = '<p class="text-neutral-400 text-center col-span-full py-10">Belum ada postingan. Jadilah yang pertama mengunggah!</p>';
        return;
    }

    feedContainer.innerHTML = '';
    posts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm flex flex-col hover:shadow-md transition';
        postCard.innerHTML = `
            <div class="p-4 flex items-center justify-between border-b border-neutral-100">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        ${post.username.charAt(0).toUpperCase()}
                    </div>
                    <span class="font-semibold text-sm">${post.username}</span>
                </div>
                <span class="text-xs text-neutral-400">${new Date(post.created_at).toLocaleDateString('id-ID')}</span>
            </div>
            <div class="aspect-square bg-neutral-100 overflow-hidden relative">
                <img src="${post.image_url}" alt="Post Image" class="w-full h-full object-cover hover:scale-105 transition duration-500">
            </div>
            <div class="p-4 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-2">
                    <button onclick="likePost(${post.id}, this)" class="text-neutral-700 hover:text-red-500 transition text-lg flex items-center space-x-1">
                        <i class="fa-regular fa-heart"></i>
                        <span class="text-xs font-medium">${post.likes || 0}</span>
                    </button>
                </div>
                <p class="text-sm text-neutral-800"><strong class="font-semibold mr-2">${post.username}</strong>${post.caption || ''}</p>
            </div>
        `;
        feedContainer.appendChild(postCard);
    });
}

// Fungsi Memuat Postingan Profil Pengguna
async function loadUserPosts(username) {
    const container = document.getElementById('userPostsContainer');
    if (!container) return;

    container.innerHTML = '<p class="text-neutral-400 text-center col-span-full py-10">Memuat postingan Anda...</p>';

    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false });

    if (error || posts.length === 0) {
        container.innerHTML = '<p class="text-neutral-400 text-center col-span-full py-10">Anda belum mengunggah foto apa pun.</p>';
        return;
    }

    container.innerHTML = '';
    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm flex flex-col';
        card.innerHTML = `
            <div class="aspect-square bg-neutral-100 overflow-hidden relative">
                <img src="${post.image_url}" alt="Post Image" class="w-full h-full object-cover">
            </div>
            <div class="p-4 flex items-center justify-between">
                <p class="text-sm text-neutral-700 truncate flex-1 mr-2">${post.caption || 'Tanpa caption'}</p>
                <button onclick="deletePost(${post.id})" class="text-neutral-400 hover:text-red-500 transition text-sm">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Fungsi Hapus Postingan
async function deletePost(id) {
    if (confirm('Apakah Anda yakin ingin menghapus postingan ini?')) {
        const { error } = await supabaseClient.from('posts').delete().eq('id', id);
        if (error) {
            alert('Gagal menghapus: ' + error.message);
        } else {
            location.reload();
        }
    }
}

// Fungsi Sederhana Tombol Like
function likePost(id, btn) {
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');
    let count = parseInt(span.innerText);

    if (icon.classList.contains('fa-regular')) {
        icon.classList.replace('fa-regular', 'fa-solid');
        icon.classList.add('text-red-500');
        span.innerText = count + 1;
    } else {
        icon.classList.replace('fa-solid', 'fa-regular');
        icon.classList.remove('text-red-500');
        span.innerText = count - 1;
    }
}
