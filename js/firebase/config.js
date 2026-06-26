// js/firebase/config.js

const firebaseConfig = {
    apiKey: "SENIN_API_KEY",
    authDomain: "SENIN_PROJE_ID.firebaseapp.com",
    projectId: "eesnaf-34bf2",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// HTML'de CDN üzerinden yüklediğimiz için firebase objesi global olarak mevcut
firebase.initializeApp(firebaseConfig);
export const db = firebase.firestore();