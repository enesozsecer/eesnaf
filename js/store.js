// js/store.js

export const BIRIM = { 1: 'Adet', 2: 'Kilogram', 3: 'Gram', 4: 'Litre', 5: 'Metre', 6: 'Paket', 7: 'Koli' };

export let DB = { Categories: [], Brands: [], ProductGroups: [], Products: [] };
export let cart = JSON.parse(localStorage.getItem("eesnaf_cart")) || [];
export let favorites = JSON.parse(localStorage.getItem("eesnaf_favorites")) || [];

// DB'yi güncelleyen fonksiyon
export function setDB(newData) {
    DB = newData;
}

// Sepeti ve Favorileri LocalStorage'a kaydetme işlemleri
export function saveCartToStorage() {
    localStorage.setItem("eesnaf_cart", JSON.stringify(cart));
}

export function saveFavoritesToStorage() {
    localStorage.setItem("eesnaf_favorites", JSON.stringify(favorites));
}