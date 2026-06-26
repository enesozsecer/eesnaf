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
    // 1. Tüm sayfaları gizle, sadece hedef sayfayı göster
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('active');

    // 2. Kontrol edilecek elemanları seç
    const searchArea = document.getElementById('header-search-area');
    const actionBars = document.querySelectorAll('.mobile-action-bar'); // Yeni ikili menümüz

    // 3. Sepet, Detay veya Favoriler sayfasındaysak arama ve filtreleri GİZLE
    if (['cart', 'detail', 'favorites'].includes(pageId)) {
        if (searchArea) searchArea.style.display = 'none';
        
        // Menüleri zorla gizliyoruz
        actionBars.forEach(bar => bar.style.display = 'none');
        
        if (pageId === 'cart' && window.updateCartUI) window.updateCartUI(); 
    } 
    // 4. Ana sayfadaysak (Alışveriş ekranı) GERİ GETİR
    else {
        if (searchArea) searchArea.style.display = 'flex';
        
        // Boş ('') bırakıyoruz ki CSS dosyasına geri dönsün!
        // CSS kuralımız gereği: Masaüstünde gizli (none), Mobilde görünür (flex) olacak.
        actionBars.forEach(bar => bar.style.display = ''); 
    }
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
};

window.toggleSection = function(headerElement) {
    const section = headerElement.parentElement;
    section.classList.toggle('collapsed');
};