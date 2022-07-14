import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import config from "../../config/config"

const FIREBASE_CONFIG = {
    apiKey: config.FIRESTORE_API_KEY,
    authDomain: config.FIRESTORE_AUTH_DOMAIN,
    projectId: config.FIRESTORE_PROJECT_ID,
    storageBucket: config.FIRESTORE_STORAGE_BUCKET,
    messagingSenderId: config.FIRESTORE_MESSAGING_SENDER_ID,
    appId: config.FIRESTORE_APP_ID,
    measurementId: config.FIRESTORE_MEASUREMENT_ID
};

// DB connection
const app = initializeApp(FIREBASE_CONFIG)
export const db = getFirestore(app)