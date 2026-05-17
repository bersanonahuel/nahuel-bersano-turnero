// ─── Firebase Configuration ────────────────────────────────────────────────
// Obtené estas credenciales en: console.firebase.google.com
// Proyecto → Configuración → Tus apps → SDK setup

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();

/**
 * Inicia sesión con Google popup.
 * Retorna el objeto User de Firebase o lanza un error.
 */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user; // { uid, email, displayName, photoURL }
}

/**
 * Cierra sesión de Firebase.
 */
export async function logoutFirebase() {
  await signOut(auth);
}
