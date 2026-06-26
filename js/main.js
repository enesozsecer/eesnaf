// js/main.js

// Modülleri sadece içeri aktarmamız, onların çalışması için yeterlidir.
import './utils.js';
import './store.js';
import './firebase/api.js';
import './pages/home.js';
import './pages/detail.js';
import './pages/cart.js';
import './pages/favorites.js';

// Çalıştıracağımız spesifik fonksiyonları import ediyoruz
import { loadDataWithCache } from './firebase/api.js';

// PWA Kurulumu
let deferredPrompt;
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { 
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Başarısız: ', err)); 
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

window.installAppManual = function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    } else {
        const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        if (isIos()) alert("📱 iPhone'a yüklemek için:\n\nTarayıcının altındaki 'Paylaş' (Kare ve yukarı ok) ikonuna dokunun ve 'Ana Ekrana Ekle' seçeneğini seçin.");
        else alert("✅ Uygulama cihazınızda yüklü olabilir veya tarayıcınız desteklemiyor.\n\nMenüden (Sağ üstteki 3 nokta) 'Ana Ekrana Ekle' seçeneği ile indirebilirsiniz.");
    }
}

// Uygulama Başlarken (Eski window.onload)
window.addEventListener('DOMContentLoaded', () => {
    loadDataWithCache();
    if(window.updateCartIcon) window.updateCartIcon();
    if(window.updateFavIcon) window.updateFavIcon();
});