import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    orderBy,
    setDoc,
    updateDoc,
    serverTimestamp
} from "firebase/firestore";

import { db } from "./config";

export async function getUser(uid: string) {

    const ref = doc(db, "users", uid);

    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return snap.data();

}

export async function createUser(user: any) {

    await setDoc(doc(db, "users", user.uid), {

        displayName: user.displayName,

        email: user.email,

        career: "",

        semester: "",

        photoURL: user.photoURL ?? "",

        seller: false,

        createdAt: serverTimestamp()

    });

}

export async function updateUser(uid: string, data: any) {

    await updateDoc(doc(db, "users", uid), data);

}

export async function updateUserProfile(uid: string, displayName: string, photoURL: string) {

    await updateDoc(doc(db, "users", uid), {
        displayName,
        photoURL
    });

}

export async function notifications(uid: string){
    const ref = collection(db, "users", uid, "notifications");
    // ordenar por fecha de creación (campo createdAt) descendente
    const q = query(ref, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);

    const items: any[] = [];

    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

    return items;
}

export async function notificationsSeller(uid: string){
    const ref = collection(db, "sellers", uid, "notifications");
    // ordenar por fecha de creación (campo createdAt) descendente
    const q = query(ref, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);

    const items: any[] = [];

    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

    return items;
}