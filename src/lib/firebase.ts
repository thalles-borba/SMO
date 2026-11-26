import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export type UserRole = 'gestao' | 'dentista' | 'funcionario';

export const DEFAULT_CLINIC_ID = 'sejamais-principal';

export const ROLE_LABELS: Record<UserRole, string> = {
  gestao: 'Gestão',
  dentista: 'Dentista',
  funcionario: 'Funcionário',
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface UserProfile {
  uid: string;
  clinicId: string;
  displayName: string;
  photoURL?: string;
  clinicName: string;
  specialty?: string;
  role: UserRole;
  active: boolean;
  linkedDoctorId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ClinicMember {
  uid: string;
  clinicId: string;
  displayName: string;
  photoURL?: string;
  specialty?: string;
  role: UserRole;
  active: boolean;
  linkedDoctorId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ClinicInvite {
  id: string;
  clinicId: string;
  email: string;
  role: UserRole;
  linkedDoctorId?: string;
  invitedByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  phone?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'thallespborba@gmail.com';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function createAuthInstance() {
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence,
      ],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuthInstance();
export const isFirebaseConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Startup connectivity verification
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function completeGoogleRedirectIfPending(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth, browserPopupRedirectResolver);
    return result?.user || null;
  } catch (error) {
    console.error('[Firebase Auth] Erro ao concluir redirecionamento Google:', error);
    throw error;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    return result.user;
  } catch (error: any) {
    const code = error?.code || '';
    const shouldFallbackToRedirect =
      !isRunningInIframe() &&
      (code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/internal-error');

    if (shouldFallbackToRedirect) {
      await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
      return null;
    }

    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };

// ============================================================================
// DEFENSIVE PAYLOAD SANITIZATION (SYNCHRONIZED WITH firebase-blueprint.json)
// ============================================================================
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned.length > 0 && SAFE_ID_REGEX.test(cleaned)
    ? cleaned
    : `doc-${Date.now()}`;
}

export function emailToInviteId(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/@/g, '_at_')
    .replace(/\./g, '_dot_')
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 128);
}

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase());
}

function normalizeRole(raw: unknown): UserRole {
  if (raw === 'gestao' || raw === 'gerente') return 'gestao';
  if (raw === 'dentista') return 'dentista';
  return 'funcionario';
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.trim().slice(0, maxLen);
}

function clampNumber(val: unknown, fallback = 0): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
}

const VALID_PAYMENT_METHODS = [
  'Dinheiro',
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'Outros',
];

export type ClinicSubcollection =
  | 'transactions'
  | 'doctors'
  | 'supplies'
  | 'goals'
  | 'teamMembers'
  | 'config';

function sanitizeEntityPayload(
  subcollection: ClinicSubcollection,
  clinicId: string,
  ownerId: string,
  docId: string,
  raw: Record<string, any>
): Record<string, any> {
  const id = sanitizeId(docId);
  const safeClinicId = sanitizeId(clinicId);
  const safeOwnerId = sanitizeId(ownerId);

  switch (subcollection) {
    case 'transactions': {
      const payload: Record<string, any> = {
        id,
        clinicId: safeClinicId,
        ownerId: safeOwnerId,
        date: clampString(raw.date, 20, new Date().toISOString().split('T')[0]),
        description: clampString(raw.description, 300, 'Lançamento'),
        doctorName: clampString(raw.doctorName, 120, 'Administração'),
        value: clampNumber(raw.value, 0),
        category: clampString(raw.category, 80, 'Outros'),
        type: raw.type === 'despesa' ? 'despesa' : 'receita',
      };
      if (raw.patientName && typeof raw.patientName === 'string' && raw.patientName.trim()) {
        payload.patientName = clampString(raw.patientName, 120);
      }
      if (raw.supplier && typeof raw.supplier === 'string') {
        payload.supplier = clampString(raw.supplier, 120);
      }
      if (raw.subcategory && typeof raw.subcategory === 'string') {
        payload.subcategory = clampString(raw.subcategory, 80);
      }
      if (raw.paymentMethod && VALID_PAYMENT_METHODS.includes(raw.paymentMethod)) {
        payload.paymentMethod = raw.paymentMethod;
      }
      if (raw.status === 'pago' || raw.status === 'pendente') {
        payload.status = raw.status;
      }
      if (raw.dueDate && typeof raw.dueDate === 'string') {
        payload.dueDate = clampString(raw.dueDate, 20);
      }
      return payload;
    }

    case 'doctors': {
      const payload: Record<string, any> = {
        id,
        clinicId: safeClinicId,
        ownerId: safeOwnerId,
        name: clampString(raw.name, 120, 'Dentista'),
        avatar: clampString(raw.avatar, 1000, ''),
        role: clampString(raw.role, 80, 'Dentista'),
        monthlyTarget: clampNumber(raw.monthlyTarget, 0),
        currentEarnings: clampNumber(raw.currentEarnings, 0),
        specialty: clampString(raw.specialty, 100, 'Odontologia Geral'),
        cro: clampString(raw.cro, 40, ''),
        email: clampString(raw.email, 254, ''),
      };
      if (raw.evaluations !== undefined) {
        payload.evaluations = clampNumber(raw.evaluations, 0);
      }
      if (raw.closures !== undefined) {
        payload.closures = clampNumber(raw.closures, 0);
      }
      return payload;
    }

    case 'supplies': {
      const payload: Record<string, any> = {
        id,
        clinicId: safeClinicId,
        ownerId: safeOwnerId,
        name: clampString(raw.name, 160, 'Material'),
        category: clampString(raw.category, 80, 'Consumíveis'),
        stock: clampNumber(raw.stock, 0),
        minStock: clampNumber(raw.minStock, 0),
        unit: clampString(raw.unit, 40, 'un'),
        price: clampNumber(raw.price, 0),
      };
      if (raw.expirationDate && typeof raw.expirationDate === 'string') {
        payload.expirationDate = clampString(raw.expirationDate, 20);
      }
      if (raw.batchNumber && typeof raw.batchNumber === 'string') {
        payload.batchNumber = clampString(raw.batchNumber, 60);
      }
      if (raw.supplier && typeof raw.supplier === 'string') {
        payload.supplier = clampString(raw.supplier, 120);
      }
      if (raw.location && typeof raw.location === 'string') {
        payload.location = clampString(raw.location, 120);
      }
      return payload;
    }

    case 'goals':
      return {
        id,
        clinicId: safeClinicId,
        ownerId: safeOwnerId,
        title: clampString(raw.title, 160, 'Meta'),
        targetValue: clampNumber(raw.targetValue, 0),
        currentValue: clampNumber(raw.currentValue, 0),
        deadline: clampString(raw.deadline, 40, ''),
        assignedTo: clampString(raw.assignedTo, 120, 'Toda a Equipe'),
      };

    case 'teamMembers': {
      const validStatuses = ['Ativo', 'Em plantão', 'Ausente'];
      return {
        id,
        clinicId: safeClinicId,
        ownerId: safeOwnerId,
        name: clampString(raw.name, 120, 'Membro'),
        role: clampString(raw.role, 80, 'Equipe'),
        avatar: clampString(raw.avatar, 1000, ''),
        status: validStatuses.includes(raw.status) ? raw.status : 'Ativo',
      };
    }

    case 'config':
      return {
        id,
        clinicId: safeClinicId,
        ownerId: safeOwnerId,
        val: clampNumber(raw.val, 0),
      };
  }
}

// ============================================================================
// INVITE LOOKUP & USER REGISTRATION / MIGRATION
// ============================================================================
export async function getInviteForEmail(
  email: string,
  clinicId = DEFAULT_CLINIC_ID
): Promise<ClinicInvite | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  const inviteId = emailToInviteId(cleanEmail);
  const path = `clinics/${clinicId}/invites/${inviteId}`;
  try {
    const snap = await getDoc(doc(db, 'clinics', clinicId, 'invites', inviteId));
    if (!snap.exists()) return null;
    return snap.data() as ClinicInvite;
  } catch (error) {
    // Non-fatal on lookup if rules block mismatched email
    console.warn('[Firebase] Invite lookup skipped:', path, error);
    return null;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const raw = snap.data() as Record<string, any>;
    return {
      uid: raw.uid || uid,
      clinicId: raw.clinicId || '',
      displayName: raw.displayName || 'Usuário',
      photoURL: raw.photoURL,
      clinicName: raw.clinicName || 'Seja Mais Odontologia',
      specialty: raw.specialty,
      role: normalizeRole(raw.role),
      active: raw.active !== undefined ? Boolean(raw.active) : true,
      linkedDoctorId: raw.linkedDoctorId || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Ensures legacy accounts (created before shared-clinic RBAC) are cleanly migrated
 * and reconciles the user's authoritative role/active/linkedDoctorId from /clinics/{clinicId}/members/{uid}.
 */
export async function ensureUserWorkspaceSync(
  user: User,
  profile: UserProfile
): Promise<UserProfile> {
  const uid = sanitizeId(user.uid);
  const clinicId = profile.clinicId || DEFAULT_CLINIC_ID;
  const isAdmin = Boolean(user.emailVerified) && isBootstrappedAdminEmail(user.email);

  let effectiveRole: UserRole = isAdmin ? 'gestao' : normalizeRole(profile.role);
  let effectiveActive = profile.active !== false;
  let effectiveLinkedDoctorId = profile.linkedDoctorId || undefined;

  // 1. Migrate legacy admin /users/{uid} doc if clinicId was missing
  if (isAdmin && !profile.clinicId) {
    const userPath = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        clinicId: DEFAULT_CLINIC_ID,
        role: 'gestao',
        active: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  // 2. Ensure root clinic document exists when bootstrapped admin signs in
  if (isAdmin) {
    const clinicRef = doc(db, 'clinics', clinicId);
    const clinicPath = `clinics/${clinicId}`;
    try {
      const clinicSnap = await getDoc(clinicRef);
      if (!clinicSnap.exists()) {
        await setDoc(clinicRef, {
          id: clinicId,
          name: clampString(profile.clinicName || 'Seja Mais Odontologia', 120, 'Seja Mais Odontologia'),
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, clinicPath);
    }
  }

  // 3. Ensure /clinics/{clinicId}/members/{uid} exists and read authoritative access
  const memberRef = doc(db, 'clinics', clinicId, 'members', uid);
  const memberPath = `clinics/${clinicId}/members/${uid}`;
  try {
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) {
      let invite: ClinicInvite | null = null;
      if (!isAdmin && user.email) {
        invite = await getInviteForEmail(user.email, clinicId);
      }
      const memberRole: UserRole = isAdmin
        ? 'gestao'
        : invite
          ? normalizeRole(invite.role)
          : 'funcionario';
      const memberLinkedDoctorId =
        memberRole === 'dentista' && invite?.linkedDoctorId ? invite.linkedDoctorId : '';

      const memberDoc: Record<string, any> = {
        uid,
        clinicId,
        displayName: clampString(profile.displayName || user.displayName || 'Usuário', 120, 'Usuário'),
        role: memberRole,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (profile.photoURL || user.photoURL) {
        memberDoc.photoURL = clampString(profile.photoURL || user.photoURL, 1000);
      }
      if (profile.specialty) {
        memberDoc.specialty = clampString(profile.specialty, 80);
      }
      if (memberLinkedDoctorId) {
        memberDoc.linkedDoctorId = clampString(memberLinkedDoctorId, 128);
      }

      await setDoc(memberRef, memberDoc);
      effectiveRole = memberRole;
      effectiveActive = true;
      effectiveLinkedDoctorId = memberLinkedDoctorId || undefined;

      if (invite) {
        try {
          await deleteDoc(doc(db, 'clinics', clinicId, 'invites', invite.id));
        } catch {
          // Non-fatal cleanup
        }
      }
    } else {
      const mData = memberSnap.data() as ClinicMember;
      effectiveRole = isAdmin ? 'gestao' : normalizeRole(mData.role);
      effectiveActive = isAdmin ? true : mData.active !== false;
      effectiveLinkedDoctorId = mData.linkedDoctorId || undefined;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, memberPath);
  }

  return {
    ...profile,
    clinicId,
    role: effectiveRole,
    active: effectiveActive,
    linkedDoctorId: effectiveLinkedDoctorId,
  };
}

export async function registerUserProfile(
  user: User,
  input: {
    displayName: string;
    clinicName: string;
    specialty?: string;
    phone?: string;
  }
): Promise<UserProfile> {
  const uid = sanitizeId(user.uid);
  const clinicId = DEFAULT_CLINIC_ID;
  const path = `users/${uid}`;
  const isAdmin = Boolean(user.emailVerified) && isBootstrappedAdminEmail(user.email);

  let matchedInvite: ClinicInvite | null = null;
  if (!isAdmin && user.email) {
    matchedInvite = await getInviteForEmail(user.email, clinicId);
  }

  const role: UserRole = isAdmin
    ? 'gestao'
    : matchedInvite
      ? normalizeRole(matchedInvite.role)
      : 'funcionario';

  const linkedDoctorId =
    role === 'dentista' && matchedInvite?.linkedDoctorId
      ? clampString(matchedInvite.linkedDoctorId, 128)
      : '';

  const cleanDisplayName = clampString(input.displayName || user.displayName || 'Usuário', 120, 'Usuário');
  const cleanClinicName = clampString(input.clinicName || 'Seja Mais Odontologia', 120, 'Seja Mais Odontologia');

  const profileData: Record<string, any> = {
    uid,
    clinicId,
    displayName: cleanDisplayName,
    clinicName: cleanClinicName,
    role,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const memberData: Record<string, any> = {
    uid,
    clinicId,
    displayName: cleanDisplayName,
    role,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (user.photoURL) {
    const cleanPhoto = clampString(user.photoURL, 1000);
    profileData.photoURL = cleanPhoto;
    memberData.photoURL = cleanPhoto;
  }
  if (input.specialty && input.specialty.trim()) {
    const cleanSpec = clampString(input.specialty, 80);
    profileData.specialty = cleanSpec;
    memberData.specialty = cleanSpec;
  }
  if (linkedDoctorId) {
    profileData.linkedDoctorId = linkedDoctorId;
    memberData.linkedDoctorId = linkedDoctorId;
  }

  const privateData: Record<string, any> = {
    uid,
    email: clampString(user.email || '', 254, 'usuario@google.com'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.phone && input.phone.trim()) {
    privateData.phone = clampString(input.phone, 30);
  }

  try {
    // Ensure clinic root doc exists if bootstrapped admin is registering first
    if (isAdmin) {
      const clinicRef = doc(db, 'clinics', clinicId);
      const clinicSnap = await getDoc(clinicRef);
      if (!clinicSnap.exists()) {
        await setDoc(clinicRef, {
          id: clinicId,
          name: cleanClinicName,
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid), profileData);
    batch.set(doc(db, 'users', uid, 'private', 'info'), privateData);
    batch.set(doc(db, 'clinics', clinicId, 'members', uid), memberData);
    await batch.commit();

    // Consume claimed invite after registration succeeds
    if (matchedInvite) {
      try {
        await deleteDoc(doc(db, 'clinics', clinicId, 'invites', matchedInvite.id));
      } catch {
        // Non-fatal invite cleanup
      }
    }

    return {
      uid,
      clinicId,
      displayName: profileData.displayName,
      photoURL: profileData.photoURL,
      clinicName: profileData.clinicName,
      specialty: profileData.specialty,
      role,
      active: true,
      linkedDoctorId: linkedDoctorId || undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ============================================================================
// ACCESS MANAGEMENT CRUD (GESTÃO ONLY)
// ============================================================================
export async function listClinicMembers(clinicId = DEFAULT_CLINIC_ID): Promise<ClinicMember[]> {
  const path = `clinics/${clinicId}/members`;
  try {
    const q = query(collection(db, 'clinics', clinicId, 'members'), where('clinicId', '==', clinicId));
    const snap = await getDocs(q);
    const members: ClinicMember[] = [];
    snap.forEach(d => {
      const data = d.data() as Record<string, any>;
      members.push({
        uid: data.uid || d.id,
        clinicId: data.clinicId || clinicId,
        displayName: data.displayName || 'Usuário',
        photoURL: data.photoURL,
        specialty: data.specialty,
        role: normalizeRole(data.role),
        active: data.active !== false,
        linkedDoctorId: data.linkedDoctorId || undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return members;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function listClinicInvites(clinicId = DEFAULT_CLINIC_ID): Promise<ClinicInvite[]> {
  const path = `clinics/${clinicId}/invites`;
  try {
    const q = query(collection(db, 'clinics', clinicId, 'invites'), where('clinicId', '==', clinicId));
    const snap = await getDocs(q);
    const invites: ClinicInvite[] = [];
    snap.forEach(d => {
      const data = d.data() as Record<string, any>;
      invites.push({
        id: data.id || d.id,
        clinicId: data.clinicId || clinicId,
        email: data.email || '',
        role: normalizeRole(data.role),
        linkedDoctorId: data.linkedDoctorId || undefined,
        invitedByUid: data.invitedByUid || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return invites;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function upsertClinicInvite(
  clinicId: string,
  invitedByUid: string,
  input: {
    email: string;
    role: UserRole;
    linkedDoctorId?: string;
  }
): Promise<ClinicInvite> {
  const cleanEmail = input.email.trim().toLowerCase();
  const inviteId = emailToInviteId(cleanEmail);
  const path = `clinics/${clinicId}/invites/${inviteId}`;
  const docRef = doc(db, 'clinics', clinicId, 'invites', inviteId);
  const linkedDocId = input.role === 'dentista' ? clampString(input.linkedDoctorId || '', 128) : '';

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      const updatePayload: Record<string, any> = {
        role: input.role,
        linkedDoctorId: linkedDocId,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(docRef, updatePayload);
    } else {
      const createPayload: Record<string, any> = {
        id: inviteId,
        clinicId: sanitizeId(clinicId),
        email: clampString(cleanEmail, 254),
        role: input.role,
        invitedByUid: sanitizeId(invitedByUid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (linkedDocId) {
        createPayload.linkedDoctorId = linkedDocId;
      }
      await setDoc(docRef, createPayload);
    }

    return {
      id: inviteId,
      clinicId,
      email: cleanEmail,
      role: input.role,
      linkedDoctorId: linkedDocId || undefined,
      invitedByUid,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClinicInvite(clinicId: string, inviteId: string): Promise<void> {
  const safeId = sanitizeId(inviteId);
  const path = `clinics/${clinicId}/invites/${safeId}`;
  try {
    await deleteDoc(doc(db, 'clinics', clinicId, 'invites', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateMemberAccess(
  clinicId: string,
  memberUid: string,
  updates: {
    role: UserRole;
    active: boolean;
    linkedDoctorId?: string;
  }
): Promise<void> {
  const safeUid = sanitizeId(memberUid);
  const path = `clinics/${clinicId}/members/${safeUid}`;
  const linkedDoctorId = updates.role === 'dentista' ? clampString(updates.linkedDoctorId || '', 128) : '';

  const payload = {
    role: updates.role,
    active: Boolean(updates.active),
    linkedDoctorId,
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'clinics', clinicId, 'members', safeUid), payload);
    batch.update(doc(db, 'users', safeUid), payload);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// SHARED CLINIC WORKSPACE CRUD (/clinics/{clinicId}/{subcollection})
// ============================================================================
export async function loadClinicCollection<T>(
  clinicId: string,
  subcollection: ClinicSubcollection
): Promise<T[]> {
  const path = `clinics/${clinicId}/${subcollection}`;
  try {
    const q = query(
      collection(db, 'clinics', clinicId, subcollection),
      where('clinicId', '==', clinicId)
    );
    const snapshot = await getDocs(q);
    const items: T[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      items.push({ ...data, id: docSnap.id } as T);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createClinicDoc(
  clinicId: string,
  ownerUid: string,
  subcollection: ClinicSubcollection,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  const safeId = sanitizeId(docId);
  const path = `clinics/${clinicId}/${subcollection}/${safeId}`;
  const sanitized = sanitizeEntityPayload(subcollection, clinicId, ownerUid, safeId, data);

  try {
    await setDoc(doc(db, 'clinics', clinicId, subcollection, safeId), {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateClinicDoc(
  clinicId: string,
  ownerUid: string,
  subcollection: ClinicSubcollection,
  docId: string,
  fullUpdatedItem: Record<string, any>
): Promise<void> {
  const safeId = sanitizeId(docId);
  const path = `clinics/${clinicId}/${subcollection}/${safeId}`;
  const sanitized = sanitizeEntityPayload(subcollection, clinicId, ownerUid, safeId, fullUpdatedItem);
  // Remove immutable keys for updateDoc so affectedKeys().hasOnly() strictly passes
  const { id: _id, clinicId: _clinicId, ownerId: _ownerId, ...mutableFields } = sanitized;

  try {
    await updateDoc(doc(db, 'clinics', clinicId, subcollection, safeId), {
      ...mutableFields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Allows a linked Dentista to update only their own permitted progress fields
 * (evaluations, closures, currentEarnings) matching Firestore security rules.
 */
export async function updateDoctorProgressAsDentista(
  clinicId: string,
  doctorId: string,
  fields: {
    evaluations?: number;
    closures?: number;
    currentEarnings?: number;
  }
): Promise<void> {
  const safeId = sanitizeId(doctorId);
  const path = `clinics/${clinicId}/doctors/${safeId}`;
  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };
  if (fields.evaluations !== undefined) {
    payload.evaluations = clampNumber(fields.evaluations, 0);
  }
  if (fields.closures !== undefined) {
    payload.closures = clampNumber(fields.closures, 0);
  }
  if (fields.currentEarnings !== undefined) {
    payload.currentEarnings = clampNumber(fields.currentEarnings, 0);
  }

  try {
    await updateDoc(doc(db, 'clinics', clinicId, 'doctors', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteClinicDoc(
  clinicId: string,
  subcollection: ClinicSubcollection,
  docId: string
): Promise<void> {
  const safeId = sanitizeId(docId);
  const path = `clinics/${clinicId}/${subcollection}/${safeId}`;
  try {
    await deleteDoc(doc(db, 'clinics', clinicId, subcollection, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertClinicMonthlyGoal(
  clinicId: string,
  ownerUid: string,
  val: number
): Promise<void> {
  const path = `clinics/${clinicId}/config/monthly_goal`;
  const docRef = doc(db, 'clinics', clinicId, 'config', 'monthly_goal');
  const clamped = clampNumber(val, 0);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        val: clamped,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id: 'monthly_goal',
        clinicId: sanitizeId(clinicId),
        ownerId: sanitizeId(ownerUid),
        val: clamped,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function clearAllClinicData(
  clinicId: string,
  ownerUid: string
): Promise<void> {
  const safeClinicId = sanitizeId(clinicId);
  const safeOwnerUid = sanitizeId(ownerUid);
  const subcollections: ClinicSubcollection[] = [
    'transactions',
    'doctors',
    'supplies',
    'goals',
    'teamMembers',
    'config',
  ];

  for (const sub of subcollections) {
    const existingDocs = await loadClinicCollection<{ id: string }>(safeClinicId, sub);
    if (existingDocs.length > 0) {
      const delBatch = writeBatch(db);
      for (const item of existingDocs) {
        delBatch.delete(doc(db, 'clinics', safeClinicId, sub, item.id));
      }
      try {
        await delBatch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `clinics/${safeClinicId}/${sub}`);
      }
    }
  }

  // Write clean-slate marker and zero monthly goal so fictional seed data never returns
  const initBatch = writeBatch(db);
  initBatch.set(doc(db, 'clinics', safeClinicId, 'config', 'clean_slate_v1'), {
    id: 'clean_slate_v1',
    clinicId: safeClinicId,
    ownerId: safeOwnerUid,
    val: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  initBatch.set(doc(db, 'clinics', safeClinicId, 'config', 'monthly_goal'), {
    id: 'monthly_goal',
    clinicId: safeClinicId,
    ownerId: safeOwnerUid,
    val: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await initBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `clinics/${safeClinicId}/config`);
  }
}
