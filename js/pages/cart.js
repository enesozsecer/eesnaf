// js/pages/cart.js
import { cart, saveCartToStorage, BIRIM } from '../store.js';
import { formatTR, showSpinner, hideSpinner, showToast } from '../utils.js';
import { DB } from '../store.js';

window.addToCart = function(id, qty = 1) {
    const p = DB.Products.find(x => x.Id === id);
    if (!p) return;
    
    // Değişken adını StockQuantity yaptık
    const stock = Number(p.StockQuantity) || 0;
    
    // STOK 0 İSE KESİNLİKLE ENGELLE
    if (stock <= 0) {
        alert("⚠️ Bu ürün şu anda stokta bulunmamaktadır.");
        return;
    }

    const existing = cart.find(x => x.Id === id);
    const currentQty = existing ? existing.qty : 0;
    const requestedQty = currentQty + Number(qty);

    // İstenen miktar stoğu aşıyorsa ENGELLE
    if (requestedQty > stock) {
        alert(`⚠️ Uyarı: Stokta sadece ${stock} adet bulunuyor. En fazla ${stock} kadar sipariş verebilirsiniz.`);
        return; 
    }

    if (existing) existing.qty = requestedQty; 
    else cart.push({ ...p, qty: Number(qty) });

    window.updateCartIcon();
    saveCartToStorage();
    showToast();
}

window.updateCartIcon = function() {
    document.getElementById('cart-count').innerText = cart.length;
}

window.updateCartUI = function() {
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
                <td style="font-weight:bold; color:var(--text-light);">${item.Name}</td>
                <td><span style="text-decoration:line-through; font-size:0.8rem; color:#ff6b6b;">${item.DiscountRate > 0 ? formatTR(item.Price) : ''}</span><br>${formatTR(item.SalePrice)}₺ <span style="font-size:0.8rem; color:var(--text-muted)">/ ${unitName}</span></td>
                <td>
                    <div class="cart-qty-wrapper">
                        <input type="number" value="${item.qty}" min="1" onchange="window.updateQty(${index}, this.value)">
                        <span style="font-size:0.9rem;">${unitName}</span>
                    </div>
                </td>
                <td style="color:#ff6b6b;">${itemDiscount > 0 ? '-' + formatTR(itemDiscount) + '₺' : '-'}</td>
                <td style="font-weight:bold;">${formatTR(itemSaleTotal)}₺</td>
                <td style="text-align: center;">
                    <button class="btn-trash" onclick="window.removeFromCart(${index})" title="Sepetten Çıkar">
                        <svg viewBox="0 0 448 512" width="18" height="18" fill="currentColor"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-30.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
                    </button>
                </td>
            </tr>
        `;
    });

    let uiGrandTotal = 0;
    cart.forEach(item => { uiGrandTotal += (item.SalePrice * item.qty); });
    
    let uiShippingFee = uiGrandTotal < 1000 ? 50 : 0;
    let finalPayable = uiGrandTotal > 0 ? uiGrandTotal + uiShippingFee : 0;
    
    const shippingEl = document.getElementById('ui-shipping-fee');
    if(shippingEl) {
        shippingEl.innerText = uiShippingFee > 0 ? "50,00₺" : "Ücretsiz";
        shippingEl.style.color = uiShippingFee > 0 ? "inherit" : "#25D366";
    }
    
    const totalEl = document.getElementById('ui-grand-total');
    if(totalEl) {
        totalEl.innerText = formatTR(finalPayable) + "₺";
    }

    window.updateCartIcon();
}

window.updateQty = function(index, val) {
    if (val < 1) val = 1;
    
    const item = cart[index];
    const stock = Number(item.StockQuantity) || 0;

    // Sınırı aşmaya çalışırsa stoğa eşitle
    if (val > stock) {
        alert(`⚠️ Uyarı: Stokta sadece ${stock} adet bulunuyor. En fazla ${stock} kadar sipariş verebilirsiniz.`);
        val = stock; 
    }

    cart[index].qty = Number(val);
    if(window.updateCartUI) window.updateCartUI(); 
    saveCartToStorage();
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    window.updateCartUI();
    saveCartToStorage();
}

window.completeOrder = async function() {
    if (cart.length === 0) return alert("Sepetiniz boş!");

    if (cart.length === 0) return alert("Sepetiniz boş!");

    // --- 1. SİPARİŞ ÖNCESİ FİYAT VE STOK GÜNCELLEMESİ KONTROLÜ ---
    let hasStockError = false;
    let errorMessages = [];

    cart.forEach(item => {
        const dbProduct = DB.Products.find(x => x.Id === item.Id);
        if (dbProduct) {
            item.Price = dbProduct.Price;
            item.SalePrice = dbProduct.SalePrice;
            item.DiscountRate = dbProduct.DiscountRate;
            item.StockQuantity = dbProduct.StockQuantity; // Güncellendi

            const currentStock = Number(dbProduct.StockQuantity) || 0; // Güncellendi
            
            // Eğer o an stok bitmişse veya yetersizse hata ver
            if (item.qty > currentStock) {
                hasStockError = true;
                errorMessages.push(`- ${item.Name} (Stokta Kalan: ${currentStock})`);
            }
        }
    });

    if (hasStockError) {
        alert("⚠️ Siparişinizdeki bazı ürünlerin miktarı mevcut stokları aşıyor:\n\n" + errorMessages.join("\n") + "\n\nFiyatlar ve miktarlar güncellendi, lütfen sepetinizi kontrol edin.");
        if(window.updateCartUI) window.updateCartUI(); 
        return; 
    }

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
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; color: #000;">${formatTR(item.Price)}₺</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; color: #000;">${item.qty} ${unitName}</td>
                <td style="padding: 12px; text-align: center; color: red; border-bottom: 1px solid #eee;">${iD > 0 ? "-" + formatTR(iD) + "₺" : "-"}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; border-bottom: 1px solid #eee; color: #000;">${formatTR(iS)}₺</td>
            </tr>
        `;
    });

    let shippingFee = (grandTotal > 0 && grandTotal < 1000) ? 50 : 0;
    let finalTotalToPay = grandTotal + shippingFee;

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
                                <td style="text-align: right; padding: 2px 0;"><strong>${formatTR(subTotal)}₺</strong></td>
                            </tr>
                            <tr>
                                <td style="text-align: left; padding: 2px 0; color: red;">Kazanılan İndirim:</td>
                                <td style="text-align: right; padding: 2px 0; color: red;"><strong>-${formatTR(discountTotal)}₺</strong></td>
                            </tr>
                            <tr>
                                <td style="text-align: left; padding: 2px 0;">Kargo Ücreti:</td>
                                <td style="text-align: right; padding: 2px 0; ${shippingFee > 0 ? 'color:#000;' : 'color:#25D366;'}"><strong>${shippingFee > 0 ? formatTR(shippingFee) + '₺' : 'Ücretsiz'}</strong></td>
                            </tr>
                            <tr style="border-top: 2px solid #044F40;">
                                <td style="text-align: left; padding-top: 12px; font-size: 16px; color: #044F40; font-weight: bold;">ÖDENECEK TUTAR:</td>
                                <td style="text-align: right; padding-top: 12px; font-size: 22px; color: #044F40; font-weight: bold;">${formatTR(finalTotalToPay)}₺</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = invoiceHTML;
    tempDiv.style.position = 'absolute';
    tempDiv.style.top = '0';
    tempDiv.style.left = '0';
    tempDiv.style.width = '800px';
    tempDiv.style.zIndex = '-999999';
    document.body.appendChild(tempDiv);

    const opt = {
        margin:       0,
        filename:     `Siparis_${company.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/g, '_')}_${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0, windowWidth: 800, width: 800, x: 0, y: 0 }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(tempDiv.firstElementChild).outputPdf('blob').then(async (pdfBlob) => {
        const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });
        document.body.removeChild(tempDiv);
        
        // Sepeti temizleme işlemi doğrudan referans üzerinden yapılmaz (ES6 kuralı).
        // Modüldeki cart dizisinin içini boşaltıyoruz:
        cart.length = 0; 
        saveCartToStorage();
        
        const inputsToClear = ['cus-name', 'cus-company', 'cus-neighborhood', 'cus-street', 'cus-building-no', 'cus-door-no', 'cus-address-detail'];
        inputsToClear.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        
        window.updateCartIcon(); 
        window.updateCartUI();

        const waText = `*YENİ SİPARİŞ!* 👑\nİşletme: ${company}\nTutar: ${formatTR(finalTotalToPay)}₺ ${shippingFee > 0 ? '(Kargo Dahil)' : ''}`;

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try { 
                await navigator.share({ files: [file], title: 'Sipariş Faturası', text: waText }); 
            } catch (error) { }
        } else {
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(pdfBlob);
            link.download = opt.filename;
            link.click();
            
            const phone = "905069012520";
            const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waText + '\n\nNot: Fatura PDF olarak inmiştir, lütfen sohbete manuel ekleyiniz.')}`;
            window.open(waLink, '_blank');
        }
        hideSpinner(); 
        window.showPage('home');
    }).catch(err => {
        console.error("PDF oluşturulurken hata:", err);
        alert("Fatura oluşturulurken bir hata oluştu.");
        if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
        hideSpinner();
    });
}