import {firebaseConfig} from "../config";

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
//import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

import {
  getDoc as getDocFirebase,
  getDocs as getDocsFirebase,
  onSnapshot as onSnapshotFirebase,
  collection as collectionFirebase,
  doc as docFirebase,
  setDoc as setDocFirebase,
  addDoc as addDocFirebase,
  updateDoc as updateDocFirebase,
  deleteDoc as deleteDocFirebase,
  DocumentReference,
  DocumentData,
  CollectionReference,
  Unsubscribe,

  query as queryFirebase,
  where as whereFirebase,
  orderBy as orderByFirebase,
  limit as limitFirebase,
} from 'firebase/firestore'

type Query = ReturnType<typeof queryFirebase>;

// Initialize Firebase
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);
//const analytics = getAnalytics(app);
const storage = getStorage(app);

export default app;
export { db, auth, app, storage, Timestamp };

//-------------------firebase helpers-----------------------//
const convertTimestampToDateDocument = (obj: any) : any => {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => {
    if (value instanceof Timestamp) {
      return [key, value.toDate()];
    }
    return [key, value];
  }));
}

//------------------ firebase utilities ------------------ //

export const doc = (path: string, ...pathSegments: string[]) : DocumentReference<DocumentData, DocumentData> => docFirebase(db, path, ...pathSegments);
export const collection = (path: string, ...pathSegments: string[]) : CollectionReference<DocumentData, DocumentData> => collectionFirebase(db, path, ...pathSegments);

export const getDoc = async <T>(path: string, ...pathSegments: string[]) : Promise<T | null> => {
  const res = await getDocFirebase(doc(path, ...pathSegments));
  return res.exists() ? {id: res.id, ...convertTimestampToDateDocument(res.data() as any)} as T : null;
};
export const getCollection = async <T>(path: string, ...pathSegments: string[]) : Promise<T[]>=> {
  const res = await getDocsFirebase(collection(path, ...pathSegments));
  return res.docs.map(doc => ({id: doc.id, ...convertTimestampToDateDocument(doc.data() as any)})) as T[];
};
export const getCollectionQuery = async <T>(reference: Query) : Promise<T[]> => {
  const res = await getDocsFirebase(reference);
  return res.docs.map(doc => ({id: doc.id, ...convertTimestampToDateDocument(doc.data() as any)})) as T[];
}

export const onDoc = <T>(reference: DocumentReference<DocumentData, DocumentData>, callback: (snapshot: T | null) => void, errorCallback?: (error: Error) => void) : Unsubscribe => {
  return onSnapshotFirebase(reference, (snap) => {
    callback(snap.exists() ? {id: snap.id, ...convertTimestampToDateDocument(snap.data() as any)} as T : null);
  }, errorCallback);
};
export const onCollection = <T>(reference: CollectionReference<DocumentData, DocumentData>, callback: (snapshot: T[]) => void, errorCallback?: (error: Error) => void) : Unsubscribe => {
  return onSnapshotFirebase(reference, (snap) => {
    callback(snap.docs.map(doc => {
      return {id: doc.id, ...convertTimestampToDateDocument(doc.data() as any)} as T[];
    }) as T[]);
  }, errorCallback);
};
export const onCollectionQuery = <T>(reference: Query, callback: (snapshot: T[]) => void, errorCallback?: (error: Error) => void) : Unsubscribe => {
  return onSnapshotFirebase(reference, (snap) => {
    callback(snap.docs.map(doc => ({id: doc.id, ...convertTimestampToDateDocument(doc.data() as any)})) as T[]);
  }, errorCallback);
};

export const addDoc = addDocFirebase;
export const setDoc = setDocFirebase;
export const updateDoc = updateDocFirebase;
export const deleteDoc = deleteDocFirebase;
export const query = queryFirebase;
export const where = whereFirebase;
export const orderBy = orderByFirebase;
export const limit = limitFirebase;

//------------------ Time Tracking Helpers ------------------ //

export async function getRunningTimer(userId: string) {
  const q = query(
    collection('timeEntries'),
    where('userId', '==', userId),
    where('status', '==', 'running'),
    limit(1)
  );
  const entries = await getCollectionQuery(q);
  return entries.length > 0 ? entries[0] : null;
}

export async function stopRunningTimer(userId: string) {
  const runningTimer = await getRunningTimer(userId);
  if (runningTimer) {
    const now = new Date();
    const duration = Math.floor((now.getTime() - (runningTimer as any).startTime.getTime()) / 1000) - (runningTimer as any).pausedDuration;
    await updateDoc(doc('timeEntries', (runningTimer as any).id), {
      status: 'stopped',
      endTime: Timestamp.fromDate(now),
      duration,
      updatedAt: Timestamp.now()
    });
  }
}

export async function getTotalDuration(userId: string, startDate: Date, endDate: Date) {
  const q = query(
    collection('timeEntries'),
    where('userId', '==', userId),
    where('startTime', '>=', Timestamp.fromDate(startDate)),
    where('startTime', '<=', Timestamp.fromDate(endDate))
  );
  const entries = await getCollectionQuery(q);
  return entries.reduce((total: number, entry: any) => total + (entry.duration || 0), 0);
}

export async function getEntriesForMonth(userId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const q = query(
    collection('timeEntries'),
    where('userId', '==', userId),
    where('startTime', '>=', Timestamp.fromDate(startDate)),
    where('startTime', '<=', Timestamp.fromDate(endDate)),
    orderBy('startTime', 'desc')
  );
  return getCollectionQuery(q);
}