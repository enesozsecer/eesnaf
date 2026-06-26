// js/pages/home.js
import { DB, favorites, BIRIM } from '../store.js';
import { formatTR } from '../utils.js';

let html5QrcodeScanner;

window.populateFilters = function() {
    const catSelect = document.getElementById('filter-category');
    const brandSelect = document.getElementById('filter-brand');
    const groupSelect = document.getElementById('filter-productGroup');

    catSelect.innerHTML = '<option value="">Tümü</option>'; 
    brandSelect.innerHTML = '<option value="">Tümü</option>'; 
    groupSelect.innerHTML = '<option value="">Tümü</option>';
    
    DB.Categories.forEach(c => { catSelect.innerHTML += `<option value="${c.Id}">${c.Name}</option>`; });
    DB.Brands.forEach(b => { brandSelect.innerHTML += `<option value="${b.Id}">${b.Name}</option>`; });
    DB.ProductGroups.forEach(g => { groupSelect.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; });
}

window.filterRenderedProducts = function() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    const q = document.getElementById('searchInput').value.toLowerCase();
    const isDiscounted = document.getElementById('filter-discounted').checked;
    const selCat = document.getElementById('filter-category').value;
    const selBrand = document.getElementById('filter-brand').value;
    const selGroup = document.getElementById('filter-productGroup').value;

    const filteredProducts = DB.Products.filter(p => {
        const nameMatch = p.Name && p.Name.toLowerCase().includes(q);
        const barcodeMatch = p.BarCode && p.BarCode.toLowerCase().includes(q);

        if (q && !nameMatch && !barcodeMatch) return false;
        if (isDiscounted && !(Number(p.DiscountRate) > 0)) return false;
        if (selCat && p.CategoryId !== selCat) return false;
        if (selBrand && p.BrandId !== selBrand) return false;
        if (selGroup && p.ProductGroupId !== selGroup) return false;
        return true;
    });

    const sortVal = document.getElementById('desktop-sort').value;
    
    filteredProducts.sort((a, b) => {
        if (sortVal === 'price-asc') {
            return Number(a.SalePrice) - Number(b.SalePrice); // En Düşükten Yükseğe
        } 
        else if (sortVal === 'price-desc') {
            return Number(b.SalePrice) - Number(a.SalePrice); // En Yüksekten Düşüğe
        } 
        else if (sortVal === 'az') {
            // Türkçe karakter desteği ile (Ş, Ğ, Ü, vb.) A'dan Z'ye
            return a.Name.localeCompare(b.Name, 'tr'); 
        } 
        else if (sortVal === 'za') {
            return b.Name.localeCompare(a.Name, 'tr'); // Z'den A'ya
        }
        return 0; // Varsayılan değer (Değişiklik yapma)
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p style="color:var(--gold); grid-column: 1 / -1;">Bu filtrelere veya barkoda uygun ürün bulunamadı.</p>';
        return;
    }

    filteredProducts.forEach(p => {
        let rawDiscount = Number(p.DiscountRate);
        let formattedDiscountText = rawDiscount % 1 === 0 ? rawDiscount.toString() : rawDiscount.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
        let discountHtml = rawDiscount > 0 ? `<div class="discount-badge">%${formattedDiscountText} İndirim</div>` : '';
        let oldPriceHtml = rawDiscount > 0 ? `<span class="old-price">${formatTR(p.Price)}₺</span>` : `<span class="old-price"></span>`;
        let imgSrc = p.PicturePath && p.PicturePath !== "" ? p.PicturePath : 'img/logo-192.png';
        let unitName = BIRIM[p.UnitId] || 'Adet';

        grid.innerHTML += `
            <div class="product-card" onclick="window.openDetail('${p.Id}')">
                <button class="card-fav-btn ${favorites.includes(p.Id) ? 'active' : ''}" onclick="window.toggleFavoriteInline('${p.Id}', event)" title="Favorilere Ekle">
                    <svg viewBox="0 0 512 512" width="16" height="16" fill="currentColor">
                        <path d="M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z"/>
                    </svg>
                </button>
                <div class="image-wrapper">
                    ${discountHtml}
                    <img src="${imgSrc}" class="product-img" onerror="this.onerror=null; this.src='img/logo-192.png'">
                </div>
                <div class="card-body">
                    <h3 class="product-title" title="${p.Name}">${p.Name}</h3>
                    <p class="product-desc" title="${p.Description || ''}">${p.Description || ''}</p>
                    <div class="price-area">
                        ${oldPriceHtml}
                        <span class="new-price">${formatTR(p.SalePrice)}₺ <span class="unit-suffix">/ ${unitName}</span></span>
                    </div>
                    <div class="card-action-area" onclick="event.stopPropagation();">
                        <input type="number" id="qty-${p.Id}" value="1" min="1" class="card-qty-input">
                        <button class="btn-add" onclick="window.addToCart('${p.Id}', document.getElementById('qty-${p.Id}').value)">Sepete Ekle</button>
                    </div>
                </div>
            </div>
        `;
    });
}

window.changeGrid = function(col) {
    document.querySelectorAll('.btn-grid').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('products-grid').className = `products-grid grid-${col}`;
}

window.openBarcodeScanner = function() {
    document.getElementById('barcode-modal').style.display = 'flex';
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    html5QrcodeScanner.render((decodedText) => {
        document.getElementById('searchInput').value = decodedText;
        window.filterRenderedProducts();
        window.closeBarcodeScanner();
    }, () => {});
}

window.closeBarcodeScanner = function() {
    if (html5QrcodeScanner) { html5QrcodeScanner.clear(); }
    document.getElementById('barcode-modal').style.display = 'none';
}

window.applySort = function(val) {
    // Hem masaüstündeki hem mobildeki kutuyu aynı değere eşitler (Senkronizasyon)
    document.getElementById('mobile-sort').value = val;
    document.getElementById('desktop-sort').value = val;
    
    // Verileri anında yeniden sıralayıp ekrana basar
    window.filterRenderedProducts();
}