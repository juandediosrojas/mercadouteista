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

export async function notifications(uid: string) {
    const ref = collection(db, "users", uid, "notifications");
    // ordenar por fecha de creación (campo createdAt) descendente
    const q = query(ref, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);

    const items: any[] = [];

    snap.forEach(doc => items.push({ idusr: uid, id: doc.id, ...doc.data() }));

    return items;
}

export async function notificationsSeller(uid: string) {
    const ref = collection(db, "sellers", uid, "notifications");
    // ordenar por fecha de creación (campo createdAt) descendente
    const q = query(ref, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);

    const items: any[] = [];

    snap.forEach(doc => items.push({ idusr: uid, id: doc.id, ...doc.data() }));

    return items;
}

export async function markNotificationAsRead(
    uid: string,
    notificationId: string,
    notificationType: "buyer" | "seller",
    sellerData?: any
) {
    try {
        if (notificationType === "seller") {
            // Actualizar en la colección del vendedor
            const sellerId = sellerData?.id ?? (typeof sellerData === "string" ? sellerData : undefined);
            if (!sellerId) {
                throw new Error("Seller ID not found");
            }

            const ref = doc(db, "sellers", sellerId, "notifications", notificationId);
            await updateDoc(ref, {
                read: true,
                updatedAt: new Date()
            });
        } else {
            // Actualizar en la colección del comprador (usuario)
            const ref = doc(db, "users", uid, "notifications", notificationId);
            await updateDoc(ref, {
                read: true,
                updatedAt: new Date()
            });
        }
    } catch (err) {
        console.error("Error updating notification:", err);
        throw err;
    }
}