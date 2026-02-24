//#region Değişkenler ve Sabitler
// Daha sonrasında kullanılmak üzere hazırlanan elemanlar
const listElement = document.getElementById('list'); // Sol l 
const searchInput = document.getElementById('search'); // Arama kutusu
const btnCodes = document.getElementById('btnCodes'); // Tüm Kodlar düğmesi
const btnFavs = document.getElementById('btnFavs'); // Favoriler düğmesi
const btnHist = document.getElementById('btnHistory'); // Geçmiş düğmesi
const codeCountBadge = document.getElementById('codeCountBadge');
const favCountBadge = document.getElementById('favCountBadge');
const histCountBadge = document.getElementById('histCountBadge');

let themeToggleBtn = null; // DOMContentLoaded sonrası çözümlenir
let maxHistoryItems = 20; // Geçmişte en fazla 20 şey tutuyoruz
let currentTab = 'all'; // Şu an hangi düğme açık: all/favs/hist
let theme = 'dark'; // Renk modu: dark veya light
let searchTerm = ''; // Arama yazısı
let allCodes = []; // Bütün kodlar burada duruyor
let favIds = []; // Favori olanların kimlikleri
let histIds = []; // Geçmişte baktıklarımızın kimlikleri
let dataLoaded = null; // Veriler yüklensin diye bekleme sözü
let currentSelectedId = null; // Şu an tıklanmış kodun kimliği
let hasRenderedOnce = false; // Bir kere çizdik mi?
//#endregion

//#region Güncellemeler ve UI Kontrolleri
// Küçük sayı etiketlerini (badge) ve yıldızı güncelliyoruz
function updateBadges() {
    if (codeCountBadge) codeCountBadge.textContent = String(allCodes.length || 0);
    if (favCountBadge) favCountBadge.textContent = String(favIds.length || 0);
    while (histIds.length > maxHistoryItems)
              histIds.pop();
    if (histCountBadge) histCountBadge.textContent = String(histIds.length || 0);
}

function updateTopbarStar() {
    // Üstteki yıldız, seçilen şey favoriyse dolu olur
    try {
        const top = document.getElementById('topbarStar');
        if (!top) return;
        const isFav = currentSelectedId && favIds.includes(String(currentSelectedId));
        top.classList.toggle('active', !!isFav);
    } catch (e) {
        console.warn('updateTopbarStar error', e);
    }
}
//#endregion

//#region İlk Yükleme
async function first() {
// Başta verileri yüklüyoruz. Böylece listeyi gösterebiliriz.
// Programın başında verileri, favorileri ve geçmişi yükler
    try {
        if (window.electronAPI && window.electronAPI.loadAllData) {
            allCodes = (await window.electronAPI.loadAllData()) || [];
        } else {
            allCodes = [];
        }
    } catch (e) {
        console.warn('Failed to load data.json', e);
        allCodes = [];
    }

    try {
        if (window.electronAPI && window.electronAPI.loadData) {
            favIds = ((await window.electronAPI.loadData('favorites.json')) || []).map(String);
        } else {
            favIds = [];
        }
    } catch (e) {
        favIds = [];
    }
    try {
        if (window.electronAPI && window.electronAPI.loadData) {
            histIds = ((await window.electronAPI.loadData('history.json')) || []).map(String);
        } else {
            histIds = [];
        }
    } catch (e) {
        console.warn('Failed to load history.json during init', e);
        histIds = [];
    }

    updateBadges();
}
//#endregion

//#region Render Fonksiyonu
//Programın ana render fonksiyonu: filtreleme, liste oluşturma ve DOM'a ekleme
async function render() {
    if (!hasRenderedOnce) return;
    function buildIdToItemMap() {
        return new Map(allCodes.map(i => [String(i.id), i]));
    }
    
    // Listeyi ekrana çizen sihirli fonksiyon
    //#region Filtreleme
    function getFilteredList() {
        // Hangi sayfadaysak ona göre süzüyoruz
        if (currentTab === 'favs') {
            const favSet = new Set((favIds || []).map(String));
            return allCodes.filter(item => favSet.has(String(item.id)));
        }
        else if (currentTab === 'hist') {
            const idToItem = buildIdToItemMap();
            return (histIds || []).map(id => idToItem.get(String(id))).filter(Boolean);
        }
        return allCodes.slice();
    }
    //#endregion
    
    //#region Geçmiş
    // Geçmişe yeni öğe ekler ve belirli sayıdan fazlaysa en eskiyi çıkarır
    function addToHistoryCache(sid) {
        // Geçmişe en öne ekliyoruz. En eskileri çıkarıyoruz.
        if (!histIds.includes(sid)) {
            histIds.unshift(sid);
            updateBadges();
        } else {
            histIds = histIds.filter(x => x !== sid);
            histIds.unshift(sid);
            updateBadges();
        }
        if (currentTab === 'hist') renderList();
    }
    //#endregion

    //#region Liste Öğelerinin Oluşumu
    function createListItem(item) {
        // Her kod için bir satır oluşturuyoruz
        const li = document.createElement('li');
        li.className = 'list-item';
        const sid = String(item.id);
        li.dataset.id = sid;
        const isFav = favIds.includes(sid);
        li.innerHTML = `
            <span class="item-name">${item.name}</span>
            <svg class="star ${isFav ? 'active' : ''}" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
        `;
        // Yıldız düğmesi fonksiyonu
        // Favori kontrolü (yıldız): favori durumunu değiştirir ve kaydeder
        const star = li.querySelector('.star');
        if (star) {
            star.addEventListener('click', async (e) => {
                e.stopPropagation();
                const wasFav = favIds.includes(sid);
                if (wasFav) favIds = favIds.filter(x => x !== sid);
                else favIds.push(sid);
                updateBadges();
                try {
                    if (window.electronAPI && window.electronAPI.saveFavorites) {
                        await window.electronAPI.saveFavorites(favIds);
                    }
                } catch (err) {
                    console.warn('saveFavorites failed', err);
                }
                star.classList.toggle('active', !wasFav);
                if (currentSelectedId === sid) updateTopbarStar();
                if (currentTab === 'favs' && wasFav) renderList();
            });
        }
        //#region Liste Öğesini Yazdırma
        // Liste öğesine tıklama: geçmişe ekle (ana süreç üzerinden kaydet ve önbelleği güncelle)
        li.addEventListener('click', async () => {
            // Satıra basınca detayı sağda gösteriyoruz
            console.log('Opening:', item.id);
            currentSelectedId = sid;
            updateTopbarStar();
            try {
                if (window.electronAPI && window.electronAPI.appendToHistory) {
                    await window.electronAPI.appendToHistory(sid);
                }
            } catch (e) {
                console.warn('Failed to append to history', e);
            }
            addToHistoryCache(sid);
            try {
                const titleEl = document.getElementById('topbarName');
                const titleH1 = document.querySelector('.content>.info>h1');
                if (titleEl) titleEl.textContent = item.name || 'Kod Kütüphanesi';
                if (titleH1) titleH1.textContent = item.name || 'Kod Kütüphanesi';
            } catch (e) {
                console.warn('Failed to set title', e);
            }
            try {
                const descEl = document.querySelector('.description');
                if (descEl) descEl.textContent = item.description || '';
            } catch (e) {
                console.warn('Failed to set description element', e);
            }
            try {
                const preEl = document.querySelector('.info>pre>code');
                if (preEl) { preEl.textContent = item.example || ''; Prism.highlightElement(preEl); }
            } catch (e) {
                console.warn('Failed to set code example element', e);
            }
        });
        //#endregion
        return li;
    }
    //#endregion

    //#region Filtreyi renderlama
    // Render: filtreleri uygula ve liste öğelerini DOM'a ekle
    function renderList() {
        listElement.innerHTML = '';
        let filteredList = getFilteredList();
        if (searchTerm) {
            filteredList = filteredList.filter(item =>
                item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        filteredList.forEach(item => listElement.appendChild(createListItem(item)));
    }
    //#endregion
    if (dataLoaded) await dataLoaded;
    renderList();
}
//#endregion

//#region Tema Değiştirme
// Uygulamanın temasını (koyu/açık) ayarlar
function setTheme(name) {
    theme = name;
    document.documentElement.classList.remove('dark-theme','light-theme');
    document.documentElement.classList.add(theme + '-theme');
    if (!themeToggleBtn) return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
        themeToggleBtn.innerHTML = `
            <svg class="light-theme theme" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>`;
    } else {
      document.documentElement.classList.add('light');
        themeToggleBtn.innerHTML = `
            <svg class="dark-theme theme" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#090909" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>`;
    }
    
    // Prism tema dosyasını değiştir (SVG ayarlandıktan sonra)
    const prismLink = document.getElementById('prism-theme');
    if (prismLink) {
        prismLink.href = theme === 'dark' 
            ? 'node_modules/prismjs/themes/prism-tomorrow.css'
            : 'node_modules/prismjs/themes/prism.css';
    }
}

// Sayfa yüklendiğinde çalışan ana başlatma fonksiyonu
document.addEventListener('DOMContentLoaded', () => {
    Prism.highlightAll(); // Kod bloklarını vurgula Prism
    themeToggleBtn = document.getElementById('btnTheme');
    // LocalStorage'dan kaydedilmiş tema tercihini yükle
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') theme = stored;
    setTheme(theme);
    if (!themeToggleBtn) return;
    themeToggleBtn.style.cursor = 'pointer';
    // Tema değiştirme butonuna tıklama olayı ekle
    themeToggleBtn.addEventListener('click', () => {
        const next = document.documentElement.classList.contains('dark-theme') ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('theme', next); // Tema tercihini kaydet
    });
    // Üst bardaki yıldız ikonu için olay dinleyicisi
    const topbar = document.getElementById('topbarStar');
    if (topbar) {
        topbar.addEventListener('click', async () => {
            if (!currentSelectedId) return;
            const sid = String(currentSelectedId);
            const wasFav = favIds.includes(sid);
            if (wasFav) favIds = favIds.filter(x => x !== sid);
            else favIds.push(sid);
            updateBadges();
            try {
                if (window.electronAPI && window.electronAPI.saveFavorites) {
                    await window.electronAPI.saveFavorites(favIds);
                }
            } catch (err) {
                console.warn('saveFavorites failed', err);
            }
            updateTopbarStar();
            try {
                const li = listElement.querySelector(`li[data-id="${sid}"]`);
                if (li) {
                    const star = li.querySelector('.star');
                    if (star) star.classList.toggle('active', !wasFav);
                }
            } catch (e) {
                console.warn('Failed to update list star from topbar toggle', e);
            }
            render();
        });
    }
});
//#endregion

//#region Kenar Çubuğu Açma/Kapama
// Kenar çubuğunu mobil ve masaüstü görünümde kontrol eder
const menuBtn = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');

if (menuBtn && sidebar) {
    // Menü butonuna tıklandığında sidebar'ı aç/kapat
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('mobile-open');
    });

    let wasAboveThreshold = window.innerWidth > 700;

    // Pencere boyutu değiştiğinde responsive davranışı kontrol et
    window.addEventListener('resize', () => {
            const isBelowThreshold = window.innerWidth <= 801;
            if (isBelowThreshold && wasAboveThreshold) {
                    sidebar.classList.add('collapsed');
            } else if (!isBelowThreshold && !wasAboveThreshold) {
                    sidebar.classList.remove('collapsed');
            }
            wasAboveThreshold = !isBelowThreshold;
    });
}
//#endregion

// ====== NON-REGION CODE BELOW ======

dataLoaded = first();

// Sekmeler arasında geçiş yapar ve aktif sekmeyi vurgular
function setActiveTab(clickedBtn) {
    // Hangi düğme seçiliyse onu boyuyoruz
    [btnCodes, btnFavs, btnHist].forEach(btn => btn.classList.remove('active'));
    
    clickedBtn.classList.add('active');
}

// Sekme tıklama olayını işler ve içeriği yeniden render eder
async function handleTabClick(tab, btn) {
    // Düğmeye basınca sayfayı değiştirip yeniden çiziyoruz
    currentTab = tab;
    setActiveTab(btn);
    hasRenderedOnce = true;
    await render();
}

// Sekme butonları için tıklama dinleyicileri
btnCodes.onclick = () => handleTabClick('all', btnCodes);
btnFavs.onclick = () => handleTabClick('favs', btnFavs);
btnHist.onclick = () => handleTabClick('hist', btnHist);

// Arama inputu değiştiğinde listeyi filtreler
searchInput.oninput = (e) => {
    // Arama kutusuna yazınca listeyi süzüyoruz
    searchTerm = e.target.value;
    if (!hasRenderedOnce) return;
    render();
};