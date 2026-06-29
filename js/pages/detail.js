// js/pages/detail.js
import { DB, favorites, BIRIM } from '../store.js';
import { formatTR, showToast } from '../utils.js';

window.openDetail = function (id) {
    try {
        const p = DB.Products.find(x => x.Id === id);
        if (!p) return;

        const brandObj = (DB.Brands || []).find(b => b.Id === p.BrandId);
        const groupObj = (DB.ProductGroups || []).find(g => g.Id === p.ProductGroupId);
        const brandName = brandObj ? brandObj.Name : 'Belirtilmemiş';
        const groupName = groupObj ? groupObj.Name : 'Belirtilmemiş';

        const salePrice = Number(p.SalePrice) || 0;
        const cashPrice = salePrice * 0.99;

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

            // --- YENİ EKLENEN STOK KONTROLÜ ---
            const stockVal = Number(p.StockQuantity) || 0;
            if (stockVal <= 0) {
                addBtn.innerText = "Stokta Yok";
                addBtn.classList.add('btn-out-of-stock');
            } else {
                addBtn.innerText = "Sepete Ekle";
                addBtn.classList.remove('btn-out-of-stock');
            }
            // ----------------------------------

            // Kod () => { ... } içine sarıldığı için sadece butona basılınca tetiklenir
            addBtn.onclick = () => {
                window.addToCart(p.Id, qtyEl ? qtyEl.value : 1);
            };
            
        }

        const favBtn = document.getElementById('det-fav-btn');
        if (favBtn) {
            // Butona kimlik veriyoruz
            favBtn.setAttribute('data-fav-id', p.Id);

            // Sayfa açıldığında favorideyken kırmızı yap
            if (favorites.includes(p.Id)) {
                favBtn.classList.add('active');
            } else {
                favBtn.classList.remove('active');
            }

            // Tıklama olayını tamamen ortak sisteme devrediyoruz
            favBtn.onclick = function (e) {
                window.toggleFavoriteInline(p.Id, e);
            };
        }
        window.showPage('detail');
    } catch (error) {
        console.error("Detay sayfası hatası:", error);
    }
}