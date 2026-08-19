import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getSellerByOwner } from "../../firebase/sellerService";
import { getCategories, getProductsBySeller, setProduct, disableProduct, updateProducto } from "../../firebase/productService";
import { Product, User } from "../types";
import { getUser } from "../../firebase/userService";
import { updateImage } from "../../firebase/storageService";
import { getOrdersBySeller, statusChange } from "../../firebase/orderService";
import Swal from "sweetalert2";

type ViewType = "dashboard" | "products" | "edit";

interface Seller {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: string;
  location?: string;
  schedule?: string;
  imageUrl?: string;
}

interface ProductForm {
  id?: string;
  name: string;
  stock: number;
  price: number;
  description: string;
  categoryId: string;
  status: string;
  active: boolean;
  image: string;
}

interface SellerDashboardProps {
  uid: string;
  onBack: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 UTILIDADES (NUEVO)
// ═══════════════════════════════════════════════════════════════════════════

/** Formatea moneda en formato USD */
const formatCurrency = (value: number): string => {
  return `$ ${new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(value)}`;
};

/** Parsea una fecha de Firestore */
const parseFirebaseDate = (dateObj: any): Date | null => {
  if (!dateObj) return null;
  
  if (typeof dateObj.toDate === 'function') {
    return dateObj.toDate();
  }
  
  if (dateObj.seconds !== undefined) {
    return new Date(
      dateObj.seconds * 1000 + Math.round((dateObj.nanoseconds || 0) / 1e6)
    );
  }
  
  if (dateObj instanceof Date) return dateObj;
  
  return null;
};

/** Formatea fecha para mostrar */
const formatDate = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return "-";
  
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

/** Traduce estado de orden */
const translateOrderStatus = (status: string): string => {
  const translations: Record<string, string> = {
    "PENDING": "Pendiente",
    "ATTENDING": "Atendiendo",
    "READY_FOR_PICKUP": "Listo para recoger",
    "COMPLETED": "Completado",
    "CANCELLED": "Cancelado"
  };
  return translations[status] || status;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  stock: 0,
  price: 0,
  description: "",
  status: "active",
  categoryId: "",
  active: true,
  image: "",
};

const SellerDashboard: React.FC<SellerDashboardProps> = ({ uid, onBack }) => {
  // ─ Estado principal ─────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [seller, setSeller] = useState<Seller>({} as Seller);
  const [userData, setUserData] = useState<User>({} as User);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─ Estado de formulario ─────────────────────────────────────────────────
  const [formData, setFormData] = useState<ProductForm>(EMPTY_FORM);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageProgress, setImageProgress] = useState<number | null>(null);

  // ─ Estado de modal ──────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 HANDLERS - Cambio de estado de orden (IMPORTANTE: ACTUALIZA ESTADO LOCAL)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    try {
      // 1. Actualizar en Firebase
      await statusChange(orderId, newStatus);

      // 2. ✅ ACTUALIZAR ESTADO LOCAL INMEDIATAMENTE (CLAVE)
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      Swal.fire({
        icon: "success",
        title: "Estado actualizado",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error) {
      console.error("Error al actualizar:", error);
      Swal.fire({
        icon: "error",
        title: "Error al actualizar el pedido",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2500,
      });
    }
  }, []);

  // ─ Ver items del pedido ─────────────────────────────────────────────────
  const handleViewItems = useCallback((order: any) => {
    setSelectedOrder(order);
    setShowModal(true);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📦 HANDLERS - Productos
  // ═══════════════════════════════════════════════════════════════════════════
  const handleNewProduct = useCallback(() => {
    setFormData(EMPTY_FORM);
    setEditingProduct(null);
    setCurrentView("edit");
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    const productForm: ProductForm = {
      id: product.id,
      name: product.name,
      stock: (product as any).stock ?? 0,
      price: product.price,
      status: product.active ? "active" : "inactive",
      active: product.active ?? true,
      image: product.image || "",
      description: product.description || "",
      categoryId: product.categoryId || "",
    };

    setFormData(productForm);
    setEditingProduct(productForm);
    setCurrentView("edit");
  }, []);

  const handleDeleteProduct = useCallback((id: string) => {
    Swal.fire({
      title: "¿Estás seguro de inactivar el producto?",
      text: "¡Esto no permitirá que se muestre en la tienda!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, inactivar",
      cancelButtonText: "Cancelar"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await disableProduct(id);
          
          // ✅ Actualizar estado local
          setProducts((prevProducts) =>
            prevProducts.map((p) =>
              p.id === id ? { ...p, active: false } : p
            )
          );

          Swal.fire({
            title: "¡Inactivado!",
            text: "El producto ha sido inactivado correctamente.",
            icon: "success"
          });
        } catch (error) {
          console.error("Error al desactivar el producto:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo inactivar el producto. Inténtalo de nuevo."
          });
        }
      }
    });
  }, []);

  const handleSaveProduct = useCallback(async () => {
    // Validación
    if (!formData.name.trim() || formData.price <= 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Por favor completa los campos requeridos"
      });
      return;
    }

    Swal.fire({
      title: 'Guardando Producto...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      if (editingProduct) {
        const updatedProduct: Product = {
          ...editingProduct,
          ...formData,
          category: categories.find((cat) => cat.id === formData.categoryId)?.label || "",
          id: editingProduct.id || `prod-${Date.now()}`,
          seller: seller.name,
          sellerId: seller.id,
          rating: 0,
          reviews: 0,
          badge: null,
          location: seller.location || ""
        };

        await updateProducto(updatedProduct);
        setProducts(
          products.map((p) => (p.id === editingProduct.id ? updatedProduct : p))
        );
      } else {
        const newProduct: Product = {
          id: `prod-${Date.now()}`,
          name: formData.name,
          price: formData.price,
          active: formData.active,
          seller: seller.name,
          stock: formData.stock,
          category: categories.find((cat) => cat.id === formData.categoryId)?.label || "",
          sellerId: seller.id,
          rating: 0,
          reviews: 0,
          badge: null,
          image: formData.image,
          description: formData.description,
          location: seller.location || "",
          categoryId: formData.categoryId || "",
        };

        await setProduct(newProduct);
        setProducts([...products, newProduct]);
      }

      Swal.close();
      Swal.fire({
        icon: "success",
        title: "¡Guardado!",
        text: `El producto se ha ${editingProduct ? "actualizado" : "creado"} con éxito.`,
        timer: 1500,
        showConfirmButton: false
      });

      setCurrentView("products");
      setFormData(EMPTY_FORM);
      setEditingProduct(null);
    } catch (error) {
      Swal.close();
      console.error("Error al guardar el producto:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar el producto. Por favor, intenta de nuevo."
      });
    }
  }, [formData, editingProduct, categories, products, seller]);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    setImageProgress(0);

    try {
      const { url } = await updateImage(
        file,
        formData.image || null,
        "products",
        (p) => setImageProgress(p)
      );
      setFormData((prev) => ({ ...prev, image: url }));
    } catch (err) {
      console.error("Error al subir imagen:", err);
      alert("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setImageUploading(false);
      setImageProgress(null);
      e.target.value = "";
    }
  }, [formData.image]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📡 EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Cargar datos del vendedor, órdenes y productos
  useEffect(() => {
    const loadSellerData = async () => {
      try {
        setLoading(true);
        const sellerData = await getSellerByOwner(uid);
        setSeller(sellerData as Seller);

        if (sellerData?.id) {
          const [pedidos, productsData, fetchedUser] = await Promise.all([
            getOrdersBySeller(sellerData.id),
            getProductsBySeller(sellerData.id),
            getUser(uid),
          ]);

          setOrders(pedidos);
          setProducts(productsData || []);
          if (fetchedUser) {
            setUserData(fetchedUser as User);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSellerData();
  }, [uid]);

  // Cargar categorías
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData.map((cat) => ({ id: cat.id, label: cat.label })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando categorías");
      }
    };

    loadCategories();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 💾 COMPUTED VALUES (useMemo para optimizar re-renders)
  // ═══════════════════════════════════════════════════════════════════════════

  const isFormDirty = useMemo(() => {
    return editingProduct
      ? JSON.stringify({ ...editingProduct }) !== JSON.stringify({ ...formData })
      : JSON.stringify(EMPTY_FORM) !== JSON.stringify({ ...formData });
  }, [editingProduct, formData]);

  const isNameValid = useMemo(() => formData.name.trim().length > 0, [formData.name]);
  const isPriceValid = useMemo(() => formData.price > 0, [formData.price]);
  const canSave = useMemo(() => isNameValid && isPriceValid && !imageUploading, [isNameValid, isPriceValid, imageUploading]);

  const activeProductsCount = useMemo(() => products.filter(p => p.active).length, [products]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 RENDER: Edit Product Modal
  // ═══════════════════════════════════════════════════════════════════════════
  if (currentView === "edit") {
    return (
      <div
        className="seller-edit-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) setCurrentView("products");
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "Arial, sans-serif",
          color: "#1f2937",
          background: "rgba(17, 24, 39, 0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <div
          className="seller-edit-content"
          style={{
            position: "relative",
            padding: 24,
            borderRadius: 16,
            background: "#ffffff",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            maxWidth: 600,
            width: "100%",
            maxHeight: "calc(100vh - 48px)",
            overflowY: "auto",
          }}
        >
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => {
              if (isFormDirty) {
                const confirmed = window.confirm("Tienes cambios sin guardar. ¿Seguro que quieres salir?");
                if (!confirmed) return;
              }
              setCurrentView("products");
            }}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              background: "transparent",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 24,
              lineHeight: 1,
              color: "#6b7280",
            }}
          >
            ×
          </button>

          <h1 style={{ marginTop: 0, marginBottom: 4 }}>
            {editingProduct ? "Editar producto" : "Nuevo producto"}
          </h1>
          <p style={{ marginTop: 0, marginBottom: 24, fontSize: 13, color: "#9ca3af" }}>
            Los campos marcados con * son obligatorios
          </p>

          {/* IMAGEN */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Imagen
            </label>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleImageChange({ target: { files: [file] } } as any);
              }}
              style={{
                position: "relative",
                width: "100%",
                height: 200,
                borderRadius: 10,
                border: formData.image ? "1px solid #d1d5db" : "2px dashed #d1d5db",
                background: "#f9fafb",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {formData.image ? (
                <>
                  <img
                    src={formData.image}
                    alt="Vista previa"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {!imageUploading && (
                    <button
                      onClick={() => setFormData({ ...formData, image: "" })}
                      title="Quitar imagen"
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 14,
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Sin imagen</div>
                  <div style={{ fontSize: 12 }}>Arrastra una imagen aquí o usa el botón de abajo</div>
                </div>
              )}

              {imageUploading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(255,255,255,0.85)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    Subiendo {imageProgress ?? 0}%
                  </span>
                  <div style={{ width: "60%", height: 6, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${imageProgress}%`,
                        background: "#34531F",
                        borderRadius: 99,
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <label
              style={{
                display: "inline-block",
                marginTop: 10,
                padding: "8px 16px",
                background: imageUploading ? "#e5e7eb" : "#34531F",
                color: imageUploading ? "#9ca3af" : "white",
                borderRadius: 8,
                cursor: imageUploading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
                userSelect: "none",
              }}
            >
              {formData.image ? "Cambiar imagen" : "Cargar imagen"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                disabled={imageUploading}
                onChange={handleImageChange}
              />
            </label>
          </div>

          {/* NOMBRE */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Nombre *
            </label>
            <input
              type="text"
              autoFocus
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Camiseta institucional talla M"
              style={{
                width: "100%",
                padding: 10,
                border: `1px solid ${!isNameValid && formData.name !== "" ? "#dc2626" : "#d1d5db"}`,
                borderRadius: 8,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* PRECIO Y STOCK */}
          <div className="seller-form-row" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                Precio *
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>
                  $
                </span>
                <input
                  type="number"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "10px 10px 10px 22px",
                    border: `1px solid ${!isPriceValid && formData.price !== 0 ? "#dc2626" : "#d1d5db"}`,
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                Stock
              </label>
              <input
                type="number"
                value={formData.stock || ""}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                min="0"
                placeholder="0"
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* CATEGORÍA */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Categoría
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
                boxSizing: "border-box",
                background: "white",
              }}
            >
              <option value="">Selecciona una categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* ESTADO */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Estado
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { value: true, label: "Activo", color: "#059669" },
                { value: false, label: "Inactivo", color: "#6b7280" },
              ].map((opt) => {
                const isSelected = formData.active === opt.value;

                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setFormData({ ...formData, active: opt.value })}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? opt.color : "#d1d5db"}`,
                      background: isSelected ? `${opt.color}15` : "white",
                      color: isSelected ? opt.color : "#6b7280",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe brevemente el producto..."
              maxLength={300}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
                boxSizing: "border-box",
                minHeight: 80,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {formData.description.length}/300
            </div>
          </div>

          {/* ACCIONES */}
          <div className="seller-edit-footer" style={{ display: "flex", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
            <button
              onClick={handleSaveProduct}
              disabled={!canSave}
              style={{
                flex: 1,
                padding: "12px 20px",
                background: canSave ? "#059669" : "#9ca3af",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: canSave ? "pointer" : "not-allowed",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {imageUploading ? "Espera a que termine la carga..." : "Guardar"}
            </button>
            <button
              onClick={() => setCurrentView("products")}
              style={{
                padding: "12px 20px",
                background: "#e5e7eb",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 RENDER: Dashboard Principal
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    loading ? (
      <div className="seller-dashboard-page" style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#1f2937" }}>
        <p>Cargando datos...</p>
      </div>
    ) : (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#1f2937" }}>
        {/* HEADER */}
        <header style={{ marginBottom: 24 }}>
          <p style={{ color: "#6b7280", marginBottom: 4 }}>Panel del vendedor</p>
          <h1 style={{ fontSize: 28, margin: 0 }}>{seller.name}</h1>
          <p style={{ color: "#4b5563", marginTop: 8 }}>
            Bienvenido, {userData.displayName}. Aquí puedes revisar el rendimiento de tu tienda y la información que llega desde el perfil.
          </p>
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-xl bg-secondary hover:bg-muted transition"
          >
            ← Volver
          </button>
        </header>

        {/* STATS */}
        <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 24 }}>
          <div style={{ padding: 18, borderRadius: 12, background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>Pedidos</p>
            <h2 style={{ margin: "12px 0 0", fontSize: 24 }}>{orders.length}</h2>
          </div>
          <div style={{ padding: 18, borderRadius: 12, background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>Productos activos</p>
            <h2 style={{ margin: "12px 0 0", fontSize: 24 }}>{activeProductsCount}</h2>
          </div>
        </section>

        {/* PERFIL */}
        <section style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginBottom: 24 }}>
          <div style={{ padding: 20, borderRadius: 16, background: "#ffffff", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Perfil</h2>
            <dl style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div>
                <dt style={{ color: "#6b7280" }}>Nombre</dt>
                <dd style={{ margin: 4, fontWeight: 600 }}>{userData.displayName}</dd>
              </div>
              <div>
                <dt style={{ color: "#6b7280" }}>Correo</dt>
                <dd style={{ margin: 4 }}>{userData.email}</dd>
              </div>
              {userData.phone && (
                <div>
                  <dt style={{ color: "#6b7280" }}>Teléfono</dt>
                  <dd style={{ margin: 4 }}>{userData.phone}</dd>
                </div>
              )}
              {seller.location && (
                <div>
                  <dt style={{ color: "#6b7280" }}>Ubicación</dt>
                  <dd style={{ margin: 4 }}>{seller.location}</dd>
                </div>
              )}
              <div>
                <dt style={{ color: "#6b7280" }}>Miembro desde</dt>
                <dd style={{ margin: 4 }}>
                  {formatDate(parseFirebaseDate(seller.createdAt))}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* TABLA DE ÓRDENES */}
        <section
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            marginBottom: 24
          }}
        >
          <div style={{ padding: 20, borderRadius: 16, background: "#ffffff", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <h2 style={{ marginTop: 0 }}>Pedidos recientes</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#6b7280" }}>
                    <th style={{ padding: "12px 10px" }}>Pedido</th>
                    <th style={{ padding: "12px 10px" }}>Cliente</th>
                    <th style={{ padding: "12px 10px" }}>Total</th>
                    <th style={{ padding: "12px 10px" }}>Estado</th>
                    <th style={{ padding: "12px 10px" }}>Fecha</th>
                    <th style={{ padding: "12px 10px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.map((order) => {
                      const date = parseFirebaseDate(order.createdAt);

                      return (
                        <tr key={order.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "12px 10px", fontWeight: 600 }}>
                            {order.humanId || order.id}
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            {order.buyer?.displayName || order.buyer?.email || "-"}
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            {formatCurrency(Number(order.total) || 0)}
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              style={{
                                padding: "6px 8px",
                                borderRadius: 4,
                                border: "1px solid #d1d5db",
                                fontSize: 13,
                                cursor: "pointer",
                                backgroundColor:
                                  order.status === "PENDING"
                                    ? "#fef3c7"
                                    : order.status === "ATTENDING"
                                      ? "#dbeafe"
                                      : "#d1fae5"
                              }}
                            >
                              <option value="PENDING">Pendiente</option>
                              <option value="ATTENDING">Atendiendo</option>
                              <option value="READY_FOR_PICKUP">Listo para recoger</option>
                              <option value="COMPLETED">Completado</option>
                            </select>
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            {formatDate(date)}
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => handleViewItems(order)}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  color: "#3b82f6",
                                  background: "#fff",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 500
                                }}
                              >
                                Ver items
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })

                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: "20px 10px", textAlign: "center", color: "#6b7280" }}>
                        No hay pedidos recientes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* MODAL DE ITEMS */}
        {showModal && selectedOrder && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              maxWidth: 500,
              maxHeight: "80vh",
              overflow: "auto"
            }}>
              <h3>{selectedOrder.humanId}</h3>
              <div style={{ marginBottom: 16 }}>
                {selectedOrder.items.map((item: any, idx: number) => (
                  <div key={idx} style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    <img 
                      src={item.image || ""} 
                      alt={item.name} 
                      style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} 
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>{item.name}</p>
                      <p style={{ margin: "0 0 4px 0", fontSize: 13, color: "#6b7280" }}>Cant: {item.qty}</p>
                      <p style={{ margin: 0, fontWeight: 600 }}>{formatCurrency(item.price * (item.qty || 0))}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "none",
                  background: "#3b82f6",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* TABLA DE PRODUCTOS */}
        <section
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            marginBottom: 24
          }}
        >
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              background: "#ffffff",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <div className="seller-dashboard-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 style={{ margin: 0 }}>Gestionar productos</h1>
              <button
                onClick={handleNewProduct}
                style={{
                  padding: "10px 20px",
                  background: "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                + Nuevo producto
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="seller-product-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#6b7280", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px 10px" }}>Imagen</th>
                    <th style={{ padding: "12px 10px" }}>Nombre</th>
                    <th style={{ padding: "12px 10px" }}>Precio</th>
                    <th style={{ padding: "12px 10px" }}>Stock</th>
                    <th style={{ padding: "12px 10px" }}>Estado</th>
                    <th style={{ padding: "12px 10px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "12px 10px" }}>
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 6,
                              background: "#f3f4f6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 18,
                            }}
                          >
                            📦
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 10px" }}>{product.name}</td>
                      <td style={{ padding: "12px 10px" }}>{formatCurrency(product.price)}</td>
                      <td style={{ padding: "12px 10px" }}>{(product as any).stock ?? 0}</td>
                      <td style={{ padding: "12px 10px", color: product.active === true ? "#047857" : "#dc2626" }}>
                        {product.active === true ? "Activo" : "Inactivo"}
                      </td>
                      <td style={{ padding: "12px 10px", display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleEditProduct(product)}
                          style={{
                            padding: "6px 12px",
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Editar
                        </button>
                        <button
                          disabled={!product.active}
                          onClick={() => handleDeleteProduct(product.id)}
                          style={{
                            padding: "6px 12px",
                            background: product.active ? "#dc2626" : "#9ca3af",
                            cursor: product.active ? "pointer" : "not-allowed",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          Inactivar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {products.length === 0 && (
              <p style={{ textAlign: "center", color: "#6b7280", paddingTop: 20 }}>
                No hay productos. Crea uno para comenzar.
              </p>
            )}
          </div>
        </section>
      </div>
    ));
};

export default SellerDashboard;
