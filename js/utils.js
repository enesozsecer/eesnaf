// js/utils.js

export function formatTR(num) { 
    return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
}

export function showSpinner(text = "Veriler Yükleniyor...") { 
    document.getElementById('spinner-text').innerText = text; 
    document.getElementById('global-spinner').style.display = 'flex'; 
}

export function hideSpinner() { 
    document.getElementById('global-spinner').style.display = 'none'; 
}

export function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

// HTML'den tetiklenen ortak fonksiyonlar
window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('active');

    const searchArea = document.getElementById('header-search-area');
    const actionBars = document.querySelectorAll('.mobile-action-bar'); 
    
    // YENİ: Logo yazısını seçiyoruz
    const logoText = document.querySelector('.logo-text'); 

    if (['cart', 'detail', 'favorites'].includes(pageId)) {
        if (searchArea) searchArea.style.display = 'none';
        actionBars.forEach(bar => bar.style.display = 'none');
        
        // YENİ: Anasayfada DEĞİLSEK gizleme sınıfını kaldır (Yazı görünsün)
        if (logoText) logoText.classList.remove('hide-on-home');
        
        if (pageId === 'cart' && window.updateCartUI) window.updateCartUI(); 
    } 
    else {
        if (searchArea) searchArea.style.display = 'flex';
        actionBars.forEach(bar => bar.style.display = ''); 
        
        // YENİ: Anasayfa AÇIKSA gizleme sınıfını ekle (Yazı gizlensin)
        if (logoText) logoText.classList.add('hide-on-home');
    }
};

window.openSidebarWith = function(sectionType) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const sortSection = document.getElementById('sidebar-sort-section');
    const filterSection = document.getElementById('sidebar-filter-section');

    // Sidebar'ı aç ve arkada kaymayı KESİN engelle
    sidebar.classList.add('open');
    overlay.style.display = 'block';
    
    // Hem body hem html'e ekliyoruz
    document.body.classList.add('no-scroll'); 
    document.documentElement.classList.add('no-scroll'); 

    // İstenen sekmeyi aç, diğerini kapat
    if (sectionType === 'sort') {
        if(sortSection) sortSection.classList.remove('collapsed');
        if(filterSection) filterSection.classList.add('collapsed');
    } else if (sectionType === 'filter') {
        if(filterSection) filterSection.classList.remove('collapsed');
        if(sortSection) sortSection.classList.add('collapsed');
    }
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if(sidebar.classList.contains('open')) {
        // Menü Kapanırken
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
        
        // Hem body hem html'den siliyoruz
        document.body.classList.remove('no-scroll'); 
        document.documentElement.classList.remove('no-scroll'); 
    } else {
        // Menü Açılırken
        sidebar.classList.add('open');
        overlay.style.display = 'block';
        
        // Hem body hem html'e ekliyoruz
        document.body.classList.add('no-scroll'); 
        document.documentElement.classList.add('no-scroll'); 
    }
};

window.toggleSection = function(headerElement) {
    const section = headerElement.parentElement;
    section.classList.toggle('collapsed');
};

// --- NAVBAR AÇILIR MENÜ (DROPDOWN) FONKSİYONLARI ---

window.toggleNavDropdown = function(event) {
    event.stopPropagation(); // Tıklamanın dışarı taşıp menüyü geri kapatmasını engeller
    document.getElementById('nav-dropdown-menu').classList.toggle('show');
};

window.closeNavDropdown = function() {
    const menu = document.getElementById('nav-dropdown-menu');
    if (menu && menu.classList.contains('show')) {
        menu.classList.remove('show');
    }
};

// Sayfanın neresine tıklanırsa tıklansın, menünün dışındaysa menüyü kapat
document.addEventListener('click', function(event) {
    const wrapper = document.querySelector('.nav-dropdown-wrapper');
    if (wrapper && !wrapper.contains(event.target)) {
        window.closeNavDropdown();
    }
});

// --- GECE / GÜNDÜZ MODU SİSTEMİ ---

window.toggleTheme = function(event) {
    if(event) event.preventDefault();
    const body = document.body;
    
    // light-mode sınıfını ekle/çıkar
    body.classList.toggle('light-mode');
    
    // Durumu LocalStorage'a kaydet (Sayfa yenilense de hatırlar)
    const isLight = body.classList.contains('light-mode');
    localStorage.setItem('eesnaf_theme', isLight ? 'light' : 'dark');
    
    window.closeNavDropdown();
};

// Sayfa ilk yüklendiğinde kullanıcının son seçtiği temayı uygula
const savedTheme = localStorage.getItem('eesnaf_theme');
if(savedTheme === 'light') {
    document.body.classList.add('light-mode');
}