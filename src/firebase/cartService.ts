import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from "firebase/firestore";

import { db } from "./config";

export type CartItem = {
  id: string;
  quantity?: number;
  createdAt?: any;
  [key: string]: any;
}

export async function getCartlist(uid: string): Promise<CartItem[]> {

  const snapshot = await getDocs(
    collection(db, "users", uid, "cart")
  );
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

}

export async function addCartlist(
  uid: string,
  productId: string,
  quantity: number
) {

  await setDoc(
    doc(db, "users", uid, "cart", productId),
    {
      createdAt: new Date(),
      quantity: quantity
    }
  );

}

export async function removeCartlist(
  uid: string,
  productId: string
) {

  await deleteDoc(
    doc(db, "users", uid, "cart", productId)
  );

}

export async function createOrder(
  buyerId: string,
  sellerId: string,
  items: Array<{ productId: string; qty: number; price: number; image: string; name: string }>
) {
  try {
    // create order in top-level 'orders' collection
    const orderId = doc(collection(db, "orders")).id;

    // generar identificador humano legible: ORD-YYYYMMDD-HHMMSS-XXXX
    const pad = (n: number) => n.toString().padStart(2, "0");
    const now = new Date();
    const humanId = `ORD-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${Math.floor(1000 + Math.random()*9000)}`;

    await setDoc(
      doc(db, "orders", orderId),
      {
        id: orderId,
        humanId,
        buyerId,
        sellerId,
        status: "PENDING",
        items,
        total: items.reduce((sum, item) => sum + (item.price * item.qty), 0),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    );
    
    // Agregar notificaciones tanto al comprador como al vendedor
    try {
      const notification = {
        id: orderId,
        orderId,
        humanId,
        type: "ORDER_CREATED",
        message: `Orden ${humanId} creada.`,
        read: false,
        createdAt: new Date()
      };

      // notificación para el comprador
      await setDoc(
        doc(db, "users", buyerId, "notifications", orderId),
        { ...notification, for: "buyer" }
      );

      // notificación para el vendedor
      await setDoc(
        doc(db, "sellers", sellerId, "notifications", orderId),
        { ...notification, for: "seller" }
      );
    } catch (notifError) {
      console.error("createOrder - notification error:", notifError);
      // No se relanza el error para no impedir la creación de la orden
    }

    return humanId;
  } catch (error) {
    console.error("createOrder error:", error);
    throw error;
  }
}

