import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "./config";
import { getUser } from "./userService";


export type Order = {
  id: string;
  userId: string;
  sellerId?: string;
  items: any[];
  total: number;
  status?: string;
  createdAt?: any;
  [key: string]: any;
};

const ordersCollection = collection(db, 'orders');

export async function getOrders(): Promise<Order[]> {
  const snap = await getDocs(ordersCollection);
  const orders: Order[] = [];
  snap.forEach((docSnap) => {
    orders.push({ id: docSnap.id, ...(docSnap.data() as any) });
  });
  return orders;
}

export async function getOrdersBySeller(sellerId: string): Promise<Order[]> {
  const q = query(ordersCollection, where('sellerId', '==', sellerId));
  const snap = await getDocs(q);

  const ordersWithUsers = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const orderData = docSnap.data() as any;
      const buyer = await getUser(orderData.buyerId);

      return {
        id: docSnap.id,
        ...orderData,
        buyer: buyer
      };
    })
  );

  return ordersWithUsers;
}

async function getSellerById(sellerId: string) {
  const sellerRef = doc(db, 'sellers', sellerId);
  const sellerSnap = await getDoc(sellerRef);
  if (!sellerSnap.exists()) return null;
  return sellerSnap.data();
}

function getDateDifference(createdAt: any): string | null {
  if (!createdAt) return null;
  const date = typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = new Date().getTime() - date.getTime();
  if (diffMs < 0) return null;

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} día${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hora${hours === 1 ? '' : 's'}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minuto${minutes === 1 ? '' : 's'}`);

  return parts.join(' ');
}

export async function getOrdersByUser(userId: string): Promise<any[]> {
  const q = query(ordersCollection, where('buyerId', '==', userId));
  const snap = await getDocs(q);
  const orders: any[] = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as any;
    const seller = data.sellerId ? await getSellerById(data.sellerId) : null;
    // const items = Array.isArray(data.items)
    //   ? data.items.map((item: any) => ({
    //       name: item.name,
    //       image: item.image,
    //     }))
    //   : [];
    const dateDiff = getDateDifference(data.createdAt);

    orders.push({
      id: docSnap.id,
      humanId: data.humanId,
      items: data.items,
      seller: seller!.name,
      sellerPhone: seller!.phone,
      status: data.status,
      date: dateDiff,
      price: data.total,
    });
  }
  return orders;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const d = doc(db, 'orders', orderId);
  const snap = await getDoc(d);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

export async function statusChange(orderId: string, status: string): Promise<void> {
  const d = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(d);
  if (!orderSnap.exists()) return;

  await setDoc(d, { status }, { merge: true });

  const orderData = orderSnap.data() as any;
  if (orderData.buyerId) {
    await addDoc(collection(db, 'users', orderData.buyerId, 'notifications'), {
      type: 'order_status_change',
      orderId,
      status,
      for: 'buyer',
      message: `El estado de tu pedido cambió a: ${status}`,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
}

export default {
  getOrders,
  getOrdersBySeller,
  getOrdersByUser,
  getOrderById,
  statusChange,
};
