// ==========================================
// 1. PWA & KURULUM BİLDİRİMİ
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Başarısız: ', err)); });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBanner = document.getElementById('install-banner');
    if (installBanner) {
        installBanner.style.display = 'flex';
    }
});

window.installAppManual = function () {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; document.getElementById('install-banner').style.display = 'none'; });
    } else {
        const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        if (isIos()) alert("📱 iPhone'a yüklemek için:\n\nTarayıcının altındaki 'Paylaş' (Kare ve yukarı ok) ikonuna dokunun ve 'Ana Ekrana Ekle' seçeneğini seçin.");
        else alert("✅ Uygulama cihazınızda yüklü olabilir veya tarayıcınız desteklemiyor.\n\nMenüden (Sağ üstteki 3 nokta) 'Ana Ekrana Ekle' seçeneği ile indirebilirsiniz.");
    }
}
window.closeInstallBanner = function () { document.getElementById('install-banner').style.display = 'none'; }

// ==========================================
// 2. FIREBASE YAPILANDIRMASI (Burayı Doldur!)
// ==========================================
const firebaseConfig = {
    apiKey: "SENIN_API_KEY",
    authDomain: "SENIN_PROJE_ID.firebaseapp.com",
    projectId: "eesnaf-34bf2",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// 3. GLOBAL DEĞİŞKENLER & YARDIMCILAR
// ==========================================
const BIRIM = { 1: 'Adet', 2: 'Kilogram', 3: 'Gram', 4: 'Litre', 5: 'Metre', 6: 'Paket', 7: 'Koli' };
let DB = { Categories: [], Brands: [], ProductGroups: [], Products: [] };
let cart = JSON.parse(localStorage.getItem("eesnaf_cart")) || [];
let favorites = JSON.parse(localStorage.getItem("eesnaf_favorites")) || [];
let html5QrcodeScanner; // Barkod Tarayıcı Objesi

function formatTR(num) { return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function showSpinner(text = "Veriler Yükleniyor...") { document.getElementById('spinner-text').innerText = text; document.getElementById('global-spinner').style.display = 'flex'; }
function hideSpinner() { document.getElementById('global-spinner').style.display = 'none'; }

function showPage(pageId) {
    // 1. Tüm sayfaları gizle, sadece isteneni aktif et
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('active');

    // 2. Gizlenecek alanları seç
    const searchArea = document.getElementById('header-search-area');
    const filterBtns = document.querySelectorAll('.mobile-filter-toggle'); // Filtre butonları

    // 3. Sepet veya Detay sayfasındaysak arama, yenileme ve filtreyi gizle
    if (pageId === 'cart' || pageId === 'detail' || pageId === 'favorites') {
        if (searchArea) searchArea.style.display = 'none';
        filterBtns.forEach(btn => btn.style.display = 'none');
        if (pageId === 'cart') updateCartUI();
    } else {
        // 4. Ana sayfaya dönüldüğünde bunları tekrar görünür yap
        if (searchArea) searchArea.style.display = 'flex';

        // Filtre butonunun "display" özelliğini boş bırakıyoruz. 
        // Böylece CSS'teki kurallar devreye girer (Masaüstünde gizli, mobilde görünür kalır).
        filterBtns.forEach(btn => btn.style.display = '');
    }
}

// ==========================================
// 4. VERİ ÇEKME İŞLEMLERİ
// ==========================================
window.onload = () => {
    loadDataWithCache();
    updateCartIcon();
};

// İkon Güncelleme Fonksiyonu
window.updateFavIcon = function () {
    document.getElementById('fav-count').innerText = favorites.length;
};

// Mevcut window.onload'un içine ekle:
window.onload = () => {
    loadDataWithCache();
    updateCartIcon();
    updateFavIcon(); // YENİ EKLENDİ
};

async function loadDataWithCache() {
    showSpinner("Veriler Hazırlanıyor...");
    const cachedData = localStorage.getItem("eesnaf_DB");
    const cacheTimestamp = localStorage.getItem("eesnaf_time");
    const now = Date.now();
    if (cachedData && cacheTimestamp && (now - cacheTimestamp < 43200000)) {
        DB = JSON.parse(cachedData);
        populateFilters(); filterRenderedProducts(); hideSpinner(); return;
    }
    fetchFromFirebase();
}

window.forceRefreshData = function () {
    localStorage.removeItem("eesnaf_DB");
    localStorage.removeItem("eesnaf_time");
    fetchFromFirebase();
}

async function fetchFromFirebase() {
    showSpinner("Buluttan Güncelleniyor...");
    try {
        const [catSnap, brandSnap, groupSnap, productSnap] = await Promise.all([
            db.collection("Category").where("Deleted", "==", false).get(),
            db.collection("Brand").where("Deleted", "==", false).get(),
            db.collection("ProductGroup").where("Deleted", "==", false).get(),
            db.collection("PublishItem").get()
        ]);
        DB.Categories = catSnap.docs.map(doc => doc.data());
        DB.Brands = brandSnap.docs.map(doc => doc.data());
        DB.ProductGroups = groupSnap.docs.map(doc => doc.data());
        DB.Products = productSnap.docs.map(doc => doc.data());

        localStorage.setItem("eesnaf_DB", JSON.stringify(DB));
        localStorage.setItem("eesnaf_time", Date.now().toString());

        populateFilters(); filterRenderedProducts(); hideSpinner();
    } catch (error) { console.error(error); hideSpinner(); showPage('500'); }
}

function populateFilters() {
    const catSelect = document.getElementById('filter-category');
    const brandSelect = document.getElementById('filter-brand');
    const groupSelect = document.getElementById('filter-productGroup');

    catSelect.innerHTML = '<option value="">Tümü</option>'; brandSelect.innerHTML = '<option value="">Tümü</option>'; groupSelect.innerHTML = '<option value="">Tümü</option>';
    DB.Categories.forEach(c => { catSelect.innerHTML += `<option value="${c.Id}">${c.Name}</option>`; });
    DB.Brands.forEach(b => { brandSelect.innerHTML += `<option value="${b.Id}">${b.Name}</option>`; });
    DB.ProductGroups.forEach(g => { groupSelect.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; });
}

window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
}

window.changeGrid = function (col) {
    document.querySelectorAll('.btn-grid').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('products-grid').className = `products-grid grid-${col}`;
};

// ==========================================
// 5. BARKOD OKUYUCU FONKSİYONLARI
// ==========================================
window.openBarcodeScanner = function () {
    document.getElementById('barcode-modal').style.display = 'flex';
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText, decodedResult) {
    document.getElementById('searchInput').value = decodedText;
    filterRenderedProducts();
    closeBarcodeScanner();
}

function onScanFailure(error) { /* Sessizce hataları yoksay */ }

window.closeBarcodeScanner = function () {
    if (html5QrcodeScanner) { html5QrcodeScanner.clear(); }
    document.getElementById('barcode-modal').style.display = 'none';
}

// ==========================================
// 6. ÜRÜN FİLTRELEME VE LİSTELEME
// ==========================================
window.filterRenderedProducts = function () {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    const q = document.getElementById('searchInput').value.toLowerCase();
    const isDiscounted = document.getElementById('filter-discounted').checked;
    const selCat = document.getElementById('filter-category').value;
    const selBrand = document.getElementById('filter-brand').value;
    const selGroup = document.getElementById('filter-productGroup').value;

    const filteredProducts = DB.Products.filter(p => {
        // Arama kısmında hem Name (İsim) hem de BarCode (Barkod) sütunlarına bakıyoruz
        const nameMatch = p.Name && p.Name.toLowerCase().includes(q);
        const barcodeMatch = p.BarCode && p.BarCode.toLowerCase().includes(q);

        if (q && !nameMatch && !barcodeMatch) return false;
        if (isDiscounted && !(Number(p.DiscountRate) > 0)) return false;
        if (selCat && p.CategoryId !== selCat) return false;
        if (selBrand && p.BrandId !== selBrand) return false;
        if (selGroup && p.ProductGroupId !== selGroup) return false;
        return true;
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

        // Ön Yüzdeki Kartlara Miktar (NumberBox) eklendi
        grid.innerHTML += `
            <div class="product-card" onclick="openDetail('${p.Id}')">
            <button class="card-fav-btn ${favorites.includes(p.Id) ? 'active' : ''}" onclick="toggleFavoriteInline('${p.Id}', event)" title="Favorilere Ekle">
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
                        <button class="btn-add" onclick="addToCart('${p.Id}', document.getElementById('qty-${p.Id}').value)">Sepete Ekle</button>
                    </div>
                </div>
            </div>
        `;
    });
};

// ==========================================
// 7. SEPET İŞLEMLERİ VE SİPARİŞ KONTROLÜ
// ==========================================
window.openDetail = function (id) {
    try {
        const p = DB.Products.find(x => x.Id === id);
        if (!p) return;

        // 1. Veritabanı (DB) Güvenliği: Tablo yoksa bile sistem çökmez!
        const brandObj = (DB.Brands || []).find(b => b.Id === p.BrandId);
        const groupObj = (DB.ProductGroups || []).find(g => g.Id === p.ProductGroupId);
        const brandName = brandObj ? brandObj.Name : 'Belirtilmemiş';
        const groupName = groupObj ? groupObj.Name : 'Belirtilmemiş';

        // 2. Fiyat Hesaplamaları
        const salePrice = Number(p.SalePrice) || 0;
        const cashPrice = salePrice * 0.99;

        // 3. HTML Güvenliği: "Eleman yoksa pas geç" yardımcıları (null hatasını engeller)
        const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

        const imgEl = document.getElementById('det-img');
        if (imgEl) imgEl.src = p.PicturePath && p.PicturePath !== "" ? p.PicturePath : 'img/logo-192.png';

        setText('det-name', p.Name);
        setHtml('det-brand', `Marka: <strong>${brandName}</strong>`);
        setHtml('det-group', `Ürün Grubu: <strong>${groupName}</strong>`);
        setText('det-old-price', Number(p.DiscountRate) > 0 ? formatTR(p.Price) + " ₺" : "");
        setText('det-price', formatTR(salePrice) + " ₺");
        setHtml('det-cash-credit', `<strong>Birim Fiyat:</strong><br>(Kredi Kartı: ${formatTR(salePrice)} ₺ / Nakit: <span>${formatTR(cashPrice)} ₺</span>)`);
        setText('det-desc', p.Description || 'Bu ürün için detaylı açıklama girilmemiştir.');
        setText('det-unit', typeof BIRIM !== 'undefined' ? (BIRIM[p.UnitId] || 'Adet') : 'Adet');

        const qtyEl = document.getElementById('det-qty');
        if (qtyEl) qtyEl.value = 1;

        const addBtn = document.getElementById('det-add-btn');
        if (addBtn) {
            addBtn.onclick = () => {
                addToCart(p.Id, qtyEl ? qtyEl.value : 1);
                showPage('cart');
            };
        }

        // 4. Favoriler İkonu Kontrolü (Metinsiz, Sadece İkon)
        if (typeof favorites === 'undefined') window.favorites = [];
        
        const favBtn = document.getElementById('det-fav-btn');
        if(favBtn) {
            // Sayfa açıldığında favorideyse kırmızı (active) yap
            if (favorites.includes(p.Id)) {
                favBtn.classList.add('active');
            } else {
                favBtn.classList.remove('active');
            }
            
            // Tıklama Olayı (Boş <-> Dolu geçişi)
            favBtn.onclick = function() {
                if (favorites.includes(p.Id)) {
                    favorites = favorites.filter(fid => fid !== p.Id);
                    this.classList.remove('active');
                } else {
                    favorites.push(p.Id);
                    this.classList.add('active');
                }
                localStorage.setItem("eesnaf_favorites", JSON.stringify(favorites));
                if (typeof updateFavIcon === 'function') updateFavIcon();
            };
        }
        showPage('detail');

    } catch (error) {
        console.error("Detay sayfası açılırken kritik hata yakalandı:", error);
    }
};

window.addToCart = function (id, qty = 1) {
    const p = DB.Products.find(x => x.Id === id);
    if (!p) return;
    const existing = cart.find(x => x.Id === id);
    if (existing) existing.qty += Number(qty); else cart.push({ ...p, qty: Number(qty) });

    updateCartIcon();
    saveCartToStorage(); // Hafızayı güncelle
    showToast();
};

// YENİ BİLDİRİM FONKSİYONU
window.showToast = function () {
    const toast = document.getElementById('toast');
    toast.classList.add('show');

    // 2.5 saniye sonra bildirimi ekrandan kaldır
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
};

// SEPET SAYACI GÜNCELLEMESİ (Toplam Miktar Yerine Kalem Sayısı)
window.updateCartIcon = function () {
    // Önceden cart.reduce ile miktarları topluyordu.
    // Şimdi sadece dizinin uzunluğunu (kalem sayısını) alıyor.
    document.getElementById('cart-count').innerText = cart.length;
};
window.updateCartUI = function () {
    const tbody = document.getElementById('cart-items');
    tbody.innerHTML = '';
    let subTotal = 0; let discountTotal = 0; let grandTotal = 0;

    cart.forEach((item, index) => {
        const itemNormalTotal = item.Price * item.qty;
        const itemSaleTotal = item.SalePrice * item.qty;
        const itemDiscount = itemNormalTotal - itemSaleTotal;
        subTotal += itemNormalTotal; discountTotal += itemDiscount; grandTotal += itemSaleTotal;
        let unitName = BIRIM[item.UnitId] || 'Adet';

        tbody.innerHTML += `
            <tr>
                <td style="font-weight:bold; color:var(--gold);">${item.Name}</td>
                <td><span style="text-decoration:line-through; font-size:0.8rem; color:#ff6b6b;">${item.DiscountRate > 0 ? formatTR(item.Price) : ''}</span><br>${formatTR(item.SalePrice)}₺ <span style="font-size:0.8rem; color:var(--text-muted)">/ ${unitName}</span></td>
                <td>
                    <div class="cart-qty-wrapper">
                        <input type="number" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)">
                        <span style="font-size:0.9rem;">${unitName}</span>
                    </div>
                </td>
                <td style="color:#ff6b6b;">${itemDiscount > 0 ? '-' + formatTR(itemDiscount) + '₺' : '-'}</td>
                <td style="font-weight:bold;">${formatTR(itemSaleTotal)}₺</td>
                <td style="text-align: center;">
                    <button class="btn-trash" onclick="removeFromCart(${index})" title="Sepetten Çıkar">
                        <svg viewBox="0 0 448 512" width="18" height="18" fill="currentColor">
                            <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-30.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    });

    // ... Sepet döngüsü (cart.forEach) bittikten sonraki hesaplama kısmı:
    
    // ... Sepet döngüsü (cart.forEach) bittikten sonraki hesaplama kısmı:
    
    let uiGrandTotal = 0;
    cart.forEach(item => { uiGrandTotal += (item.SalePrice * item.qty); });
    
    // Kargo kuralı: 1000 TL altındaki her senaryoda (sepet boşken bile) 50 TL'dir.
    let uiShippingFee = 0;
    if (uiGrandTotal < 1000) {
        uiShippingFee = 50;
    }
    
    // Akıllı Tutar: Sepet boşsa ödenecek tutar 0 kalır, ürün varsa kargo eklenir.
    let finalPayable = 0;
    if (uiGrandTotal > 0) {
        finalPayable = uiGrandTotal + uiShippingFee;
    }
    
    // Kargo metnini ekrana basma
    const shippingEl = document.getElementById('ui-shipping-fee');
    if(shippingEl) {
        shippingEl.innerText = uiShippingFee > 0 ? "50,00 ₺" : "Ücretsiz";
        shippingEl.style.color = uiShippingFee > 0 ? "inherit" : "#25D366"; // Ücretsizse yeşil yap
    }
    
    // Toplam tutarı ekrana basma
    const totalEl = document.getElementById('ui-grand-total');
    if(totalEl) {
        totalEl.innerText = formatTR(finalPayable) + " ₺";
    }

    updateCartIcon();
};

window.updateQty = function (index, val) {
    if (val < 1) val = 1;
    cart[index].qty = Number(val);
    updateCartUI();
    saveCartToStorage(); // Hafızayı güncelle
};

window.removeFromCart = function (index) {
    cart.splice(index, 1);
    updateCartUI();
    saveCartToStorage(); // Hafızayı güncelle
};

window.completeOrder = async function () {
    if (cart.length === 0) return alert("Sepetiniz boş!");

    const name = document.getElementById('cus-name').value.trim();
    const company = document.getElementById('cus-company').value.trim();
    const city = document.getElementById('cus-city').value;
    const district = document.getElementById('cus-district').value;
    const neighborhood = document.getElementById('cus-neighborhood').value.trim();
    const street = document.getElementById('cus-street').value.trim();
    const buildingNo = document.getElementById('cus-building-no').value.trim();
    const doorNo = document.getElementById('cus-door-no').value.trim();
    const addressDetail = document.getElementById('cus-address-detail').value.trim();
    
    if (!name || !company || !city || !district || !neighborhood || !street || !buildingNo || !doorNo) {
        return alert("⚠️ Lütfen adres formundaki tüm zorunlu (*) alanları doldurunuz!");
    }
    
    let formattedAddress = `${neighborhood} Mah. ${street} Sk. No:${buildingNo} Daire:${doorNo} ${district} / ${city}`;
    if (addressDetail) formattedAddress += ` (${addressDetail})`;

    showSpinner("Sipariş WhatsApp'a Aktarılıyor...");

    let subTotal = 0; let discountTotal = 0; let grandTotal = 0;
    
    let tableRowsHTML = "";
    cart.forEach(item => {
        const iN = item.Price * item.qty; const iS = item.SalePrice * item.qty; const iD = iN - iS;
        subTotal += iN; discountTotal += iD; grandTotal += iS;
        let unitName = BIRIM[item.UnitId] || 'Adet';
        
        tableRowsHTML += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee; color: #000; text-align: left;">${item.Name}</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; color: #000;">${formatTR(item.Price)} ₺</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; color: #000;">${item.qty} ${unitName}</td>
                <td style="padding: 12px; text-align: center; color: red; border-bottom: 1px solid #eee;">${iD > 0 ? "-" + formatTR(iD) + " ₺" : "-"}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; border-bottom: 1px solid #eee; color: #000;">${formatTR(iS)} ₺</td>
            </tr>
        `;
    });

    let shippingFee = 0;
    if (grandTotal > 0 && grandTotal < 1000) shippingFee = 50;
    let finalTotalToPay = grandTotal + shippingFee;

    // Dün beğendiğin, o sağ alt detayları kusursuz olan kurumsal fatura şablonu
    const invoiceHTML = `
        <div id="pdf-invoice-template" style="padding: 40px; font-family: Arial, sans-serif; color: #000; width: 800px; background: #fff; box-sizing: border-box; text-align: left;">
            
            <div style="background-color: #044F40; padding: 20px; text-align: left; border-radius: 6px;">
                <h1 style="color: #D4AF37; margin: 0; font-size: 26px; font-weight: bold;">E-ESNAF SİPARİŞ FORMU</h1>
            </div>
            
            <div style="margin-top: 25px; font-size: 14px; line-height: 1.8; color: #000;">
                <strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')} <br>
                <strong>Müşteri:</strong> ${name} <br>
                <strong>İşletme:</strong> ${company} <br>
                <strong>Adres:</strong> ${formattedAddress}
            </div>
            
            <table style="width: 100%; margin-top: 30px; border-collapse: collapse; font-size: 13px; color: #000;">
                <thead>
                    <tr style="background-color: #044F40; color: #D4AF37; font-weight: bold;">
                        <th style="padding: 12px; text-align: left;">Ürün Adı</th>
                        <th style="padding: 12px; text-align: center;">Liste Fiyatı</th>
                        <th style="padding: 12px; text-align: center;">Miktar</th>
                        <th style="padding: 12px; text-align: center;">İndirim</th>
                        <th style="padding: 12px; text-align: right;">Net Tutar</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHTML}
                </tbody>
            </table>
            
            <table style="width: 100%; margin-top: 30px; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%;"></td>
                    <td style="width: 50%;">
                        <table style="width: 100%; font-size: 14px; line-height: 2; color: #000;">
                            <tr>
                                <td style="text-align: left; padding: 2px 0;">Ara Toplam:</td>
                                <td style="text-align: right; padding: 2px 0;"><strong>${formatTR(subTotal)} ₺</strong></td>
                            </tr>
                            <tr>
                                <td style="text-align: left; padding: 2px 0; color: red;">Kazanılan İndirim:</td>
                                <td style="text-align: right; padding: 2px 0; color: red;"><strong>-${formatTR(discountTotal)} ₺</strong></td>
                            </tr>
                            <tr>
                                <td style="text-align: left; padding: 2px 0;">Kargo Ücreti:</td>
                                <td style="text-align: right; padding: 2px 0; ${shippingFee > 0 ? 'color:#000;' : 'color:#25D366;'}"><strong>${shippingFee > 0 ? formatTR(shippingFee) + ' ₺' : 'Ücretsiz'}</strong></td>
                            </tr>
                            <tr style="border-top: 2px solid #044F40;">
                                <td style="text-align: left; padding-top: 12px; font-size: 16px; color: #044F40; font-weight: bold;">ÖDENECEK TUTAR:</td>
                                <td style="text-align: right; padding-top: 12px; font-size: 22px; color: #044F40; font-weight: bold;">${formatTR(finalTotalToPay)} ₺</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            
        </div>
    `;

    // Geçici DOM elemanı oluşturma ve tam sıfır noktasına bağlama
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = invoiceHTML;
    tempDiv.style.position = 'absolute';
    tempDiv.style.top = '0';
    tempDiv.style.left = '0';
    tempDiv.style.width = '800px';
    tempDiv.style.zIndex = '-999999'; // Kullanıcı asla hissetmeyecek
    tempDiv.style.margin = '0';
    tempDiv.style.padding = '0';
    tempDiv.style.boxSizing = 'border-box';
    tempDiv.style.backgroundColor = '#ffffff';
    document.body.appendChild(tempDiv);

    // SOLA KAYMAYI VE KIRPILMAYI SIFIRLAYAN SİHİRLİ AYARLAR
    const opt = {
        margin:       0,
        filename:     `Siparis_${company.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/g, '_')}_${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            scrollX: 0, 
            scrollY: 0,
            windowWidth: 800,
            width: 800,
            x: 0, // KRİTİK AYAR: Canvas çizimini faturanın mutlak sol sıfır noktasından başlatır!
            y: 0  // KRİTİK AYAR: Canvas çizimini faturanın mutlak üst sıfır noktasından başlatır!
        }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Tam isabet hedefleme
    html2pdf().set(opt).from(tempDiv.firstElementChild).outputPdf('blob').then(async (pdfBlob) => {
        const fileName = opt.filename;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        document.body.removeChild(tempDiv);
        cart = [];
        saveCartToStorage();
        
        const inputsToClear = ['cus-name', 'cus-company', 'cus-neighborhood', 'cus-street', 'cus-building-no', 'cus-door-no', 'cus-address-detail'];
        inputsToClear.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        
        updateCartIcon(); updateCartUI();

        const waText = `*YENİ SİPARİŞ!* 👑\nİşletme: ${company}\nTutar: ${formatTR(finalTotalToPay)}₺ ${shippingFee > 0 ? '(Kargo Dahil)' : ''}`;

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try { 
                await navigator.share({ files: [file], title: 'Sipariş Faturası', text: waText }); 
                hideSpinner(); showPage('home'); 
            }
            catch (error) { hideSpinner(); showPage('home'); }
        } else {
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(pdfBlob);
            link.download = fileName;
            link.click();
            
            const phone = "905069012520";
            const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waText + '\n\nNot: Fatura PDF olarak inmiştir, lütfen sohbete manuel ekleyiniz.')}`;
            window.open(waLink, '_blank');
            hideSpinner(); showPage('home');
        }
    }).catch(err => {
        console.error("PDF oluşturulurken hata:", err);
        alert("Fatura oluşturulurken bir hata oluştu.");
        if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
        hideSpinner();
    });
};

function saveCartToStorage() {
    localStorage.setItem("eesnaf_cart", JSON.stringify(cart));
}

window.showFavoritesPage = function() {
    showPage('favorites');
    const grid = document.getElementById('favorites-grid');
    const emptyMsg = document.getElementById('empty-fav-msg');
    grid.innerHTML = '';

    if (favorites.length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        
        const favProducts = DB.Products.filter(p => favorites.includes(p.Id));

        favProducts.forEach(p => {
            // Tamamen favorilere özel, kaymayan yeni HTML bloklarımız
            grid.innerHTML += `
                <div class="fav-list-card">
                    
                    <div class="fav-img-wrapper" onclick="openDetail('${p.Id}')">
                        <img src="${p.PicturePath || 'img/logo-192.png'}" onerror="this.onerror=null; this.src='img/logo-192.png'">
                    </div>

                    <div class="fav-details" onclick="openDetail('${p.Id}')">
                        <div class="fav-title">${p.Name}</div>
                        <div class="fav-price">${formatTR(p.SalePrice)} ₺</div>
                    </div>

                    <button class="fav-remove-btn" onclick="removeFromFavorites('${p.Id}', event)" title="Favorilerden Çıkar">
                        <svg viewBox="0 0 512 512" width="24" height="24" fill="currentColor">
                            <path d="M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z"/>
                        </svg>
                    </button>
                    
                </div>
            `;
        });
    }
};

// Ürünü favorilerden silen ve tıklamanın detaya gitmesini engelleyen fonksiyon
window.removeFromFavorites = function(id, event) {
    if(event) event.stopPropagation(); // Kalbe tıklanınca yanlışlıkla ürün detayına gitmeyi engeller
    
    favorites = favorites.filter(fid => fid !== id);
    localStorage.setItem("eesnaf_favorites", JSON.stringify(favorites));
    
    if (typeof updateFavIcon === 'function') updateFavIcon();
    showFavoritesPage(); // Sildiğimiz an ürün ekrandan kaybolsun diye sayfayı yeniler
};

window.toggleFavoriteInline = function(id, event) {
    // Tıklamanın aşağıdaki resme veya karta geçmesini (detay sayfasının açılmasını) engeller
    if (event) event.stopPropagation(); 

    const btn = event.currentTarget; // Tıklanan kalp butonunu seç
    
    // Favori kontrolü yap ve duruma göre sınıfı değiştir
    if (favorites.includes(id)) {
        // Zaten favorilerdeyse çıkar
        favorites = favorites.filter(fid => fid !== id);
        btn.classList.remove('active');
    } else {
        // Favorilerde yoksa ekle
        favorites.push(id);
        btn.classList.add('active');
    }
    
    // Değişikliği anında hafızaya kaydet ve sağ üstteki sayacı güncelle
    localStorage.setItem("eesnaf_favorites", JSON.stringify(favorites));
    if (typeof updateFavIcon === 'function') updateFavIcon();
};