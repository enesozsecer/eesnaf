// js/firebase/api.js
import { db } from './config.js';
import { DB, setDB } from '../store.js';
import { showSpinner, hideSpinner } from '../utils.js';

export async function loadDataWithCache() {
    showSpinner("Veriler Hazırlanıyor...");
    const cachedData = localStorage.getItem("eesnaf_DB");
    const cacheTimestamp = localStorage.getItem("eesnaf_time");
    const now = Date.now();
    
    if (cachedData && cacheTimestamp && (now - cacheTimestamp < 43200000)) {
        setDB(JSON.parse(cachedData));
        window.populateFilters(); 
        window.filterRenderedProducts(); 
        hideSpinner(); 
        return;
    }
    fetchFromFirebase();
}

window.forceRefreshData = function() {
    localStorage.removeItem("eesnaf_DB");
    localStorage.removeItem("eesnaf_time");
    fetchFromFirebase();
}

async function fetchFromFirebase() {
    showSpinner("Sayfa Yükleniyor...");
    try {
        const [catSnap, brandSnap, groupSnap, productSnap] = await Promise.all([
            db.collection("Category").where("Deleted", "==", false).get(),
            db.collection("Brand").where("Deleted", "==", false).get(),
            db.collection("ProductGroup").where("Deleted", "==", false).get(),
            db.collection("PublishItem").get()
        ]);
        
        const newDB = {
            Categories: catSnap.docs.map(doc => doc.data()),
            Brands: brandSnap.docs.map(doc => doc.data()),
            ProductGroups: groupSnap.docs.map(doc => doc.data()),
            Products: productSnap.docs.map(doc => doc.data())
        };

        setDB(newDB);
        localStorage.setItem("eesnaf_DB", JSON.stringify(newDB));
        localStorage.setItem("eesnaf_time", Date.now().toString());

        window.populateFilters(); 
        window.filterRenderedProducts(); 
        hideSpinner();
    } catch (error) { 
        console.error(error); 
        hideSpinner(); 
        window.showPage('500'); 
    }
}