// import * as admin from 'firebase-admin';
// import { getFirestore as getFirestoreInstance } from 'firebase-admin/firestore';

// // HARDCODED CREDENTIALS
// const projectId = process.env.FIREBASE_PROJECT_ID
// const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
// const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
// /**
//  * Lazy initialization function to ensure Firebase is only 
//  * booted up when needed.
//  */
// function initializeFirebase() {
//   if (!admin.apps.length) {
//     try {
//       admin.initializeApp({
//         credential: admin.credential.cert({
//           projectId,
//           clientEmail,
//           privateKey: privateKey.replace(/\\n/g, '\n').trim(),
//         }),
//       });
//       console.log("✅ Firebase Admin Initialized");
//     } catch (error: any) {
//       console.error("❌ Firebase Admin Init Error:", error.message);
//       throw error;
//     }
//   }
//   return admin.app();
// }

// // 2. Initialize the app
// const app = initializeFirebase();

// /**
//  * 3. Export the 'db' constant specifically targeting the 'karma-docs' database.
//  * We use getFirestoreInstance (renamed from the import) to avoid the collision.
//  */
// export const db = getFirestoreInstance(app, 'karma-docs');


import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Helper to ensure the private key is formatted correctly for Firebase.
 * Handles both actual newlines and escaped '\n' strings.
 */
const formatPrivateKey = (key: string | undefined) => {
  if (!key) return undefined;
  return key.replace(/\\n/g, '\n').trim();
};

function initializeFirebase() {
  // 1. Check if already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // 2. Pull variables inside the function to ensure they are loaded
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  const privateKey = formatPrivateKey(process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY);

  // 3. Robust validation
  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    if (!clientEmail) missing.push("NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missing.push("NEXT_PUBLIC_FIREBASE_PRIVATE_KEY");
    
    throw new Error(`❌ Firebase Admin Config Missing: ${missing.join(', ')}`);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("✅ Firebase Admin Initialized");
    return admin.app();
  } catch (error: any) {
    console.error("❌ Firebase Admin Init Error:", error.message);
    throw error;
  }
}

// Initialize the app instance
const app = initializeFirebase();

/**
 * Export the 'db' constant targeting the specific 'karma-docs' database.
 */
export const db = getFirestore(app, 'karma-docs');
export { admin };