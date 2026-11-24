import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs 
} from 'firebase/firestore';

// Env variables provided dynamically by AI Studio / Cloud Run
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || 'AIzaSyDck09d7i9K9d0EuUKGbp00_cHPVnX6iK8',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'sejamais-ad3b3.firebaseapp.com',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || 'sejamais-ad3b3',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'sejamais-ad3b3.firebasestorage.app',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '837478276513',
  appId: metaEnv.VITE_FIREBASE_APP_ID || '1:837478276513:web:c81e4acd7b76051d253fe0',
};

export const isFirebaseConfigured = !!(metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId);

let db: any = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log('[Firebase] Inicializado com sucesso.');
  } catch (err) {
    console.error('[Firebase] Erro ao inicializar:', err);
  }
} else {
  console.log('[Firebase] Variáveis de ambiente ausentes. Usando LocalStorage offline por padrão.');
}

export { db };

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Salva um documento ou registro individual no Firestore.
 */
export async function saveToFirestore(collectionName: string, docId: string, data: any): Promise<boolean> {
  if (!db) return false;
  try {
    const docRef = doc(db, collectionName, docId);
    const sanitizedData = cleanUndefined({ ...data, updatedAt: new Date().toISOString() });
    await setDoc(docRef, sanitizedData, { merge: true });
    return true;
  } catch (err) {
    console.error(`[Firebase] Erro ao salvar em ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Salva uma coleção inteira (lista de registros) no Firestore, mantendo cada item como um documento próprio.
 */
export async function saveCollectionToFirestore(collectionName: string, items: any[]): Promise<boolean> {
  if (!db) return false;
  try {
    for (const item of items) {
      if (item.id) {
        await saveToFirestore(collectionName, item.id, item);
      }
    }
    return true;
  } catch (err) {
    console.error(`[Firebase] Erro ao salvar coleção ${collectionName}:`, err);
    return false;
  }
}

/**
 * Carrega todos os documentos de uma coleção do Firestore.
 */
export async function loadCollectionFromFirestore<T>(collectionName: string): Promise<T[] | null> {
  if (!db) return null;
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as any);
    });
    return items;
  } catch (err) {
    console.error(`[Firebase] Erro ao ler coleção ${collectionName}:`, err);
    return null;
  }
}
