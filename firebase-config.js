// Firebase Configuration for TRENING AURA
// Using Firebase v9 compat mode (CDN)
цц
const firebaseConfig = {
    apiKey: "AIzaSyB_TO3XD2Uj_p62UroAvA57igN-XD4wVrU",
    authDomain: "trening-aura.firebaseapp.com",
    databaseURL: "https://trening-aura-default-rtdb.firebaseio.com",
    projectId: "trening-aura",
    storageBucket: "trening-aura.appspot.com",
    messagingSenderId: "237244099863",
    appId: "1:237244099863:web:3ffbcd47132da71b469b52",
    measurementId: "G-DXZQG97TV1"
};

const firebaseConfigSecondary = {
    apiKey: "AIzaSyDSf3wSUxxjZMp4-AvcxKBoWpKMBZWCtZc",
    authDomain: "trening-aura-2d26f.firebaseapp.com",
    projectId: "trening-aura-2d26f",
    storageBucket: "trening-aura-2d26f.firebasestorage.app",
    messagingSenderId: "210768590346",
    appId: "1:210768590346:web:cf42d547da4683f2fb51f3",
    measurementId: "G-KQ804781SZ"
};

// Check if Firebase is loaded
if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Make sure firebase-app-compat.js and firebase-database-compat.js are included.');
}

// Initialize the default Firebase app
if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Initialize the secondary Firebase app (for community posts)
let secondaryApp = null;
try {
    secondaryApp = firebase.app("secondary");
} catch(e) {
    secondaryApp = firebase.initializeApp(firebaseConfigSecondary, "secondary");
}
const secondaryDb = secondaryApp.database();

// Alias for community DB
const communityDb = secondaryDb;

