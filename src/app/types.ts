export type Product = {
  id: string;
  name: string;
  seller: string;
  sellerId: string;
  category: string;
  categoryId: string;
  price: number;
  rating: number;
  reviews: number;
  badge: string | null;
  image: string;
  stock: number;
  description: string;
  location: string;
  active: boolean;
};

export type CartItem = {
  product: Product;
  qty: number;
};

export type AppView = "home" | "orders" | "profile";

export type Category = {
  id: string;
  label: string;
  emoji: string;
};

export type Seller = {
  id: string;
  name: string;
  tag: string;
  image: string;
  rating: number;
};


export type User = {
    uid?: string
    displayName?: string
    email?: string
    phone?: string
    major?: string
    semester?: string
    photoURL?: string
    seller?: boolean
}