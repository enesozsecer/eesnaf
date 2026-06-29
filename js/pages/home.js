// js/pages/home.js
import { DB, favorites, BIRIM } from '../store.js';
import { formatTR } from '../utils.js';

let html5QrcodeScanner;

window.populateFilters = function () {
    const catSelect = document.getElementById('filter-category');
    const brandSelect = document.getElementById('filter-brand');
    const groupSelect = document.getElementById('filter-productGroup');

    catSelect.innerHTML = '<option value="">Tümü</option>';
    brandSelect.innerHTML = '<option value="">Tümü</option>';
    groupSelect.innerHTML = '<option value="">Tümü</option>';

    // 1. ADIM: Verileri Türkçe kurallarına göre A'dan Z'ye sıralıyoruz
    const sortedCategories = [...DB.Categories].sort((a, b) => (a.Name || "").localeCompare(b.Name || "", 'tr-TR'));
    const sortedBrands = [...DB.Brands].sort((a, b) => (a.Name || "").localeCompare(b.Name || "", 'tr-TR'));
    const sortedGroups = [...DB.ProductGroups].sort((a, b) => (a.Name || "").localeCompare(b.Name || "", 'tr-TR'));

    // 2. ADIM: Sıralanmış verileri Select kutularına basıyoruz
    sortedCategories.forEach(c => { catSelect.innerHTML += `<option value="${c.Id}">${c.Name}</option>`; });
    sortedBrands.forEach(b => { brandSelect.innerHTML += `<option value="${b.Id}">${b.Name}</option>`; });
    sortedGroups.forEach(g => { groupSelect.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; });

    // 3. ADIM: Select kutularını Aramalı formata (Tom Select) çeviriyoruz
    const initTomSelect = (id) => {
        const el = document.getElementById(id);
        if (el) {
            // "Verileri Güncelle" yapıldığında üst üste binmemesi için eskisini siliyoruz
            if (el.tomselect) el.tomselect.destroy();
            
            new TomSelect(el, {
                plugins: ['clear_button'], // YENİ: Çarpı (Temizleme) butonu eklentisi
                create: false,
                placeholder: "Ara veya seç...",
                maxOptions: null, 
                dropdownParent: 'body', 
                onChange: function() {
                    // Seçim yapıldığında veya ÇARPIYA BASILDIĞINDA ürünleri filtreler
                    window.filterRenderedProducts();
                }
            });
        }
    };

    initTomSelect('filter-category');
    initTomSelect('filter-brand');
    initTomSelect('filter-productGroup');
}

window.filterRenderedProducts = function () {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    const q = document.getElementById('searchInput').value.toLowerCase();
    const isDiscounted = document.getElementById('filter-discounted').checked;
    const selCat = document.getElementById('filter-category').value;
    const selBrand = document.getElementById('filter-brand').value;
    const selGroup = document.getElementById('filter-productGroup').value;

    // Arama hızını maksimuma çıkarmak için ID'leri isimlerle eşleyen hızlı sözlükler oluşturuyoruz
    const catMap = {}; DB.Categories.forEach(c => catMap[c.Id] = c.Name ? c.Name.toLowerCase() : '');
    const brandMap = {}; DB.Brands.forEach(b => brandMap[b.Id] = b.Name ? b.Name.toLowerCase() : '');
    const groupMap = {}; DB.ProductGroups.forEach(g => groupMap[g.Id] = g.Name ? g.Name.toLowerCase() : '');

    const filteredProducts = DB.Products.filter(p => {
        // Ürün adı veya barkodunda geçiyor mu?
        const nameMatch = p.Name && p.Name.toLowerCase().includes(q);
        const barcodeMatch = p.BarCode && p.BarCode.toLowerCase().includes(q);
        
        // Kategori, Marka veya Ürün Grubu isimlerinde geçiyor mu?
        const catMatch = catMap[p.CategoryId] && catMap[p.CategoryId].includes(q);
        const brandMatch = brandMap[p.BrandId] && brandMap[p.BrandId].includes(q);
        const groupMatch = groupMap[p.ProductGroupId] && groupMap[p.ProductGroupId].includes(q);

        // Eğer arama kutusu doluysa ve BU 5 KRİTERDEN HİÇBİRİNDE EŞLEŞME YOKSA ürünü gizle
        if (q && !nameMatch && !barcodeMatch && !catMatch && !brandMatch && !groupMatch) return false;
        
        // Diğer klasik filtreler
        if (isDiscounted && !(Number(p.DiscountRate) > 0)) return false;
        if (selCat && p.CategoryId !== selCat) return false;
        if (selBrand && p.BrandId !== selBrand) return false;
        if (selGroup && p.ProductGroupId !== selGroup) return false;
        
        return true;
    });

    const sortVal = document.getElementById('desktop-sort') ? document.getElementById('desktop-sort').value : 'default';

    filteredProducts.sort((a, b) => {
        if (sortVal === 'price-asc') {
            return Number(a.SalePrice) - Number(b.SalePrice); 
        }
        else if (sortVal === 'price-desc') {
            return Number(b.SalePrice) - Number(a.SalePrice); 
        }
        else if (sortVal === 'az') {
            return (a.Name || "").localeCompare((b.Name || ""), 'tr');
        }
        else if (sortVal === 'za') {
            return (b.Name || "").localeCompare((a.Name || ""), 'tr'); 
        }
        return 0; 
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p style="color:var(--gold); grid-column: 1 / -1; text-align: center; font-size: 1.1rem; padding: 20px;">Bu filtrelere veya aramaya uygun ürün bulunamadı.</p>';
        return;
    }

    filteredProducts.forEach(p => {
        let rawDiscount = Number(p.DiscountRate);
        let formattedDiscountText = rawDiscount % 1 === 0 ? rawDiscount.toString() : rawDiscount.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
        let discountHtml = rawDiscount > 0 ? `<div class="discount-badge">%${formattedDiscountText} İndirim</div>` : '';
        let oldPriceHtml = rawDiscount > 0 ? `<span class="old-price">${formatTR(p.Price)}₺</span>` : `<span class="old-price"></span>`;
        let imgSrc = p.PicturePath && p.PicturePath !== "" ? p.PicturePath : 'img/logo-192.png';
        let unitName = BIRIM[p.UnitId] || 'Adet';

        const stockVal = Number(p.StockQuantity) || 0;
        const isOutOfStock = stockVal <= 0;
        const btnText = isOutOfStock ? "Stokta Yok" : "Sepete Ekle";
        const btnClass = isOutOfStock ? "btn-add btn-out-of-stock" : "btn-add";
        
        // YENİ: Eğer stokta yoksa miktar kutusu HTML'i boş gelsin
        const qtyInputHtml = isOutOfStock ? "" : `<input type="number" id="qty-${p.Id}" value="1" min="1" class="card-qty-input">`;

        grid.innerHTML += `
            <div class="product-card" onclick="window.openDetail('${p.Id}')">
                <button class="card-fav-btn ${favorites.includes(p.Id) ? 'active' : ''}" data-fav-id="${p.Id}" onclick="window.toggleFavoriteInline('${p.Id}', event)" title="Favorilere Ekle">
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
                        ${qtyInputHtml}
                        <button class="${btnClass}" onclick="event.stopPropagation(); window.addToCart('${p.Id}', document.getElementById('qty-${p.Id}') ? document.getElementById('qty-${p.Id}').value : 1)">${btnText}</button>
                    </div>
                </div>
            </div>
        `;
    });
}

window.changeGrid = function (col) {
    document.querySelectorAll('.btn-grid').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('products-grid').className = `products-grid grid-${col}`;
}

window.openBarcodeScanner = function () {
    document.getElementById('barcode-modal').style.display = 'flex';
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    html5QrcodeScanner.render((decodedText) => {
        document.getElementById('searchInput').value = decodedText;
        window.filterRenderedProducts();
        window.closeBarcodeScanner();
    }, () => { });
}

window.closeBarcodeScanner = function () {
    if (html5QrcodeScanner) { html5QrcodeScanner.clear(); }
    document.getElementById('barcode-modal').style.display = 'none';
}

window.applySort = function (val) {
    // Sadece sidebar içindeki sıralama kutusu kaldı, değerini değiştirip tetikliyoruz.
    const deskSort = document.getElementById('desktop-sort');
    if (deskSort) {
        deskSort.value = val;
    }

    // Verileri anında yeniden sıralayıp ekrana basar
    window.filterRenderedProducts();
}