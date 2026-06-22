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
    document.getElementById('install-banner').style.display = 'flex';
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
    if (pageId === 'cart' || pageId === 'detail') {
        if (searchArea) searchArea.style.display = 'none';
        filterBtns.forEach(btn => btn.style.display = 'none');

        if (pageId === 'cart') {
            updateCartUI();
        }
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
    const p = DB.Products.find(x => x.Id === id);
    if (!p) return;
    document.getElementById('det-img').src = p.PicturePath && p.PicturePath !== "" ? p.PicturePath : 'img/logo-192.png';
    document.getElementById('det-name').innerText = p.Name;
    document.getElementById('det-desc').innerText = p.Description || '';
    document.getElementById('det-old-price').innerText = Number(p.DiscountRate) > 0 ? formatTR(p.Price) + "₺" : "";
    document.getElementById('det-price').innerText = formatTR(p.SalePrice) + "₺";
    document.getElementById('det-unit').innerText = ' / ' + BIRIM[p.UnitId] || 'Adet';
    document.getElementById('det-qty').value = 1;
    document.getElementById('det-add-btn').onclick = () => { addToCart(p.Id, document.getElementById('det-qty').value); showPage('cart'); };
    showPage('detail');
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

    document.getElementById('summary-subtotal').innerText = formatTR(subTotal) + "₺";
    document.getElementById('summary-discount').innerText = "-" + formatTR(discountTotal) + "₺";
    document.getElementById('summary-total').innerText = formatTR(grandTotal) + "₺";
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

    // MİNİMUM 5000₺ KONTROLÜ
    const grandTotalCheck = cart.reduce((sum, item) => sum + (item.SalePrice * item.qty), 0);
    if (grandTotalCheck < 5000) {
        return alert("⚠️ Minimum sipariş tutarı 5000₺'dir.\nLütfen alışverişe devam ederek sepet tutarınızı yükseltiniz.");
    }

    const name = document.getElementById('cus-name').value.trim();
    const company = document.getElementById('cus-company').value.trim();
    const address = document.getElementById('cus-address').value.trim();

    if (!name || !company || !address) return alert("Lütfen formdaki tüm alanları doldurunuz!");

    showSpinner("Sipariş Hazırlanıyor...");

    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFillColor(4, 79, 64); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(212, 175, 55); doc.setFontSize(24); doc.text("E-ESNAF SIPARIS FORMU", 14, 25);
    doc.setTextColor(0, 0, 0); doc.setFontSize(11);
    doc.text(`Tarih: ${new Date().toLocaleString('tr-TR')}`, 14, 50); doc.text(`Musteri: ${name}`, 14, 58); doc.text(`Isletme: ${company}`, 14, 66); doc.text(`Adres: ${address}`, 14, 74);

    let subTotal = 0; let discountTotal = 0; let grandTotal = 0;
    const tableData = cart.map(item => {
        const iN = item.Price * item.qty; const iS = item.SalePrice * item.qty; const iD = iN - iS;
        subTotal += iN; discountTotal += iD; grandTotal += iS;
        let unitName = BIRIM[item.UnitId] || 'Adet';
        return [item.Name, formatTR(item.Price) + " TL", item.qty.toString() + ' ' + unitName, iD > 0 ? "-" + formatTR(iD) + " TL" : "-", formatTR(iS) + " TL"];
    });

    doc.autoTable({ startY: 85, head: [['Urun Adi', 'Liste Fiyat', 'Miktar', 'Indirim', 'Net Tutar']], body: tableData, theme: 'grid', headStyles: { fillColor: [4, 79, 64], textColor: [212, 175, 55] } });
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12); doc.text(`Ara Toplam: ${formatTR(subTotal)} TL`, 130, finalY);
    doc.setTextColor(255, 0, 0); doc.text(`Kazanilan Indirim: -${formatTR(discountTotal)} TL`, 130, finalY + 8);
    doc.setTextColor(4, 79, 64); doc.setFontSize(16); doc.text(`ODENECEK TUTAR: ${formatTR(grandTotal)} TL`, 130, finalY + 20);

    const fileName = `Siparis_${company.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    cart = [];
    saveCartToStorage(); // Sipariş bittiği için hafızadaki sepeti de temizle
    document.getElementById('cus-name').value = '';
    document.getElementById('cus-company').value = '';
    document.getElementById('cus-address').value = '';
    updateCartIcon(); updateCartUI();

    const waText = `*YENİ SİPARİŞ!* 👑\nİşletme: ${company}\nTutar: ${formatTR(grandTotal)}₺`;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Sipariş', text: waText }); hideSpinner(); showPage('home'); }
        catch (error) { hideSpinner(); showPage('home'); }
    } else {
        doc.save(fileName);
        const phone = "905069012520";
        const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waText + '\n\nNot: Fatura PDF olarak inmiştir, lütfen sohbete manuel ekleyiniz.')}`;
        window.open(waLink, '_blank');
        hideSpinner(); showPage('home');
    }
};

function saveCartToStorage() {
    localStorage.setItem("eesnaf_cart", JSON.stringify(cart));
}