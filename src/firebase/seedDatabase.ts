import {
    collection,
    doc,
    serverTimestamp,
    setDoc
} from "firebase/firestore";

import { db } from "./config";

const categories = [
    { id: "food", label: "Comida", emoji: "🍱" },
    { id: "crafts", label: "Artesanías", emoji: "🧶" },
    { id: "services", label: "Servicios", emoji: "💼" },
    { id: "clothing", label: "Ropa", emoji: "👕" },
    { id: "tech", label: "Tecnología", emoji: "💻" },
];

const sellers = [
    {
        id: "seller1",
        name: "Cocina de Doña Carmen",
        tag: "Comida",
        image: "https://images.unsplash.com/photo-1581349485608-9469926a8e5e?w=120&h=120&fit=crop&auto=format",
        rating: 4.8
    },
    {
        id: "seller2",
        name: "Jugos Frescos UCE",
        tag: "Comida",
        image: "",
        rating: 4.9
    },
    {
        id: "seller3",
        name: "Artesanías Luna",
        tag: "Manualidades",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=120&fit=crop&auto=format",
        rating: 4.7
    },
    {
        id: "seller4",
        name: "Copias Exprés",
        tag: "Servicios",
        image: "",
        rating: 4.6
    },
    {
        id: "seller5",
        name: "TechStore Campus",
        tag: "Tecnología",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&h=120&fit=crop&auto=format",
        rating: 4.5
    },
    {
        id: "seller6",
        name: "Tutores Pro",
        tag: "Servicios",
        image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=120&h=120&fit=crop&auto=format",
        rating: 5
    },
    {
        id: "seller7",
        name: "Empanadas del Patio",
        tag: "Comida",
        image: "",
        rating: 4.8
    },
    {
        id: "seller8",
        name: "Artesanías del Norte",
        tag: "Manualidades",
        image: "",
        rating: 4.9
    },
    {
        id: "seller9",
        name: "Moda Campus",
        tag: "Ropa",
        image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=120&h=120&fit=crop&auto=format",
        rating: 4.4
    }
];

const sellerMap: Record<string, string> = {
    "Cocina de Doña Carmen": "seller1",
    "Jugos Frescos UCE": "seller2",
    "Artesanías Luna": "seller3",
    "Copias Exprés": "seller4",
    "TechStore Campus": "seller5",
    "Tutores Pro": "seller6",
    "Empanadas del Patio": "seller7",
    "Artesanías del Norte": "seller8",
    "Moda Campus": "seller9"
};

// Pega aquí tu arreglo PRODUCTS
const products = [
    {
        id: 1,
        name: "Almuerzo Ejecutivo",
        seller: "Cocina de Doña Carmen",
        price: 8500,
        rating: 4.8,
        reviews: 142,
        category: "food",
        badge: "Más vendido",
        image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=500&h=380&fit=crop&auto=format",
        description: "Sopa del día + seco + jugo natural. Preparado con ingredientes frescos del mercado cada mañana. Incluye postre los martes y jueves.",
        location: "Pabellón A, Planta Baja",
    },
    {
        id: 2,
        name: "Jugo Natural 500ml",
        seller: "Jugos Frescos UCE",
        price: 2500,
        rating: 4.9,
        reviews: 89,
        category: "food",
        badge: "Nuevo",
        image: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=500&h=380&fit=crop&auto=format",
        description: "Jugo de maracuyá, mora, naranja o guanábana recién exprimido. Sin azúcar añadida. Disponible de lunes a viernes de 7am a 5pm.",
        location: "Cafetería Central",
    },
    {
        id: 3,
        name: "Pulsera Macramé",
        seller: "Artesanías Luna",
        price: 12000,
        rating: 4.7,
        reviews: 56,
        category: "crafts",
        badge: null,
        image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500&h=380&fit=crop&auto=format",
        description: "Pulsera artesanal tejida a mano en macramé. Disponible en 8 colores. Ajustable a cualquier muñeca.",
        location: "Facultad de Arte, Salón 204",
    },
    {
        id: 4,
        name: "Impresión A4 Color",
        seller: "Copias Exprés",
        price: 800,
        rating: 4.6,
        reviews: 210,
        category: "services",
        badge: "Popular",
        image: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=500&h=380&fit=crop&auto=format",
        description: "Impresión a color en papel A4 de 75gr. Entrega en menos de 10 minutos. También disponible en carta y doble carta.",
        location: "Biblioteca Central, Sótano",
    },
    {
        id: 5,
        name: "Audífonos Bluetooth JL40",
        seller: "TechStore Campus",
        price: 45000,
        rating: 4.5,
        reviews: 34,
        category: "tech",
        badge: null,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=380&fit=crop&auto=format",
        description: "Audífonos inalámbricos con cancelación activa de ruido. Autonomía 20h. Incluye estuche y cable USB-C.",
        location: "Bloque de Ingeniería, Piso 1",
    },
    {
        id: 6,
        name: "Tutoría Cálculo I",
        seller: "Tutores Pro",
        price: 20000,
        rating: 5.0,
        reviews: 28,
        category: "services",
        badge: "Top rated",
        image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&h=380&fit=crop&auto=format",
        description: "Sesión de 1 hora con estudiante de último semestre de Ingeniería. Incluye material de trabajo y ejercicios resueltos.",
        location: "Sala de Estudio 3",
    },
    {
        id: 7,
        name: "Empanadas Caseras ×3",
        seller: "Empanadas del Patio",
        price: 4500,
        rating: 4.8,
        reviews: 178,
        category: "food",
        badge: null,
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=380&fit=crop&auto=format",
        description: "Tres empanadas de pipián, carne o queso. Recién fritas. Acompañadas de ají casero artesanal.",
        location: "Patio Central, Quiosco 7",
    },
    {
        id: 8,
        name: "Mochila Wayuu",
        seller: "Artesanías del Norte",
        price: 85000,
        rating: 4.9,
        reviews: 41,
        category: "crafts",
        badge: "Artesanal",
        image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&h=380&fit=crop&auto=format",
        description: "Mochila Wayuu auténtica tejida a mano por artesanas de La Guajira. Diseño exclusivo, colores vivos. Pieza única.",
        location: "Facultad de Arte, Salón 204",
    },
    {
        id: 9,
        name: "Camiseta Universitaria",
        seller: "Moda Campus",
        price: 35000,
        rating: 4.4,
        reviews: 62,
        category: "clothing",
        badge: null,
        image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=500&h=380&fit=crop&auto=format",
        description: "Camiseta 100% algodón con logo bordado de la universidad. Tallas S a XL. Lavado a máquina.",
        location: "Tienda Universitaria",
    },
    {
        id: 10,
        name: "Cable USB-C 2m",
        seller: "TechStore Campus",
        price: 12000,
        rating: 4.3,
        reviews: 47,
        category: "tech",
        badge: null,
        image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500&h=380&fit=crop&auto=format",
        description: "Cable USB-C a USB-A de 2 metros. Carga rápida 60W compatible. Trenzado reforzado.",
        location: "Bloque de Ingeniería, Piso 1",
    },
];

export async function seedDatabase() {

    console.log("Subiendo categorías...");

    for (const category of categories) {

        await setDoc(
            doc(db, "categories", category.id),
            category
        );

    }

    console.log("Subiendo vendedores...");

    for (const seller of sellers) {

        await setDoc(
            doc(db, "sellers", seller.id),
            seller
        );

    }

    console.log("Subiendo productos...");

    for (const product of products) {

        const productRef = doc(collection(db, "products"));

        await setDoc(productRef, {

            name: product.name,

            description: product.description,

            price: product.price,

            rating: product.rating,

            reviews: product.reviews,

            badge: product.badge,

            image: product.image,

            location: product.location,

            active: true,

            // Mantener los nombres
            seller: product.seller,
            category: product.category,

            // Relaciones
            sellerId: sellerMap[product.seller],
            categoryId: product.category,

            createdAt: serverTimestamp()

        });
    }

    console.log("Base de datos cargada correctamente.");
}