const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

console.log("[Firebase Admin] Initializing...");

const serviceAccountPath = path.join(__dirname, "firebase-service-account.json");

let isFirebaseInitialized = false;

try {
  if (fs.existsSync(serviceAccountPath)) {
    console.log("[Firebase Admin] Service account file found");
    const serviceAccount = require("./firebase-service-account.json");
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[Firebase Admin] initialized successfully with service account");
    isFirebaseInitialized = true;
  } else {
    console.log("[Firebase Admin] Service account file not found, using mock mode");
    isFirebaseInitialized = false;
  }
} catch (error) {
  console.log("[Firebase Admin] initialization failed:", error.message);
  isFirebaseInitialized = false;
}

admin.isInitialized = () => isFirebaseInitialized;

console.log("[Firebase Admin] Setup complete, initialized:", isFirebaseInitialized);

module.exports = admin;