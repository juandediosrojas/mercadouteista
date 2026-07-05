import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from "firebase/firestore";

import { db } from "./config";

export async function getWishlist(uid: string): Promise<string[]> {

  const snapshot = await getDocs(
    collection(db, "users", uid, "wishlist")
  );

  return snapshot.docs.map(doc => doc.id);

}

export async function addWishlist(
  uid: string,
  productId: string
) {

  await setDoc(
    doc(db, "users", uid, "wishlist", productId),
    {
      createdAt: new Date()
    }
  );

}

export async function removeWishlist(
  uid: string,
  productId: string
) {

  await deleteDoc(
    doc(db, "users", uid, "wishlist", productId)
  );

}