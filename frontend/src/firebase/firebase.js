import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { browserLocalPersistence, getAuth, setPersistence, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

const persistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn("Firebase auth persistence could not be set.", error);
});

export async function ensureAuthenticated() {
    await persistencePromise;

    if (auth.currentUser) {
        return auth.currentUser;
    }

    try {
        const credential = await signInAnonymously(auth);
        return credential.user;
    } catch (error) {
        throw new Error(`Unable to authenticate the current user with Firebase Auth: ${error?.message || error}`);
    }
}

export { app };