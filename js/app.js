// Veritabanından gelen tam yapıya uygun ürünler
const DB = {
    Products: [
        {
            Id: "f3987520-623c-492c-8ee1-e8e01ab7757e",
            ProductId: "3a10b15a-691e-4429-9d6a-903ce7696c33",
            ProductGroupId: "40967fe9-5e02-4fe9-a8cc-ee9a661e8a17",
            CategoryId: "2dd32608-a51e-49a4-a27e-c6db3db76bd8",
            BrandId: "718bb433-ebff-4554-a2b9-00c005ba609f",
            BarCode: "8691234567890",
            Name: "Blendax Şampuan 500ml",
            Description: "Yasemin özlü, dökülme karşıtı toptan şampuan paketi.",
            PicturePath: "https://via.placeholder.com/400x400/044F40/d4af37?text=Blendax",
            Price: 150, // Normal Fiyat
            DiscountRate: 26, // İndirim oranı
            SalePrice: 110, // Satış Fiyatı (Senin tabloda 110 olarak belirlenmiş)
            StockQuantity: 132,
            UnitId: 1,
            UpdatedDate: "2026-06-16T21:15:10.402Z",
            UpdatedUser: "Cihaz_879"
        },
        {
            Id: "a123",
            ProductId: "b456",
            Name: "Toptan Havlu Kağıt",
            Description: "3 Katlı ekstra emici. Koli içi 24 rulo.",
            PicturePath: "https://via.placeholder.com/400x400/044F40/d4af37?text=Havlu+Kagit",
            Price: 200,
            DiscountRate: 0,
            SalePrice: 200,
            StockQuantity: 50,
            UnitId: 1
        }
    ]
};

let cart = [];

window.onload = () => {
    renderProducts();
};

function formatTR(num) {
    return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// SAYFA GEÇİŞ SİSTEMİ (SPA)
function showPage(pageId) {
    // Tüm sayfaları gizle
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    // İstenen sayfayı göster
    document.getElementById('page-' + pageId).classList.add('active');
    
    if(pageId === 'cart') {
        updateCartUI();
    }
}

// ÜRÜNLERİ LİSTELEME
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const q = document.getElementById('searchInput').value.toLowerCase();
    grid.innerHTML = '';

    DB.Products.forEach(p => {
        if (q && !p.Name.toLowerCase().includes(q)) return;

        let discountHtml = p.DiscountRate > 0 ? `<div class="discount-badge">%${p.DiscountRate} İndirim</div>` : '';
        let oldPriceHtml = p.DiscountRate > 0 ? `<span class="old-price">${formatTR(p.Price)} ₺</span>` : '<span class="old-price" style="visibility:hidden;">-</span>';

        grid.innerHTML += `
            <div class="product-card" onclick="openDetail('${p.Id}')">
                ${discountHtml}
                <img src="${p.PicturePath}" class="product-img">
                <h3 class="product-title">${p.Name}</h3>
                <p class="product-desc">${p.Description}</p>
                <div class="price-area">
                    ${oldPriceHtml}
                    <span class="new-price">${formatTR(p.SalePrice)} ₺</span>
                </div>
                <button class="btn-add" onclick="event.stopPropagation(); addToCart('${p.Id}', 1)">Sepete Ekle</button>
            </div>
        `;
    });
}

// DETAY SAYFASI
function openDetail(id) {
    const p = DB.Products.find(x => x.Id === id);
    document.getElementById('det-img').src = p.PicturePath;
    document.getElementById('det-name').innerText = p.Name;
    document.getElementById('det-desc').innerText = p.Description;
    
    document.getElementById('det-old-price').innerText = p.DiscountRate > 0 ? formatTR(p.Price) + " ₺" : "";
    document.getElementById('det-price').innerText = formatTR(p.SalePrice) + " ₺";
    
    document.getElementById('det-qty').value = 1;
    document.getElementById('det-add-btn').onclick = () => {
        addToCart(p.Id, document.getElementById('det-qty').value);
        showPage('cart'); // Ekleyince direkt sepete gitsin
    };
    
    showPage('detail');
}

// SEPET İŞLEMLERİ
function addToCart(id, qty = 1) {
    const p = DB.Products.find(x => x.Id === id);
    if (!p) return;

    const existing = cart.find(x => x.Id === id);
    if (existing) {
        existing.qty += Number(qty);
    } else {
        cart.push({ ...p, qty: Number(qty) });
    }
    
    updateCartIcon();
}

function updateCartIcon() {
    document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartUI() {
    const tbody = document.getElementById('cart-items');
    tbody.innerHTML = '';
    
    let subTotal = 0; // İndirimsiz toplam
    let discountTotal = 0; // Toplam indirim tutarı
    let grandTotal = 0; // Ödenecek

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
                <td><span style="text-decoration:line-through; font-size:0.8rem; color:#ff6b6b;">${item.DiscountRate > 0 ? formatTR(item.Price) : ''}</span><br>${formatTR(item.SalePrice)} ₺</td>
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
}

function updateQty(index, val) {
    if(val < 1) val = 1;
    cart[index].qty = Number(val);
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// SİPARİŞ & PDF & WHATSAPP
function completeOrder() {
    if (cart.length === 0) return alert("Sepetiniz boş!");
    
    const name = document.getElementById('cus-name').value.trim();
    const company = document.getElementById('cus-company').value.trim();
    const address = document.getElementById('cus-address').value.trim();
    
    // ZORUNLU ALAN KONTROLLERİ
    if (!name || !company || !address) {
        return alert("Lütfen Ad Soyad, İşletme Adı ve Teslimat Adresi alanlarının hepsini doldurunuz!");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // PDF TASARIMI
    doc.setFillColor(4, 79, 64); // Dark Green Header
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(212, 175, 55); // Gold Text
    doc.setFontSize(24);
    doc.text("E-ESNAF SIPARIS FORMU", 14, 25);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Tarih: ${new Date().toLocaleString('tr-TR')}`, 14, 50);
    doc.text(`Musteri: ${name}`, 14, 58);
    doc.text(`Isletme: ${company}`, 14, 66);
    doc.text(`Adres: ${address}`, 14, 74);

    let subTotal = 0;
    let discountTotal = 0;
    let grandTotal = 0;

    const tableData = cart.map(item => {
        const itemNormalTotal = item.Price * item.qty;
        const itemSaleTotal = item.SalePrice * item.qty;
        const itemDiscount = itemNormalTotal - itemSaleTotal;
        
        subTotal += itemNormalTotal;
        discountTotal += itemDiscount;
        grandTotal += itemSaleTotal;

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

    // 1. PDF'i İndir
    const fileName = `Siparis_${company.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);

    // 2. WhatsApp Mesajı
    const waText = `*YENİ TOPTAN SİPARİŞ!* 👑\n\n` +
                   `*İşletme:* ${company}\n` +
                   `*Yetkili:* ${name}\n` +
                   `*Adres:* ${address}\n` +
                   `*Sipariş Kalem Sayısı:* ${cart.length}\n` +
                   `*Toplam Tutar:* ${formatTR(grandTotal)} ₺\n\n` +
                   `_Detaylı PDF faturası sistemden cihaza indirilmiştir, lütfen bu mesaja ekleyerek gönderiniz._`;

    // 3. İstenilen Numaraya Yönlendir
    const phone = "905069012520"; 
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;
    
    setTimeout(() => {
        window.open(waLink, '_blank');
        cart = []; // Sepeti sıfırla
        document.getElementById('cus-name').value = '';
        document.getElementById('cus-company').value = '';
        document.getElementById('cus-address').value = '';
        updateCartUI();
        showPage('home');
    }, 1500); 
}