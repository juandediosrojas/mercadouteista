import { ChevronRight, ClipboardList, Heart, MapPin, Store, User, Camera, Pencil } from "lucide-react";
import { uploadImage } from "../../firebase/storageService";
import { updateUserProfile } from "../../firebase/userService";
import Swal from "sweetalert2";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import SellerDashboard from "./SellerDashboard";

Swal.mixin({
    customClass: {
        confirmButton: "bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90",
        cancelButton: "bg-secondary text-foreground px-4 py-2 rounded-lg hover:bg-secondary/90",
    },
    buttonsStyling: false,
});

interface ProfileViewProps {
    view: string;
    // auth user that may come from Google (may be missing some fields)
    user?: {
        uid?: string;
        displayName?: string;
        email?: string;
        phone?: string;
        major?: string;
        semester?: string;
        photoURL?: string;
        seller?: boolean;
    };
    wishlist?: Array<unknown>;
}

export default function ProfileView({ view, user, wishlist = [] }: ProfileViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [firestoreUser, setFirestoreUser] = useState<ProfileViewProps['user'] | null>(null);
    const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
    const sellerStatus = firestoreUser?.seller ?? false;
    const [showSellerDashboard, setShowSellerDashboard] = useState(false);

    const categoryTranslationMap: Record<string, string> = {
        all: 'Todos',
        electronics: 'Electrónica',
        clothing: 'Ropa',
        food: 'Comida',
        beverages: 'Bebidas',
        beauty: 'Belleza',
        books: 'Libros',
        services: 'Servicios',
        sports: 'Deportes',
        stationery: 'Papelería',
        crafts: 'Artesanías',
        home: 'Hogar',
        health: 'Salud',
        accessories: 'Accesorios',
        gifts: 'Regalos',
        tech: 'Tecnología',
    };

    const getCategoryLabel = (name: string) => {
        return categoryTranslationMap[name.toLowerCase()] ?? name;
    };

    // console.log("useState", firestoreUser, sellerStatus);

    const [formData, setFormData] = useState({
        displayName: user?.displayName ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        major: user?.major ?? "",
        semester: user?.semester ?? "",
        photoURL: user?.photoURL ?? "",
    });
    // console.log("useState form", formData);
    const [businessData, setBusinessData] = useState({
        name: "",
        description: "",
        category: "",
        schedule: "",
        location: "",
    });

    // Fetch Firestore user document when uid is provided
    useEffect(() => {
        const fetchUser = async () => {
            const id = user?.uid;
            if (!id) return;
            try {
                const ref = doc(db, 'users', id);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = snap.data() as any;
                    setFirestoreUser({ uid: id, ...data });
                    // merge auth user (user) with firestore data — firestore takes precedence
                    const merged = {
                        displayName: data.displayName ?? user?.displayName ?? '',
                        email: data.email ?? user?.email ?? '',
                        phone: data.phone ?? user?.phone ?? '',
                        major: data.major ?? user?.major ?? '',
                        semester: data.semester ?? user?.semester ?? '',
                        photoURL: data.photoURL ?? user?.photoURL ?? '',
                    };
                    setFormData(merged);
                } else {
                    // no firestore doc, use auth user
                    setFirestoreUser({ uid: id, seller: false });
                    setFormData({
                        displayName: user?.displayName ?? '',
                        email: user?.email ?? '',
                        phone: user?.phone ?? '',
                        major: user?.major ?? '',
                        semester: user?.semester ?? '',
                        photoURL: user?.photoURL ?? '',
                    });
                }
            } catch (err) {
                console.error('Error fetching Firestore user:', err);
            }
        };
        fetchUser();
    }, [user?.uid]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categorySnapshot = await getDocs(collection(db, 'categories'));
                const categoryList = categorySnapshot.docs.map((docSnap) => {
                    const data = docSnap.data() as any;
                    return { id: docSnap.id, name: data.name ?? docSnap.id };
                });
                setCategories(categoryList);
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, []);

    const saveChanges = async () => {
        const id = user?.uid;
        if (!id) {
            console.error('No user identifier available to update Firestore');
            return;
        }

        if (!formData.displayName || !formData.email) {
            console.error('Display name and email are required');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El nombre de pantalla y el correo electrónico son obligatorios.',
            });
            return;
        }

        if (formData.phone && !/^\+?\d{7,15}$/.test(formData.phone)) {
            console.error('Invalid phone number format');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El formato del número de teléfono es inválido.',
            });
            return;
        }


        try {
            const userRef = doc(db, 'users', id);
            await updateDoc(userRef, {
                displayName: formData.displayName,
                email: formData.email,
                phone: formData.phone,
                major: formData.major,
                semester: formData.semester,
                photoURL: formData.photoURL,
            });
        } catch (err) {
            console.error('Failed to update user profile:', err);
        }
    };

    const saveBusiness = async () => {
        const id = user?.uid;
        if (!id) {
            console.error('No user identifier available to register business');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo registrar el negocio. Usuario no identificado.',
            });
            return;
        }

        if (!businessData.name || !businessData.description || !businessData.category || !businessData.schedule || !businessData.location) {
            console.error('All business fields are required');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Todos los campos del negocio son obligatorios.',
                position: 'top-end',
                toast: true,
                showConfirmButton: false,
                timer: 3000,
            });
            return;
        }

        if (sellerStatus) {
            console.error('User is already registered as a seller');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error ya estás registrado como vendedor.',
                position: 'top-end',
                toast: true,
                showConfirmButton: false,
                timer: 3000,
            });
            return;
        }

        try {
            await addDoc(collection(db, 'sellers'), {
                ownerId: id,
                name: businessData.name,
                description: businessData.description,
                tags: businessData.category,
                rating: 0,
                category: businessData.category,
                schedule: businessData.schedule,
                location: businessData.location,
                createdAt: new Date(),
            });
            const userRef = doc(db, 'users', id);
            await updateDoc(userRef, {
                seller: true,
            });
            setFirestoreUser((prev) => ({ ...(prev ?? { uid: id }), seller: true }));
            setIsRegistering(false);
            setBusinessData({
                name: '',
                description: '',
                category: '',
                schedule: '',
                location: '',
            });
        } catch (err) {
            console.error('Failed to register business:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al registrar el negocio. Intenta nuevamente.',
                position: 'top-end',
                toast: true,
                showConfirmButton: false,
                timer: 3000,
            });
        }
    };

    const resetFormData = () => {
        const merged = {
            displayName: firestoreUser?.displayName ?? user?.displayName ?? '',
            email: firestoreUser?.email ?? user?.email ?? '',
            phone: firestoreUser?.phone ?? user?.phone ?? '',
            major: firestoreUser?.major ?? user?.major ?? '',
            semester: firestoreUser?.semester ?? user?.semester ?? '',
            photoURL: firestoreUser?.photoURL ?? user?.photoURL ?? '',
        };
        setFormData(merged);
        setBusinessData({
            name: '',
            description: '',
            category: '',
            schedule: '',
            location: '',
        });
    };

    const handleInputChange = (key: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [key]: event.target.value });
    };

    const handleBusinessChange = (key: keyof typeof businessData) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        setBusinessData({ ...businessData, [key]: event.target.value });
    };


    if (view !== 'profile') {
        return null;
    }
    // console.log("Rendering ProfileView with user:", user, "\n and wishlist:", wishlist, "and firestoreUser:", firestoreUser, "and sellerStatus:", sellerStatus);
    const isLoading = !firestoreUser; // ajusta esto a tu estado real de carga

    return (
        <div className="pt-6">
            {/* Avatar card */}
            <div className="flex items-center gap-4 mb-6 p-5 bg-card rounded-3xl border border-border">
                {isLoading ? (
                    <>
                        <div className="w-16 h-16 rounded-2xl bg-muted shrink-0 border border-border animate-pulse" />
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 w-32 bg-muted rounded-md animate-pulse" />
                            <div className="h-3 w-40 bg-muted rounded-md animate-pulse" />
                            <div className="h-3 w-28 bg-muted rounded-md animate-pulse" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted shrink-0 border border-border relative group animate-in fade-in duration-300">
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || !user?.uid) return;
                                    try {
                                        // show loading alert
                                        Swal.fire({
                                            title: 'Subiendo imagen...',
                                            allowOutsideClick: false,
                                            didOpen: () => {
                                                Swal.showLoading();
                                            },
                                        });

                                        const res = await uploadImage(file, 'avatars');
                                        const url = res.url;
                                        await updateUserProfile(user.uid, formData.displayName || user.displayName || '', url);
                                        setFormData((prev) => ({ ...prev, photoURL: url }));
                                        setFirestoreUser((prev) => ({ ...(prev ?? {}), photoURL: url }));

                                    } catch (err) {
                                        console.error('Failed uploading avatar', err);
                                        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo subir la imagen.' });
                                    } finally {
                                        // close loading alert (or any open Swal)
                                        Swal.close();
                                    }
                                    if (e.target) e.target.value = '';
                                }}
                            />
                            <label htmlFor="avatar-upload" className="w-full h-full block cursor-pointer">
                                <img
                                    src={formData.photoURL || user?.photoURL || firestoreUser?.photoURL || "https://via.placeholder.com/150"}
                                    alt="Foto de perfil"
                                    className="w-full h-full object-cover"
                                />
                            </label>
                            <label
                                htmlFor="avatar-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <Pencil size={20} className="text-white" />
                            </label>
                        </div>
                        <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                            <p className="font-display text-lg font-bold text-foreground leading-tight">
                                {user?.displayName || "Estudiante"}
                            </p>
                            <p className="text-sm text-muted-foreground">{firestoreUser?.major || "Carrera no definida"} · {firestoreUser?.semester || "Semestre no definido"}</p>
                            <p className="text-xs text-primary mt-0.5 truncate">{firestoreUser?.email || "usuario@ejemplo.com"}</p>
                            <p className="text-xs text-primary mt-0.5 truncate">{firestoreUser?.phone ? `Celular: ${firestoreUser.phone}` : "Celular no registrado"}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {isLoading
                    ? [1, 2, 3].map((i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl p-3 text-center">
                            <div className="h-6 w-8 mx-auto bg-muted rounded-md animate-pulse mb-1" />
                            <div className="h-3 w-16 mx-auto bg-muted rounded-md animate-pulse" />
                        </div>
                    ))
                    : [
                        { label: "Pedidos", value: "12" },
                        { label: "Guardados", value: `${wishlist.length}` },
                        // { label: "Reseñas", value: "5" },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-card border border-border rounded-2xl p-3 text-center animate-in fade-in duration-300">
                            <p className="font-display text-xl font-bold text-primary">{value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                        </div>
                    ))}
            </div>

            {/* Menu items */}
            {isLoading
                ? [1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-2xl mb-2">
                        <div className="w-10 h-10 bg-muted rounded-xl shrink-0 animate-pulse" />
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-3.5 w-32 bg-muted rounded-md animate-pulse" />
                            <div className="h-3 w-44 bg-muted rounded-md animate-pulse" />
                        </div>
                    </div>
                ))
                : [
                    { icon: ClipboardList, label: "Historial de pedidos", sub: "12 pedidos realizados" },
                    { icon: Heart, label: "Lista de deseos", sub: `${wishlist.length} productos guardados` },
                    // { icon: MapPin, label: "Mis direcciones", sub: "Pabellón A, Bloque 3" },
                    { icon: Store, label: sellerStatus ? "Mi negocio" : "Registrar mi negocio", sub: sellerStatus ? "Vendes en el campus" : "No estás registrado como vendedor" },
                    { icon: User, label: "Editar perfil", sub: "Actualiza tus datos personales" },
                ].map(({ icon: Icon, label, sub }) => (
                    <button
                        key={label}
                        type="button"
                        className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-2xl mb-2 hover:bg-secondary transition text-left animate-in fade-in duration-300"
                        onClick={() => {
                            if (label === "Editar perfil") {
                                setIsEditing(true);
                            } else if (label === "Registrar mi negocio" && !sellerStatus) {
                                setIsRegistering(true);
                            } else if (label === "Mi negocio" && sellerStatus) {
                                setShowSellerDashboard(true);
                            } else {
                                Swal.fire({
                                    icon: 'info',
                                    title: label,
                                    text: 'Aun no disponible.',
                                    position: 'top-end',
                                    toast: true,
                                    showConfirmButton: false,
                                    timer: 3000,
                                });
                            }
                        }}
                    >
                        <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shrink-0">
                            <Icon size={17} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground truncate">{sub}</p>
                        </div>
                        <ChevronRight size={15} className="text-muted-foreground shrink-0" />
                    </button>
                ))}

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Editar perfil</h3>
                                <p className="text-xs text-muted-foreground">Actualiza tus datos básicos</p>
                            </div>
                            <button
                                type="button"
                                className="text-sm text-primary hover:underline"
                                onClick={() => {
                                    setIsEditing(false);
                                    resetFormData();
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="space-y-4">

                            <label className="block text-sm text-foreground">
                                Nombre
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={handleInputChange("displayName")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </label>
                            <label className="block text-sm text-foreground">
                                Correo
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange("email")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </label>
                            <label className="block text-sm text-foreground">
                                Celular
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleInputChange("phone")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </label>
                            <label className="block text-sm text-foreground">
                                Carrera
                                <input
                                    type="text"
                                    value={formData.major}
                                    onChange={handleInputChange("major")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </label>
                            <label className="block text-sm text-foreground">
                                Semestre
                                <input
                                    type="text"
                                    value={formData.semester}
                                    onChange={handleInputChange("semester")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </label>
                        </div>
                        <button
                            type="button"
                            className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
                            onClick={() => {
                                saveChanges();
                                setIsEditing(false);
                            }}
                        >
                            Guardar cambios
                        </button>
                    </div>
                </div>
            )}

            {isRegistering && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Registrar negocio</h3>
                                <p className="text-xs text-muted-foreground">Completa los datos de tu negocio</p>
                            </div>
                            <button
                                type="button"
                                className="text-sm text-primary hover:underline"
                                onClick={() => {
                                    setIsRegistering(false);
                                    resetFormData();
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm text-foreground">
                                Nombre del negocio
                                <input
                                    type="text"
                                    value={businessData.name}
                                    onChange={handleBusinessChange("name")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </label>
                            <label className="block text-sm text-foreground">
                                Descripción
                                <input
                                    type="text"
                                    value={businessData.description}
                                    onChange={handleBusinessChange("description")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </label>
                            <label className="block text-sm text-foreground">
                                Categoría
                                <select
                                    value={businessData.category}
                                    onChange={handleBusinessChange("category")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                >
                                    <option value="">Selecciona una categoría</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                            {getCategoryLabel(cat.name)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm text-foreground">
                                Horario
                                <input
                                    type="text"
                                    value={businessData.schedule}
                                    onChange={handleBusinessChange("schedule")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </label>
                            <label className="block text-sm text-foreground">
                                Ubicación
                                <input
                                    type="text"
                                    value={businessData.location}
                                    onChange={handleBusinessChange("location")}
                                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </label>
                        </div>
                        <button
                            type="button"
                            className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
                            onClick={() => {
                                saveBusiness();
                                setIsRegistering(false);
                            }}
                        >
                            Registrar negocio
                        </button>
                    </div>
                </div>
            )}

            {showSellerDashboard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-6xl rounded-3xl border border-border bg-card p-6 shadow-xl overflow-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Mi negocio</h3>
                                <p className="text-xs text-muted-foreground">Panel de control del vendedor</p>
                            </div>
                            <button
                                type="button"
                                className="text-sm text-primary hover:underline"
                                onClick={() => setShowSellerDashboard(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <SellerDashboard
                            uid={user?.uid || ""}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

