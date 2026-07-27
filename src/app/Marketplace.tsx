import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingCart, Search, Bell, Star, Plus, Minus, X,
  Home, Compass, ClipboardList, User, Store, Heart,
  Package, Trash2, CheckCircle2, Clock, MapPin, ChevronRight,
  Tag,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import ProfileView from "./views/ProfileView";
import { getProductsPage, getCategories, getSellers } from "../firebase/productService";
import { getWishlist, addWishlist, removeWishlist } from "../firebase/wishlistService";
import { getCartlist, addCartlist, removeCartlist, createOrder } from "../firebase/cartService";
import { getUser, notifications as getNotifications, notificationsSeller as getNotificationsSeller } from "../firebase/userService";
import type { Product, CartItem, AppView, Category, Seller } from "./types";
import { getSellerByOwner } from "../firebase/sellerService";
import { getOrdersByUser } from "../firebase/orderService";


// ─── Utilities ────────────────────────────────────────────────────────────────

const fmt = (price: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(price);

function StarsRow({ rating, count }: { rating?: number; count?: number }) {
  const display = Number.isFinite(rating as number) ? (rating as number).toFixed(1) : "0.0";
  return (
    <span className="flex items-center gap-1">
      <Star size={11} className="fill-amber-400 text-amber-400" />
      <span className="text-xs font-semibold text-foreground">{display}</span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </span>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function Marketplace() {
  const [view, setView] = useState<AppView>("home");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredSellers, setFeaturedSellers] = useState<Seller[]>([]);
  const [sellerData, setSellerData] = useState<any>(null);
  const { user, loading, logout } = useAuth();
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openRegisterBusinessForm, setOpenRegisterBusinessForm] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);


  //user
  useEffect(() => {

    if (!user) {
      setSellerData(null);
      return;
    }
    const uid = user.uid;

    async function loadInfoUser() {

      const pedidos = await getOrdersByUser(uid);

      console.log("pedidos: \n", pedidos);


      const ordersData = pedidos.map((pedido: any) => ({
        id: pedido.humanId,
        product: pedido.items?.length > 0
          ? `${pedido.items[0].name}${pedido.items.length > 1 ? ` +${pedido.items.length - 1}` : ""}`
          : "Sin producto",
        seller: pedido.seller || "Vendedor desconocido",
        sellerPhone: pedido.sellerPhone || "N/A",
        status: pedido.status || "PENDING",
        statusLabel: getStatusLabel(pedido.status),
        date: pedido.date || "Fecha no disponible",
        price: pedido.price || 0,
        image: pedido.items?.[0]?.image ?? "",
        itemCount: pedido.items?.length || 0,
        allItems: pedido.items || [],
      }));

      setOrders(ordersData);

      const userData = await getUser(uid);

      if (userData) {
        (user as any).major = userData.career ?? undefined;
        (user as any).semester = userData.semester ?? undefined;
        (user as any).seller = userData.seller ?? false;

      }

      if (userData?.seller === undefined) {
        (user as any).seller = false;
      }

      if (userData?.seller === true) {
        const sellerProfile = await getSellerByOwner(uid);
        (user as any).sellerData = sellerProfile;
        setSellerData(sellerProfile);
        console.log("Datos del vendedor:", sellerProfile);
      } else {
        setSellerData(null);
      }
    }

    loadInfoUser();

  }, [user]);

  // wishlist
  useEffect(() => {

    if (!user) return;
    const uid = user.uid;

    async function loadWishlist() {

      const favs = await getWishlist(uid);

      setWishlist(favs);

    }

    loadWishlist();

  }, [user]);

  // Notifications
  useEffect(() => {

    if (!user) {
      setNotifications([]);
      return;
    }

    const uid = user.uid;
    setLoadingNotifications(true);

    async function loadNotificationsList() {
      try {
        const sellerId = sellerData?.id ?? (typeof sellerData === "string" ? sellerData : undefined);
        const notifs = sellerId ? await getNotificationsSeller(sellerId) : await getNotifications(uid);
        setNotifications(notifs);
      } catch (err) {
        console.error("Error loading notifications:", err);
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    }

    loadNotificationsList();

  }, [user, sellerData]);

  // Cart
  useEffect(() => {

    if (!user) {
      setCart([]);
      return;
    }

    if (view !== "home" || products.length === 0) return;

    async function loadCart() {
      try {
        const cartItems = await getCartlist(user!.uid);
        if (cartItems.length === 0) {
          setCart([]);
          return;
        }

        setCart((prev) =>
          cartItems
            .map((entry: any) => {
              // support multiple shapes: string id or object { id/productId, quantity/qty }
              const productId = typeof entry === "string" ? entry : entry.productId ?? entry.id;
              const qty = typeof entry === "string" ? 1 : entry.quantity ?? entry.qty ?? 1;

              const product = products.find((p) => p.id === productId);
              if (!product) return null;
              return { product, qty };
            })
            .filter((item): item is CartItem => item !== null)
        );
        // console.log("caritems: ", cartItems);

      } catch (err) {
        console.error("Error loading cart from firestore", err);
      }
    }

    loadCart();

  }, [user, view, products]);

  // Products
  useEffect(() => {

    async function loadData() {

      try {

        const [productsData, categoriesData, sellersData] =
          await Promise.all([
            getProductsPage(activeCategory),
            getCategories(),
            getSellers()
          ]);
        setProducts(productsData.products);
        setLastDoc(productsData.lastDoc);
        setCategories(categoriesData);
        setFeaturedSellers(sellersData);

      } catch (error) {

        console.error(error);

      } finally {

        setLoadingProducts(false);

      }

    }

    loadData();

  }, []);

  // Products Category
  useEffect(() => {

    async function reloadProducts() {

      const result = await getProductsPage(activeCategory);

      setProducts(result.products);
      setLastDoc(result.lastDoc);

    }

    reloadProducts();

  }, [activeCategory]);

  useEffect(() => {
    if (view !== "profile" || !openRegisterBusinessForm) return;

    const timeout = window.setTimeout(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const target = buttons.find((button) =>
        button.textContent?.trim().startsWith("Registrar mi negocio")
      );

      if (target) {
        target.click();
        setOpenRegisterBusinessForm(false);
      }
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [view, openRegisterBusinessForm]);

  if (loadingProducts) {

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh"
        }}
      >
        Cargando productos...
      </div>
    );

  }



  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  const addToCart = async (product: Product) => {
    setCart((prev) => {
      const hit = prev.find((i) => i.product.id === product.id);
      if (hit) return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);

      return [...prev, { product, qty: 1 }];
    });

    if (!user) return;
    try {
      const existing = cart.find(i => i.product.id === product.id);
      const newQty = existing ? existing.qty + 1 : 1;
      await addCartlist(user.uid, product.id, newQty);
    } catch (err) {
      console.error("Error updating cart in firestore", err);
    }
  };

  const updateQty = async (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i.product.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter((i) => i.qty > 0)
    );

    if (!user) return;

    try {
      const item = cart.find(i => i.product.id === id);
      const newQty = item ? item.qty + delta : delta;
      if (newQty > 0) {
        await addCartlist(user.uid, id, newQty);
      } else {
        await removeCartlist(user.uid, id);
      }
    } catch (err) {
      console.error("Error syncing cart qty with firestore", err);
    }
  };

  const toggleWishlist = async (productId: string) => {

    if (!user) return;

    if (wishlist.includes(productId)) {

      await removeWishlist(user.uid, productId);

      setWishlist(prev =>
        prev.filter(id => id !== productId)
      );

    } else {

      await addWishlist(user.uid, productId);

      setWishlist(prev => [...prev, productId]);

    }

  };

  const placeOrder = async () => {
    // Agrupar los ítems del carrito por vendedor y crear un pedido por vendedor
    const grouped: Record<string, { productId: string; qty: number; price: number; image: string; name: string }[]> = {};

    cart.forEach(ci => {
      const sellerId = ci.product.sellerId || 'unknown';
      if (!grouped[sellerId]) grouped[sellerId] = [];
      grouped[sellerId].push({
        productId: ci.product.id,
        qty: ci.qty,
        price: ci.product.price,
        image: ci.product.image,
        name: ci.product.name
      });
    });

    try {
      // Crear una orden por cada vendedor
      const orderPromises = Object.entries(grouped).map(([sellerId, items]) =>
        createOrder(user!.uid, sellerId, items)
      );

      const createdOrderIds = await Promise.all(orderPromises);
      console.log('Orders created:', createdOrderIds);

      // si todo sale bien, eliminar los items del carrito en Firestore
      try {
        const currentCart = [...cart];
        await Promise.all(currentCart.map(ci =>
          removeCartlist(user!.uid, ci.product.id)
        ));
      } catch (rmErr) {
        console.error('Error removing cart items:', rmErr);
      }

      setOrderPlaced(true);
      setCart([]);
      setCartOpen(false);
      setTimeout(() => setOrderPlaced(false), 3500);
    } catch (error) {
      console.error('Error placing orders:', error);
    }
  };

  const filteredProducts = products.filter((p) => {

    const q = searchQuery.toLowerCase();

    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.seller.toLowerCase().includes(q)
    );

  });


  const loadMore = async () => {


    if (!lastDoc) return;
    // console.log("lastDoc actual:", lastDoc?.id);

    setLoadingMore(true);

    try {

      const result = await getProductsPage(activeCategory, lastDoc);

      setProducts(prev => [
        ...prev,
        ...result.products
      ]);

      setLastDoc(result.lastDoc);

    } finally {

      setLoadingMore(false);

    }

  };

  const profileUser = user
    ? {
      uid: user.uid,
      displayName: user.displayName ?? undefined,
      email: user.email ?? undefined,
      phone: (user as any).phone ?? undefined,
      major: (user as { major?: string }).major ?? undefined,
      photoURL: user.photoURL ?? undefined,
      semester: (user as { semester?: string }).semester ?? undefined,
      seller: (user as { seller?: boolean }).seller ?? false
    }
    : undefined;

  const isHome = view === "home";
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "22px",
        }}
      >
        Cargando...
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">

      {/* ───── Header ───── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <button
            onClick={() => setView("home")}
            className="flex items-center gap-2 shrink-0 mr-1"
          >
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <Store size={15} className="text-primary-foreground" />
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-sm font-bold text-foreground font-display">Mercado UTS</p>
              <p className="text-[10px] text-muted-foreground">Unidades Tecnologicas de Santander</p>
            </div>
          </button>

          {/* Search */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar productos o vendedores…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (view !== "home") setView("home"); }}
              className="w-full h-9 pl-9 pr-3 bg-secondary text-sm rounded-xl border border-transparent focus:border-primary/40 focus:outline-none transition placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Bell */}
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative p-2 hover:bg-secondary rounded-xl transition shrink-0"
          >
            <Bell size={19} className="text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
          </button>

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 hover:bg-secondary rounded-xl transition shrink-0"
          >
            <ShoppingCart size={19} className="text-foreground" />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={logout}
            className="px-3 py-2 rounded-xl bg-primary text-white text-sm"
          >
            Salir
          </button>
        </div>
      </header>

      {/* ───── Category Bar (home only) ───── */}
      {isHome && (
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-2.5 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 ${activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-foreground hover:bg-muted"
                    }`}
                >
                  <span className="text-base leading-none">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───── Main ───── */}
      <main className="max-w-5xl mx-auto px-4 pb-28 sm:pb-10">

        {/* ── Home View ── */}
        {isHome && (
          <>
            {/* Hero Banner */}
            {activeCategory === "all" && !searchQuery && (
              <div className="mt-4 mb-5 relative overflow-hidden rounded-3xl h-48 sm:h-64 bg-amber-100">
                <img
                  src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&h=500&fit=crop&auto=format"
                  alt="Mercado universitario con variedad de productos"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-foreground/75 via-foreground/35 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end px-6 pb-6">
                  <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest mb-1">
                    Bienvenido al
                  </p>
                  <h1 className="font-display text-white text-2xl sm:text-4xl font-bold leading-tight">
                    Mercado<br className="sm:hidden" /> Universitario
                  </h1>
                  <p className="text-white/75 text-xs sm:text-sm mt-1.5 max-w-xs leading-relaxed">
                    Apoya a los microempresarios de tu campus
                  </p>
                </div>
                <div className="absolute top-4 right-4 bg-accent text-accent-foreground text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Tag size={9} />
                  {products.length} productos
                </div>
              </div>
            )}

            {/* Section heading */}
            <div className="flex items-baseline justify-between mb-4 mt-2">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {searchQuery
                  ? `Resultados para "${searchQuery}"`
                  : activeCategory === "all"
                    ? "Productos destacados"
                    : categories.find((c) => c.id === activeCategory)?.label ?? ""}
              </h2>
              <span className="text-xs text-muted-foreground">
                {filteredProducts.length} {filteredProducts.length === 1 ? "producto" : "productos"}
              </span>
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package size={40} className="text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground font-medium">No se encontraron productos</p>
                <p className="text-muted-foreground text-sm mt-1">Intenta con otra búsqueda o categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="relative bg-muted aspect-[4/3] overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.badge && (
                        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {product.badge}
                        </span>
                      )}
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition shadow-sm"
                        aria-label={wishlist.includes(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                      >
                        <Heart
                          size={12}
                          className={wishlist.includes(product.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}
                        />
                      </button>
                    </div>

                    <div className="p-3">
                      <p className="text-[10px] text-muted-foreground truncate leading-none mb-1">{product.seller}</p>
                      <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 mb-2 min-h-[2.5em]">
                        {product.name}
                      </p>
                      <StarsRow rating={product.rating} count={product.reviews} />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-primary">{fmt(product.price)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition active:scale-90 shadow-sm"
                          aria-label={`Agregar ${product.name} al carrito`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}


            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 30
              }}
            >

              <button
                onClick={loadMore}
                disabled={loadingMore || !lastDoc}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-2xl hover:bg-primary/90 transition active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >

                {loadingMore
                  ? "Cargando..."
                  : "Ver más"}

              </button>

            </div>

            {/* Featured Sellers */}
            {activeCategory === "all" && !searchQuery && (
              <section className="mt-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Vendedores Destacados</h2>
                  <button className="text-xs text-primary font-medium hover:underline">Ver todos</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {featuredSellers.map((seller) => (
                    <button
                      key={seller.name}
                      className="flex-shrink-0 flex flex-col items-center gap-2 group"
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted border border-border group-hover:shadow-md transition-shadow">
                        <img src={seller.image} alt={seller.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="text-center w-16">
                        <p className="text-[11px] font-semibold text-foreground truncate leading-tight">{seller.name}</p>
                        <p className="text-[10px] text-muted-foreground">{seller.tag}</p>
                        <StarsRow rating={seller.rating} />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Seller CTA */}
            {activeCategory === "all" && !searchQuery && !(user as any)?.seller && (
              <div className="mt-6 p-5 bg-gradient-to-br from-secondary to-muted rounded-3xl border border-border flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-base font-bold text-foreground">¿Tienes un negocio?</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Registra tu microempresa y empieza a vender en el campus hoy mismo.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setView("profile");
                    setOpenRegisterBusinessForm(true);
                  }}
                  className="shrink-0 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-2xl hover:bg-primary/90 transition active:scale-95 whitespace-nowrap shadow-sm"
                >
                  Registrarse
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Orders View ── */}
        {view === "orders" && (
          <div className="pt-6">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Mis Pedidos</h2>
            <p className="text-sm text-muted-foreground mb-6">{orders.length} pedidos en total</p>

            {/* Active orders */}
            {orders.filter((o) => o.status === "ready").length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activos</p>
                <div className="flex flex-col gap-2">
                  {orders.filter((o) => o.status === "ready").map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Past orders */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Historial</p>
              <div className="flex flex-col gap-2">
                {orders.filter((o) => o.status !== "ready").map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Profile View ── */}
        {view === "profile" && <ProfileView user={profileUser} wishlist={wishlist} view="profile" />}
      </main>

      {/* ───── Bottom Navigation (mobile) ───── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-background/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
        <div className="flex">
          {(
            [
              { id: "home" as AppView, icon: Home, label: "Inicio" },
              { id: null, icon: Compass, label: "Explorar" },
              { id: "orders" as AppView, icon: ClipboardList, label: "Pedidos" },
              { id: "profile" as AppView, icon: User, label: "Perfil" },
            ] as const
          ).map(({ id, icon: Icon, label }) => {
            const active = id === null ? isHome : view === id;
            return (
              <button
                key={label}
                onClick={() => {
                  if (id === null) { setView("home"); setActiveCategory("all"); setSearchQuery(""); }
                  else setView(id);
                }}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[9px] font-semibold tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ───── Desktop Tab Nav (sm+, top right of header area) ───── */}
      <div className="hidden sm:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-lg px-2 py-1.5 gap-1">
        {(
          [
            { id: "home" as AppView, icon: Home, label: "Inicio" },
            { id: "orders" as AppView, icon: ClipboardList, label: "Pedidos" },
            { id: "profile" as AppView, icon: User, label: "Perfil" },
          ] as const
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${view === id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {notificationsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setNotificationsOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-background shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-display text-lg font-bold">
                  Notificaciones
                </h2>

                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="p-2 hover:bg-secondary rounded-xl transition"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Cargando notificaciones...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground px-6 py-10 gap-3">
                    <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
                      <Bell size={26} />
                    </div>
                    <p className="font-semibold text-foreground">Aún no tienes notificaciones.</p>
                    <p className="text-sm">Las nuevas alertas aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="space-y-3 p-4">
                    {notifications.map((item) => {
                      const title = item.title ?? item.message ?? item.subject ?? "Notificación";
                      const body = item.body ?? item.text ?? "";
                      const createdAt = item.createdAt?.toDate
                        ? item.createdAt.toDate().toLocaleString("es-CO")
                        : typeof item.createdAt === "string"
                          ? item.createdAt
                          : item.createdAt
                            ? new Date(item.createdAt).toLocaleString("es-CO")
                            : "";
                      return (
                        <div key={item.id} className="bg-card border border-border rounded-3xl p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-semibold text-foreground">{title}</p>
                            {createdAt && (
                              <span className="text-[10px] text-muted-foreground">{createdAt}</span>
                            )}
                          </div>
                          {body && <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ───── Cart Drawer ───── */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-background shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Mi Carrito</h2>
                  {cartCount > 0 && (
                    <p className="text-xs text-muted-foreground">{cartCount} {cartCount === 1 ? "producto" : "productos"}</p>
                  )}
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-2 hover:bg-secondary rounded-xl transition"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 gap-3">
                    <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
                      <ShoppingCart size={26} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">Carrito vacío</p>
                      <p className="text-muted-foreground text-sm mt-0.5">Agrega productos para continuar</p>
                    </div>
                  </div>
                ) : (
                  cart.map(({ product, qty }) => (
                    <div key={product.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">{product.seller}</p>
                        <p className="text-sm font-semibold text-foreground truncate leading-tight">{product.name}</p>
                        <p className="text-sm font-bold text-primary mt-0.5">{fmt(product.price * qty)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateQty(product.id, -1)}
                          className="w-7 h-7 bg-secondary rounded-full flex items-center justify-center hover:bg-muted transition"
                          aria-label="Disminuir cantidad"
                        >
                          {qty === 1
                            ? <Trash2 size={11} className="text-muted-foreground" />
                            : <Minus size={11} />}
                        </button>
                        <span className="w-5 text-center text-sm font-bold">{qty}</span>
                        <button
                          onClick={() => updateQty(product.id, 1)}
                          className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="px-5 py-4 border-t border-border shrink-0 bg-background">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <span className="text-sm font-semibold text-foreground">{fmt(cartTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Entrega en campus</span>
                    <span className="text-sm font-semibold text-green-600">Gratis</span>
                  </div>
                  <div className="flex items-center justify-between mb-5 pt-3 border-t border-border">
                    <span className="font-display text-base font-bold text-foreground">Total</span>
                    <span className="font-display text-xl font-bold text-foreground">{fmt(cartTotal)}</span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setPlacingOrder(true);
                        await placeOrder();
                      } finally {
                        setPlacingOrder(false);
                      }
                    }}
                    disabled={placingOrder}
                    className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 transition active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {placingOrder ? "Creando orden..." : "Realizar Pedido"}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ───── Product Detail Sheet ───── */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setSelectedProduct(null)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-50 sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>

              {/* Image */}
              <div className="relative h-52 sm:h-60 bg-muted">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition shadow-sm"
                >
                  <X size={15} />
                </button>
                <button
                  onClick={() => toggleWishlist(selectedProduct.id)}
                  className="absolute top-3 left-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition shadow-sm"
                >
                  <Heart
                    size={14}
                    className={wishlist.includes(selectedProduct.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}
                  />
                </button>
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-display text-xl font-bold text-foreground leading-tight flex-1">
                    {selectedProduct.name}
                  </h3>
                  <span className="font-display text-xl font-bold text-primary shrink-0">
                    {fmt(selectedProduct.price)}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-2">{selectedProduct.seller}</p>

                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <StarsRow rating={selectedProduct.rating} count={selectedProduct.reviews} />
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={10} />
                    {selectedProduct.location}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {selectedProduct.description}
                </p>

                <button
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShoppingCart size={16} />
                  Agregar al Carrito
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ───── Order Placed Toast ───── */}
      <AnimatePresence>
        {orderPlaced && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-foreground text-background px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl"
          >
            <CheckCircle2 size={17} className="text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-bold">¡Pedido realizado!</p>
              <p className="text-xs opacity-70">Recibirás una notificación cuando esté listo</p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderItem {
  name?: string;
  image?: string;
  quantity?: number;
  price?: number;
}

interface OrderData {
  id: string;
  product: string;
  seller: string;
  sellerPhone: string;
  status: "READY" | "DELIVERED" | "PENDING" | "ACCEPTED" | "PREPARING" | "CANCELLED";
  statusLabel: string;
  date: string;
  price: number;
  image: string;
  itemCount: number;
  allItems: OrderItem[];
}

function OrderCard({ order }: { order: OrderData }) {
  const [expanded, setExpanded] = useState(false);
  const hasMultipleItems = order.itemCount > 1;

  // Validaciones
  if (!order?.id || !order?.product) {
    return null; // Evita renderizar órdenes inválidas
  }

  const handleToggleExpand = () => {
    if (hasMultipleItems) {
      setExpanded(!expanded);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header principal */}
      <div
        className={`flex items-center gap-3 p-4 ${hasMultipleItems ? "cursor-pointer hover:bg-muted/50" : ""} transition-colors`}
        onClick={handleToggleExpand}
      >
        {/* Imagen */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
          {order.image ? (
            <img src={order.image} alt={order.product} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Package size={20} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground font-mono">{order.id || "ID no disponible"}</p>
          <p className="text-sm font-semibold text-foreground truncate">{order.product}</p>
          <p className="text-xs text-muted-foreground truncate">
            {order.seller}
            {order.sellerPhone && order.sellerPhone !== "N/A" && ` - ${order.sellerPhone}`}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${order.status === "READY"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
                }`}
            >
              {order.status === "READY" ? <Clock size={9} /> : <CheckCircle2 size={9} />}
              {order.statusLabel || "Estado desconocido"}
            </span>
            <span className="text-[10px] text-muted-foreground">{order.date}</span>
            {hasMultipleItems && (
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                +{order.itemCount - 1} más
              </span>
            )}
          </div>
        </div>

        {/* Precio y chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-sm font-bold text-foreground pl-2">
            {fmt(order.price)}
          </p>
          {hasMultipleItems && (
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </div>

      {/* Items expandidos */}
      {expanded && hasMultipleItems && (
        <div className="border-t border-border bg-muted/30">
          <div className="p-3 space-y-2">
            {order.allItems && order.allItems.length > 0 ? (
              order.allItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-card rounded-lg">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name || "Producto"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package size={14} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name || "Producto sin nombre"}</p>
                    {item.quantity && item.quantity > 1 && (
                      <p className="text-[10px] text-muted-foreground">Cantidad: {item.quantity}</p>
                    )}
                  </div>
                  {item.price && item.price > 0 && (
                    <p className="text-xs font-semibold text-foreground shrink-0">
                      {fmt(item.price * (item.quantity || 1))}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No hay items disponibles</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
const getStatusLabel = (status: string) => {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "ACCEPTED":
      return "Aceptado";
    case "PREPARING":
      return "Preparando";
    case "READY":
      return "Listo para recoger";
    case "DELIVERED":
      return "Entregado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
};

