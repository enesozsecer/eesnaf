// ==========================================
// PWA (PROGRESSIVE WEB APP) & SERVICE WORKER
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

// "Uygulamayı Yükle" tetikleyicisi
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-banner').style.display = 'flex';
});

function installApp() {
    if(deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Kullanıcı PWA kurulumunu kabul etti');
            }
            deferredPrompt = null;
            document.getElementById('install-banner').style.display = 'none';
        });
    }
}

function closeInstallBanner() {
    document.getElementById('install-banner').style.display = 'none';
}

// ==========================================
// 1. FIREBASE BAĞLANTISI VE AYARLARI
// ==========================================
const firebaseConfig = {
    apiKey: "SENIN_API_KEY",
    authDomain: "SENIN_PROJE_ID.firebaseapp.com",
    projectId: "eesnaf-34bf2", 
    storageBucket: "SENIN_PROJE_ID.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// GLOBAL DEĞİŞKENLER
// ==========================================
let cart = [];
let loadedProducts = []; // Ekranda görünen ürünlerin bellekteki hali
let lastVisibleDoc = null; // Sayfalama (Pagination) için son döküman

window.onload = async () => {
    await loadInitialDataAndFilters(); 
};

function formatTR(num) {
    return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// SAYFA GEÇİŞ SİSTEMİ
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById('page-' + pageId);
    if(targetPage) targetPage.classList.add('active');
    
    if(pageId === 'cart') {
        updateCartUI();
    }
}

// ==========================================
// FİLTRELERİN VERİTABANINDAN DOLDURULMASI
// ==========================================
async function loadInitialDataAndFilters() {
    try {
        const catSnap = await db.collection("Category").where("Deleted", "==", false).get();
        const brandSnap = await db.collection("Brand").where("Deleted", "==", false).get();
        const groupSnap = await db.collection("ProductGroup").where("Deleted", "==", false).get();

        const catSelect = document.getElementById('filter-category');
        catSnap.forEach(doc => {
            const data = doc.data();
            catSelect.innerHTML += `<option value="${data.Id}">${data.Name}</option>`;
        });

        const brandSelect = document.getElementById('filter-brand');
        brandSnap.forEach(doc => {
            const data = doc.data();
            brandSelect.innerHTML += `<option value="${data.Id}">${data.Name}</option>`;
        });

        const groupSelect = document.getElementById('filter-productGroup');
        groupSnap.forEach(doc => {
            const data = doc.data();
            groupSelect.innerHTML += `<option value="${data.Id}">${data.Name}</option>`;
        });

        // Filtreler yüklendikten sonra ilk 20 ürünü çek
        fetchProducts(false);

    } catch (error) {
        console.error("Filtre verileri çekilirken hata:", error);
        showPage('500'); // Veritabanı bağlantı hatası varsa 500 sayfasına at
    }
}

// ==========================================
// FIREBASE'DEN SAYFALAMALI (20'şer) ÜRÜN ÇEKME
// ==========================================
async function fetchProducts(isLoadMore = false) {
    try {
        let query = db.collection("PublishItem");

        // Seçili Filtreleri Al
        const selectedCat = document.getElementById('filter-category').value;
        const selectedBrand = document.getElementById('filter-brand').value;
        const selectedGroup = document.getElementById('filter-productGroup').value;

        // Filtreleri Firebase Sorgusuna Ekle
        if (selectedCat) query = query.where("CategoryId", "==", selectedCat);
        if (selectedBrand) query = query.where("BrandId", "==", selectedBrand);
        if (selectedGroup) query = query.where("ProductGroupId", "==", selectedGroup);

        // Her seferinde 20 veri çek
        query = query.limit(20);

        // Eğer 'Daha Fazla Yükle'ye basıldıysa ve son döküman varsa, oradan devam et
        if (isLoadMore && lastVisibleDoc) {
            query = query.startAfter(lastVisibleDoc);
        } else if (!isLoadMore) {
            // Eğer yeni bir filtre seçildiyse sıfırla
            lastVisibleDoc = null;
            loadedProducts = [];
            document.getElementById('products-grid').innerHTML = '';
            document.getElementById('searchInput').value = ''; // Yeni aramada inputu sıfırla
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            document.getElementById('btn-load-more').style.display = 'none';
            if (!isLoadMore) {
                document.getElementById('products-grid').innerHTML = '<p style="color:var(--gold);">Bu filtrelere uygun ürün bulunamadı.</p>';
            }
            return;
        }

        // Son görünen dökümanı güncelle (bir sonraki sayfa için)
        lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

        // Gelen verileri belleğe kaydet
        snapshot.forEach(doc => {
            loadedProducts.push(doc.data());
        });

        // 20 veri geldiyse butonu göster, daha az geldiyse veriler bitmiştir butonu gizle
        if(snapshot.docs.length === 20) {
            document.getElementById('btn-load-more').style.display = 'block';
        } else {
            document.getElementById('btn-load-more').style.display = 'none';
        }

        // Ekrana Çiz
        renderProductsToGrid(loadedProducts);

    } catch (error) {
        console.error("Ürünler çekilirken hata:", error);
        showPage('500'); // Hata durumunda direkt 500 sayfası
    }
}

// ==========================================
// YEREL ARAMA (Input ile)
// ==========================================
function searchLocalProducts() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    if(!q) {
        renderProductsToGrid(loadedProducts);
        return;
    }
    // Ekrana yüklenmiş (loadedProducts) olanlar içinde arama yapar
    const filtered = loadedProducts.filter(p => p.Name && p.Name.toLowerCase().includes(q));
    renderProductsToGrid(filtered);
    
    // Arama yapılırken 'Daha Fazla' butonunu gizle ki kafalar karışmasın
    document.getElementById('btn-load-more').style.display = 'none';
}

// ==========================================
// ÜRÜNLERİ EKRANA (HTML) BASMA
// ==========================================
function renderProductsToGrid(productArray) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    productArray.forEach(p => {
        let discountHtml = p.DiscountRate > 0 ? `<div class="discount-badge">%${p.DiscountRate} İndirim</div>` : '';
        let oldPriceHtml = p.DiscountRate > 0 ? `<span class="old-price">${formatTR(p.Price)} ₺</span>` : '<span class="old-price" style="visibility:hidden;">-</span>';
        
        // Görsel yoksa veya hata verirse fallback olarak logo-192.png kullan
        let imgSrc = p.PicturePath && p.PicturePath !== "" ? p.PicturePath : 'img/logo-192.png';

        grid.innerHTML += `
            <div class="product-card" onclick="openDetail('${p.Id}')">
                ${discountHtml}
                <img src="${imgSrc}" class="product-img" onerror="this.src='img/logo-192.png'">
                <h3 class="product-title">${p.Name}</h3>
                <p class="product-desc">${p.Description || ''}</p>
                <div class="price-area">
                    ${oldPriceHtml}
                    <span class="new-price">${formatTR(p.SalePrice)} ₺</span>
                </div>
                <button class="btn-add" onclick="event.stopPropagation(); addToCart('${p.Id}', 1)">Sepete Ekle</button>
            </div>
        `;
    });
}

// ==========================================
// DETAY VE SEPET İŞLEMLERİ (REFERENCE ERROR ÇÖZÜMÜ)
// Bu fonksiyonlar global (window seviyesinde) olmalıdır.
// ==========================================

window.openDetail = function(id) {
    const p = loadedProducts.find(x => x.Id === id);
    if(!p) return;

    let imgSrc = p.PicturePath && p.PicturePath !== "" ? p.PicturePath : 'img/logo-192.png';
    document.getElementById('det-img').src = imgSrc;
    
    document.getElementById('det-name').innerText = p.Name;
    document.getElementById('det-desc').innerText = p.Description || '';
    document.getElementById('det-old-price').innerText = p.DiscountRate > 0 ? formatTR(p.Price) + " ₺" : "";
    document.getElementById('det-price').innerText = formatTR(p.SalePrice) + " ₺";
    
    document.getElementById('det-qty').value = 1;
    document.getElementById('det-add-btn').onclick = () => {
        addToCart(p.Id, document.getElementById('det-qty').value);
        showPage('cart'); 
    };
    
    showPage('detail');
};

window.addToCart = function(id, qty = 1) {
    const p = loadedProducts.find(x => x.Id === id);
    if (!p) return;

    const existing = cart.find(x => x.Id === id);
    if (existing) {
        existing.qty += Number(qty);
    } else {
        cart.push({ ...p, qty: Number(qty) });
    }
    
    updateCartIcon();
};

window.updateCartIcon = function() {
    document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.qty, 0);
};

window.updateCartUI = function() {
    const tbody = document.getElementById('cart-items');
    tbody.innerHTML = '';
    
    let subTotal = 0; 
    let discountTotal = 0; 
    let grandTotal = 0; 

    cart.forEach((item, index) => {
        const itemNormalTotal = item.Price * item.qty;
        const itemSaleTotal = item.SalePrice * item.qty;
        const itemDiscount = itemNormalTotal - itemSaleTotal;

        subTotal += itemNormalTotal;
        discountTotal += itemDiscount;
        grandTotal += itemSaleTotal;

        tbody.innerHTML += `
            <tr>
                <td style="font-weight:bold; color:var(--gold);">${item.Name}</td>
                <td>
                    <span style="text-decoration:line-through; font-size:0.8rem; color:#ff6b6b;">${item.DiscountRate > 0 ? formatTR(item.Price) : ''}</span><br>
                    ${formatTR(item.SalePrice)} ₺
                </td>
                <td><input type="number" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)"></td>
                <td style="color:#ff6b6b;">${itemDiscount > 0 ? '-' + formatTR(itemDiscount) + ' ₺' : '-'}</td>
                <td style="font-weight:bold;">${formatTR(itemSaleTotal)} ₺</td>
                <td><button class="btn-remove" onclick="removeFromCart(${index})">✕</button></td>
            </tr>
        `;
    });

    document.getElementById('summary-subtotal').innerText = formatTR(subTotal) + " ₺";
    document.getElementById('summary-discount').innerText = "-" + formatTR(discountTotal) + " ₺";
    document.getElementById('summary-total').innerText = formatTR(grandTotal) + " ₺";
    
    updateCartIcon();
};

window.updateQty = function(index, val) {
    if(val < 1) val = 1;
    cart[index].qty = Number(val);
    updateCartUI();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

// ==========================================
// WHATSAPP SİPARİŞ TAMAMLAMA (PDF OLUŞTURMA)
// ==========================================
window.completeOrder = function() {
    if (cart.length === 0) return alert("Sepetiniz boş!");
    
    const name = document.getElementById('cus-name').value.trim();
    const company = document.getElementById('cus-company').value.trim();
    const address = document.getElementById('cus-address').value.trim();
    
    if (!name || !company || !address) {
        return alert("Lütfen Ad Soyad, İşletme Adı ve Teslimat Adresi alanlarının hepsini doldurunuz!");
    }

    // PDF OLUŞTURMA
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFillColor(4, 79, 64);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(24);
    doc.text("E-ESNAF SIPARIS FORMU", 14, 25);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Tarih: ${new Date().toLocaleString('tr-TR')}`, 14, 50);
    doc.text(`Musteri: ${name}`, 14, 58);
    doc.text(`Isletme: ${company}`, 14, 66);
    doc.text(`Adres: ${address}`, 14, 74);

    let subTotal = 0; let discountTotal = 0; let grandTotal = 0;
    const tableData = cart.map(item => {
        const itemNormalTotal = item.Price * item.qty;
        const itemSaleTotal = item.SalePrice * item.qty;
        const itemDiscount = itemNormalTotal - itemSaleTotal;
        
        subTotal += itemNormalTotal; discountTotal += itemDiscount; grandTotal += itemSaleTotal;

        return [
            item.Name,
            formatTR(item.Price) + " TL",
            item.qty.toString(),
            itemDiscount > 0 ? "-" + formatTR(itemDiscount) + " TL" : "-",
            formatTR(itemSaleTotal) + " TL"
        ];
    });

    doc.autoTable({
        startY: 85,
        head: [['Urun Adi', 'Liste Fiyat', 'Adet', 'Indirim', 'Net Tutar']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [4, 79, 64], textColor: [212, 175, 55] } 
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.text(`Ara Toplam: ${formatTR(subTotal)} TL`, 130, finalY);
    doc.setTextColor(255, 0, 0);
    doc.text(`Kazanilan Indirim: -${formatTR(discountTotal)} TL`, 130, finalY + 8);
    doc.setTextColor(4, 79, 64);
    doc.setFontSize(16);
    doc.text(`ODENECEK TUTAR: ${formatTR(grandTotal)} TL`, 130, finalY + 20);

    // 1. PDF'i Cihaza İndir
    const fileName = `Siparis_${company.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);

    // 2. WhatsApp Mesajını Hazırla
    const waText = `*YENİ TOPTAN SİPARİŞ!* 👑\n\n` +
                   `*İşletme:* ${company}\n` +
                   `*Yetkili:* ${name}\n` +
                   `*Adres:* ${address}\n` +
                   `*Sipariş Kalem Sayısı:* ${cart.length}\n` +
                   `*Toplam Tutar:* ${formatTR(grandTotal)} ₺\n\n` +
                   `_Not: Güvenlik gereği PDF otomatik eklenemez. Lütfen cihazınıza yeni inen PDF dosyasını bu sohbete ekleyerek siparişinizi onaylayın._`;

    // 3. İlgili Numaraya WhatsApp Bağlantısını Aç
    const phone = "905069012520"; 
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;
    
    // Yönlendirmeden önce sistemi temizle
    cart = []; 
    document.getElementById('cus-name').value = '';
    document.getElementById('cus-company').value = '';
    document.getElementById('cus-address').value = '';
    updateCartIcon();
    
    setTimeout(() => {
        window.open(waLink, '_blank');
        showPage('home');
    }, 1000); 
};