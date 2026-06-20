// Test Verisi (Daha sonra bunu doğrudan Firebase'den çekeceğiz)
const DB = {
    Products: [
        {
            Id: "e5ef84f7-9a53-4e70-9059-0ffc9d5d3585",
            ProductId: "db976cbe-83e2-492c-93a2-a3cb2838edca",
            Name: "14a Balon",
            Description: "Parti ve etkinlikler için özel üretim dayanıklı balon. Paket içi 100 adet.",
            PicturePath: "https://i.ibb.co/6w2fH7n/placeholder-balon.jpg", // Test için temsili resim, base64 de çalışır
            Price: 200,
            DiscountRate: 10,
            SalePrice: 180,
            StockQuantity: 15,
            UnitId: 6, // 6 = Pk
            BrandId: "d33c1cf3",
            CategoryId: "3dde546a"
        },
        // Vitrini dolu görmek için 2. bir sahte ürün ekliyoruz
        {
            Id: "2", ProductId: "p2", Name: "Kırmızı Kurdele (50mt)", Description: "Süsleme kurdelesi.",
            PicturePath: "https://i.ibb.co/Wc2tXyq/placeholder-kurdele.jpg",
            Price: 50, DiscountRate: 0, SalePrice: 50, StockQuantity: 100, UnitId: 1
        }
    ]
};

let cart = []; // Sepetimiz

// Sayfa yüklendiğinde ürünleri çiz
window.onload = () => {
    renderProducts();
};

function formatTR(num) {
    return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Ürünleri Ekrana Dizen Motor
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const q = document.getElementById('searchInput').value.toLowerCase();
    grid.innerHTML = '';

    DB.Products.forEach(p => {
        if (q && !p.Name.toLowerCase().includes(q)) return;

        // İndirim varsa kırmızı rozeti ve eski fiyatı göster
        let discountHtml = p.DiscountRate > 0 ? `<div class="discount-badge">%${p.DiscountRate} İndirim</div>` : '';
        let oldPriceHtml = p.DiscountRate > 0 ? `<span class="old-price">${formatTR(p.Price)} ₺</span>` : '<span class="old-price" style="visibility:hidden;">-</span>';

        grid.innerHTML += `
            <div class="product-card" onclick="openDetail('${p.Id}')">
                ${discountHtml}
                <img src="${p.PicturePath || 'https://via.placeholder.com/200'}" class="product-img">
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

// ---------------- SEPET İŞLEMLERİ ----------------
function addToCart(id, qty = 1) {
    const p = DB.Products.find(x => x.Id === id);
    if (!p) return;

    const existing = cart.find(x => x.Id === id);
    if (existing) {
        existing.qty += Number(qty);
    } else {
        cart.push({ ...p, qty: Number(qty) });
    }
    
    updateCartUI();
    closeDetail();
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.qty, 0);
    
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        const lineTotal = item.SalePrice * item.qty;
        total += lineTotal;
        list.innerHTML += `
            <div class="cart-item">
                <div style="flex:2; font-weight:bold;">${item.Name}</div>
                <div style="flex:1;">
                    <input type="number" value="${item.qty}" min="1" style="width:50px; text-align:center;" onchange="updateQty(${index}, this.value)">
                </div>
                <div style="flex:1; text-align:right; color:var(--primary); font-weight:bold;">${formatTR(lineTotal)} ₺</div>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; cursor:pointer; font-size:1.2rem; margin-left:10px;">🗑️</button>
            </div>
        `;
    });

    document.getElementById('cart-total-price').innerText = formatTR(total) + " ₺";
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

// ---------------- MODALLAR ----------------
function toggleCart() {
    document.getElementById('cart-modal').classList.toggle('hidden');
}

function openDetail(id) {
    const p = DB.Products.find(x => x.Id === id);
    document.getElementById('det-img').src = p.PicturePath || 'https://via.placeholder.com/200';
    document.getElementById('det-name').innerText = p.Name;
    document.getElementById('det-desc').innerText = p.Description;
    document.getElementById('det-price').innerText = formatTR(p.SalePrice) + " ₺";
    document.getElementById('det-qty').value = 1;
    
    document.getElementById('det-add-btn').onclick = () => addToCart(p.Id, document.getElementById('det-qty').value);
    
    document.getElementById('detail-modal').classList.remove('hidden');
}

function closeDetail() {
    document.getElementById('detail-modal').classList.add('hidden');
}

// ---------------- WHATSAPP & PDF MOTORU ----------------
function completeOrder() {
    if (cart.length === 0) return alert("Sepetiniz boş!");
    
    const name = document.getElementById('cus-name').value.trim();
    const company = document.getElementById('cus-company').value.trim();
    const address = document.getElementById('cus-address').value.trim();
    
    if (!name) return alert("Lütfen adınızı giriniz.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // PDF Başlığı
    doc.setFontSize(20);
    doc.text("YENI SIPARIS (e-esnaf)", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Tarih: ${new Date().toLocaleString('tr-TR')}`, 14, 30);
    doc.text(`Musteri: ${name} ${company ? '('+company+')' : ''}`, 14, 38);
    doc.text(`Adres: ${address}`, 14, 46);

    // Tablo Verileri
    const tableData = cart.map(item => [
        item.Name,
        item.qty.toString(),
        formatTR(item.SalePrice) + " TL",
        formatTR(item.SalePrice * item.qty) + " TL"
    ]);

    let totalAmount = cart.reduce((sum, item) => sum + (item.SalePrice * item.qty), 0);

    doc.autoTable({
        startY: 55,
        head: [['Urun Adi', 'Miktar', 'Birim Fiyat', 'Toplam']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [231, 76, 60] } // Kırmızı tema
    });

    doc.setFontSize(14);
    doc.text(`GENEL TOPLAM: ${formatTR(totalAmount)} TL`, 14, doc.lastAutoTable.finalY + 15);

    // 1. PDF'i Cihaza İndir
    const fileName = `Siparis_${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);

    // 2. WhatsApp İçin Şık Bir Metin Hazırla
    const waText = `*YENİ SİPARİŞ GELDİ!* 🛍️\n\n` +
                   `*Müşteri:* ${name}\n` +
                   `*İşletme:* ${company || '-'}\n` +
                   `*Tutar:* ${formatTR(totalAmount)} ₺\n\n` +
                   `_Siparişin detaylı faturasını (PDF) bu mesaja ekliyorum._`;

    // 3. WhatsApp'ı Aç (Seni Kendi Numarana Yönlendirir, NUMARAYI DEĞİŞTİR)
    const phone = "905555555555"; // BURAYA KENDİ NUMARANI YAZ
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;
    
    setTimeout(() => {
        window.open(waLink, '_blank');
        cart = []; // Sepeti boşalt
        updateCartUI();
        toggleCart();
    }, 1000); // PDF inmesi için 1 saniye mühlet
}