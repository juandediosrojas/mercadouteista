import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  getDoc
} from "firebase/firestore";

import { db } from "./config";


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
  const orders: Order[] = [];
  snap.forEach((docSnap) => orders.push({ id: docSnap.id, ...(docSnap.data() as any) }));
  return orders;
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  const q = query(ordersCollection, where('userId', '==', userId));
  const snap = await getDocs(q);
  const orders: Order[] = [];
  snap.forEach((docSnap) => orders.push({ id: docSnap.id, ...(docSnap.data() as any) }));
  return orders;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const d = doc(db, 'orders', orderId);
  const snap = await getDoc(d);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

export default {
  getOrders,
  getOrdersBySeller,
  getOrdersByUser,
  getOrderById,
};
