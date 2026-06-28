// js/pages/favorites.js
import { DB, favorites, saveFavoritesToStorage } from '../store.js';
import { formatTR } from '../utils.js';

window.updateFavIcon = function() {
    document.getElementById('fav-count').innerText = favorites.length;
}

window.showFavoritesPage = function() {
    window.showPage('favorites');
    const grid = document.getElementById('favorites-grid');
    const emptyMsg = document.getElementById('empty-fav-msg');
    grid.innerHTML = '';

    if (favorites.length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        const favProducts = DB.Products.filter(p => favorites.includes(p.Id));

        favProducts.forEach(p => {
            grid.innerHTML += `
                <div class="fav-list-card">
                    <div class="fav-img-wrapper" onclick="window.openDetail('${p.Id}')">
                        <img src="${p.PicturePath || 'img/logo-192.png'}" onerror="this.onerror=null; this.src='img/logo-192.png'">
                    </div>
                    <div class="fav-details" onclick="window.openDetail('${p.Id}')">
                        <div class="fav-title">${p.Name}</div>
                        <div class="fav-price">${formatTR(p.SalePrice)} ₺</div>
                    </div>
                    <button class="fav-remove-btn" onclick="window.removeFromFavorites('${p.Id}', event)" title="Favorilerden Çıkar">
                        <svg viewBox="0 0 512 512" width="24" height="24" fill="currentColor"><path d="M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z"/></svg>
                    </button>
                </div>
            `;
        });
    }
}

window.removeFromFavorites = function(id, event) {
    if(event) event.stopPropagation();
    
    // JS'de referans kaybetmemek için içeriği filtreleyerek temizliyoruz
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
    }
    
    saveFavoritesToStorage();
    window.updateFavIcon();
    window.showFavoritesPage(); 
}

// SAYFADAKİ TÜM FAVORİ BUTONLARINI ANINDA GÜNCELLEYEN SİSTEM
window.syncFavoriteButtons = function() {
    document.querySelectorAll('.card-fav-btn, .btn-favorite-icon-only').forEach(btn => {
        const id = btn.getAttribute('data-fav-id');
        if (id) {
            if (favorites.includes(id)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
};

window.removeFromFavorites = function(id, event) {
    if(event) event.stopPropagation();
    
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
    }
    
    saveFavoritesToStorage();
    window.updateFavIcon();
    window.showFavoritesPage(); 
    
    // İşlem bitince anasayfadaki kalbi de söndür
    window.syncFavoriteButtons(); 
}

window.toggleFavoriteInline = function(id, event) {
    if (event) event.stopPropagation(); 
    
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1); // Favoriden çıkar
    } else {
        favorites.push(id); // Favoriye ekle
    }
    
    saveFavoritesToStorage();
    window.updateFavIcon();
    
    // Tıklandığı anda anasayfa ve detay sayfasındaki TÜM o ürüne ait kalpleri yak/söndür
    window.syncFavoriteButtons(); 
}