import {
  collection,
  getDocs,
  query,
  doc,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  updateDoc,
  setDoc
} from "firebase/firestore";
import { db } from "./config";
import { Product, Category, Seller } from "../app/types";

// export async function getProducts(): Promise<Product[]> {
//   console.log("Consultando productos...");

//   const snapshot = await getDocs(collection(db, "products"));

//   console.log("Cantidad:", snapshot.size);

//   return snapshot.docs.map(doc => ({
//     id: doc.id,
//     ...(doc.data() as Omit<Product, "id">),
//   }));
// }

export async function getProductsPage(
  category: string,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{
  products: Product[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}> {

  let q;

  if (category === "all") {

    q = lastDoc
      ? query(
        collection(db, "products"),
        where("active", "==", true),
        orderBy("name"),
        startAfter(lastDoc),
        limit(8)
      )
      : query(
        collection(db, "products"),
        where("active", "==", true),
        orderBy("name"),
        limit(8)
      );

  } else {

    q = lastDoc
      ? query(
        collection(db, "products"),
        where("categoryId", "==", category),
        where("active", "==", true),
        orderBy("name"),
        startAfter(lastDoc),
        limit(8)
      )
      : query(
        collection(db, "products"),
        where("categoryId", "==", category),
        where("active", "==", true),
        orderBy("name"),
        limit(8)
      );

  }

  const snapshot = await getDocs(q);

  return {
    products: snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Product, "id">)
    })),
    lastDoc:
      snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null
  };

}

export async function getCategories(): Promise<Category[]> {
  const snapshot = await getDocs(collection(db, "categories"));

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Category, "id">),
  }));
}

export async function getSellers(): Promise<Seller[]> {
  const snapshot = await getDocs(collection(db, "sellers"));

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Seller, "id">),
  }));
}

export async function getProductsByCategory(category: string): Promise<Product[]> {

  let q;

  if (category === "all") {

    q = collection(db, "products");

  } else {

    q = query(
      collection(db, "products"),
      where("categoryId", "==", category)
    );

  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Product, "id">)
  }));
}

export async function getProductsBySeller(sellerId: string): Promise<Product[]> {

  const q = query(
    collection(db, "products"),
    where("sellerId", "==", sellerId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Product, "id">)
  }));
}




export async function setProduct(product: Product): Promise<void> {
  const productRef = doc(db, "products", product.id);
  await setDoc(productRef, {
    ...product
  });
}

export async function disableProduct(idProducto: string): Promise<void> {
  try {
    const productRef = doc(db, "products", idProducto);

    await updateDoc(productRef, {
      active: false
    });

    console.log(`Producto ${idProducto} inactivado con éxito.`);
  } catch (error) {
    console.error("Error al inactivar el producto:", error);
    throw error; // Volvemos a lanzar el error por si tu interfaz necesita reaccionar a él
  }
}

export async function updateProducto(product: Product): Promise<void> {
  try {
    const productRef = doc(db, "products", product.id);

    await updateDoc(productRef, {
      ...product
    });

    console.log(`Producto ${product.id} actualizado con éxito.`);
  } catch (error) {
    console.error("Error al actualizar el producto:", error);
    throw error; // Volvemos a lanzar el error por si tu interfaz necesita reaccionar a él
  }
}