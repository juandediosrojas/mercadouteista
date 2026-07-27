import React, { useState, useEffect } from "react";
import { getSellerByOwner } from "../../firebase/sellerService";
import { getCategories, getProductsBySeller, setProduct, disableProduct, updateProducto } from "../../firebase/productService";
import { Product, User } from "../types";
import { getUser } from "../../firebase/userService";
import { updateImage } from "../../firebase/storageService"; // ← cambiado a updateImage
import Swal from "sweetalert2";
import { connectStorageEmulator } from "firebase/storage";

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

const formatCurrency = (value: number) => {
  return `$ ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
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
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [seller, setSeller] = useState<Seller>({} as Seller);
  const [userData, setUserData] = useState<User>({} as User);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductForm>(EMPTY_FORM);

  // ── Estado de la subida de imagen ──────────────────────────────────────────
  const [imageUploading, setImageUploading] = useState(false);
  const [imageProgress, setImageProgress] = useState<number | null>(null);

  useEffect(() => {
    const loadSellerData = async () => {
      try {
        setLoading(true);
        const sellerData = await getSellerByOwner(uid);
        console.log("Datos del vendedor obtenidos:", sellerData);
        setSeller(sellerData as Seller);

        if (sellerData?.id) {
          const productsData = await getProductsBySeller(sellerData.id);
          console.log("Productos obtenidos:", productsData);
          setProducts((productsData) || []);
        }

        const fetchedUser = await getUser(uid);
        console.log("Datos del usuario obtenidos:", fetchedUser);
        if (fetchedUser) {
          setUserData(fetchedUser as User);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    };

    loadSellerData();
  }, [uid]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData.map((cat) => ({ id: cat.id, label: cat.label })));
        console.log("Categorías obtenidas:", categoriesData.map((cat) => ({ id: cat.id, label: cat.label })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando categorías");
      }
    };

    loadCategories();
  }, []);

  const handleNewProduct = () => {
    setFormData(EMPTY_FORM);
    setEditingProduct(null);
    setCurrentView("edit");
  };

  const handleEditProduct = (product: Product) => {
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
  };

  const handleDeleteProduct = (id: string) => {
    Swal.fire({
      title: "¿Estás seguro de inactivar el producto?",
      text: "¡Esto no permitirá que se muestre en la tienda!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, inactivar",
      cancelButtonText: "Cancelar"
    }).then(async (result) => { // Agregamos async aquí para poder usar await
      if (result.isConfirmed) {
        try {
          // 1. Intentamos actualizar en Firebase primero
          await disableProduct(id);

          // 2. Si Firebase responde bien, en lugar de quitarlo, actualizamos su propiedad 'active' a false
          setProducts((prevProducts) =>
            prevProducts.map((p) =>
              p.id === id ? { ...p, active: false } : p
            )
          );

          // 3. Mostramos el mensaje de éxito
          Swal.fire({
            title: "¡Inactivado!",
            text: "El producto ha sido inactivado correctamente.",
            icon: "success"
          });

        } catch (error) {
          // Si algo falla en el servidor, la interfaz no se altera y mostramos el error
          console.error("Error al desactivar el producto:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo inactivar el producto. Inténtalo de nuevo."
          });
        }
      }
    });
  };

  const handleSaveProduct = async () => { // Convertimos la función en async
    // 1. Validación inicial
    if (!formData.name.trim() || formData.price <= 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Por favor completa los campos requeridos"
      });
      return;
    }

    // Mostramos el loader de SweetAlert inmediatamente antes de iniciar el proceso
    Swal.fire({
      title: 'Guardando Producto...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      if (editingProduct) {
        // Creamos el objeto del producto editado combinando los datos existentes con el formulario
        const updatedProduct: Product = {
          ...editingProduct,
          ...formData,
          // Nos aseguramos de mapear la categoría por si cambió en el formulario
          category: categories.find((cat) => cat.id === formData.categoryId)?.label || "",
          // Asegurar que id siempre sea string (no undefined)
          id: (editingProduct && editingProduct.id) ? editingProduct.id : `prod-${Date.now()}`,
          seller: seller.name,
          sellerId: seller.id,
          rating: 0,
          reviews: 0,
          badge: null,
          location: seller.location || ""
        };

        console.log("producto a editar", updatedProduct);
        // 1. Guardar en Firestore usando tu función updateProduct
        await updateProducto(updatedProduct);

        // 2. Actualizar el estado local si la base de datos respondió bien
        setProducts(
          products.map((p) => (p.id === editingProduct.id ? updatedProduct : p))
        );

      } else {
        // Crear estructura para nuevo producto
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

        // 1. Guardar nuevo producto en Firestore (aquí usas tu función de Firebase, ej: addProduct o createProduct)
        await setProduct(newProduct);

        // 2. Actualizar el estado local
        setProducts([...products, newProduct]);
      }

      // Si todo sale bien, cerramos el loader, limpiamos estados y volvemos a la lista
      Swal.close();

      // Alerta opcional de éxito (mejora la experiencia de usuario)
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
      // Si algo falla en cualquiera de los dos flujos (crear o editar)
      Swal.close(); // Cerramos el loader primero
      console.error("Error al guardar el producto en Firestore:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar el producto. Por favor, intenta de nuevo."
      });
    }
  };

  // ── Handler de subida de imagen ────────────────────────────────────────────
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    setImageProgress(0);

    try {
      const { url } = await updateImage(
        file,
        formData.image || null, // si hay imagen previa en Storage, la borra primero
        "products",                  // carpeta en Firebase Storage
        (p) => setImageProgress(p)
      );
      setFormData((prev) => ({ ...prev, image: url }));
    } catch (err) {
      console.error("Error al subir imagen:", err);
      alert("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setImageUploading(false);
      setImageProgress(null);
      e.target.value = ""; // permite volver a seleccionar el mismo archivo
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: edit
  // ══════════════════════════════════════════════════════════════════════════
  if (currentView === "edit") {
    // Detectar si el formulario tiene cambios respecto al original (nuevo o editado)
    const isFormDirty = editingProduct
      ? JSON.stringify({ ...editingProduct }) !== JSON.stringify({ ...formData })
      : JSON.stringify(EMPTY_FORM) !== JSON.stringify({ ...formData });
    const isNameValid = formData.name.trim().length > 0;
    const isPriceValid = formData.price > 0;
    const canSave = isNameValid && isPriceValid && !imageUploading;

    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#1f2937" }}>
        <button
          onClick={() => {
            if (isFormDirty) {
              const confirmed = window.confirm("Tienes cambios sin guardar. ¿Seguro que quieres salir?");
              if (!confirmed) return;
            }
            setCurrentView("products");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            marginBottom: 24,
            background: "#e5e7eb",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ← Volver
        </button>

        <div
          style={{
            padding: 24,
            borderRadius: 16,
            background: "#ffffff",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            maxWidth: 600,
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: 4 }}>
            {editingProduct ? "Editar producto" : "Nuevo producto"}
          </h1>
          <p style={{ marginTop: 0, marginBottom: 24, fontSize: 13, color: "#9ca3af" }}>
            Los campos marcados con * son obligatorios
          </p>

          {/* ── Imagen: drag & drop + preview con botón de quitar ─────────── */}
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
          {/* ── Fin campo imagen ────────────────────────────────────────── */}

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

          {/* Precio y Stock en la misma fila */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Estado
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { value: true, label: "Activo", color: "#059669" },
                { value: false, label: "Inactivo", color: "#6b7280" },
              ].map((opt) => {
                // Validamos si esta opción coincide con el booleano en formData.active
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
                      transition: "all 0.2s ease", // Pequeño extra para que el cambio de color se vea fluido
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

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

          {/* Footer de acciones */}
          <div style={{ display: "flex", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
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

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: products
  // ══════════════════════════════════════════════════════════════════════════
  if (currentView === "products") {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#1f2937" }}>
        <button
          onClick={() => setCurrentView("dashboard")}
          style={{
            padding: "8px 16px",
            marginBottom: 24,
            background: "#e5e7eb",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ← Volver al panel
        </button>

        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: "#ffffff",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
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
                    <td style={{ padding: "12px 10px" }}>{(product as any).stock ?? 2}</td>
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
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: dashboard
  // ══════════════════════════════════════════════════════════════════════════
  return (
    loading ? (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#1f2937" }}>
        <p>Cargando datos...</p>
      </div>
    ) : (

      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#1f2937" }}>
        <header style={{ marginBottom: 24 }}>
          <p style={{ color: "#6b7280", marginBottom: 4 }}>Panel del vendedor</p>
          <h1 style={{ fontSize: 28, margin: 0 }}>{seller.name}</h1>
          <p style={{ color: "#4b5563", marginTop: 8 }}>
            Bienvenido, {userData.displayName}. Aquí puedes revisar el rendimiento de tu tienda y la información
            que llega desde el perfil.
          </p>
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-xl bg-secondary hover:bg-muted transition"
          >
            ← Volver
          </button>
        </header>

        <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 24 }}>
          <div style={{ padding: 18, borderRadius: 12, background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>Vistas al perfil</p>
            <h2 style={{ margin: "12px 0 0", fontSize: 24 }}>2</h2>
          </div>
          <div style={{ padding: 18, borderRadius: 12, background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>Ventas totales</p>
            <h2 style={{ margin: "12px 0 0", fontSize: 24 }}>200</h2>
          </div>
          <div style={{ padding: 18, borderRadius: 12, background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>Pedidos</p>
            <h2 style={{ margin: "12px 0 0", fontSize: 24 }}>20</h2>
          </div>
          <div style={{ padding: 18, borderRadius: 12, background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>Productos activos</p>
            <h2 style={{ margin: "12px 0 0", fontSize: 24 }}>10</h2>
          </div>
        </section>

        <section style={{ display: "grid", gap: 24, gridTemplateColumns: "2fr 1fr", marginBottom: 24 }}>
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
                  {typeof seller.createdAt === "object" && seller.createdAt !== null
                    ? (seller.createdAt as any).toDate
                      ? (seller.createdAt as any).toDate().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
                      : ((seller.createdAt as any).seconds !== undefined
                        ? new Date((seller.createdAt as any).seconds * 1000 + Math.round(((seller.createdAt as any).nanoseconds || 0) / 1e6)).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
                        : String(seller.createdAt))
                    : seller.createdAt}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setCurrentView("products")}
            style={{
              padding: "10px 18px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Gestionar productos
          </button>
        </div>

        <section style={{ display: "grid", gap: 24, marginBottom: 24 }}>
          <div style={{ padding: 20, borderRadius: 16, background: "#ffffff", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <h2 style={{ marginTop: 0 }}>Productos</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#6b7280" }}>
                    <th style={{ padding: "12px 10px" }}>Imagen</th>
                    <th style={{ padding: "12px 10px" }}>Nombre</th>
                    <th style={{ padding: "12px 10px" }}>Precio</th>
                    <th style={{ padding: "12px 10px" }}>Stock</th>
                    <th style={{ padding: "12px 10px" }}>Estado</th>
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
                      <td style={{ padding: "12px 10px" }}>{(product as any).stock ?? 2}</td>
                      <td style={{ padding: "12px 10px", color: product.active === true ? "#047857" : "#dc2626" }}>
                        {product.active === true ? "Activo" : "Inactivo"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: 16, background: "#ffffff", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <h2 style={{ marginTop: 0 }}>Pedidos recientes</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#6b7280" }}>
                    <th style={{ padding: "12px 10px" }}>Pedido</th>
                    <th style={{ padding: "12px 10px" }}>Cliente</th>
                    <th style={{ padding: "12px 10px" }}>Total</th>
                    <th style={{ padding: "12px 10px" }}>Estado</th>
                    <th style={{ padding: "12px 10px" }}>Fecha</th>
                  </tr>
                </thead>
              </table>
            </div>
          </div>
        </section>
      </div>
    ));
};

export default SellerDashboard;