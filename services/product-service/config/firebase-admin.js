const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "firebase-service-account.json");

let isFirebaseInitialized = false;

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require("./firebase-service-account.json");
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[Product Service] Firebase Admin initialized successfully");
    isFirebaseInitialized = true;
  } catch (error) {
    console.log("[Product Service] Firebase initialization failed:", error.message);
    isFirebaseInitialized = false;
  }
} else {
  console.log("[Product Service] Firebase service account file not found, using mock");
  isFirebaseInitialized = false;
}

admin.isInitialized = () => isFirebaseInitialized;

module.exports = admin;