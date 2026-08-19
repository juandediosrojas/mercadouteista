import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";

import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import Swal from "sweetalert2";

import { auth, db } from "../../firebase/config";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 CONTEXTO
// ═══════════════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ─ Manejo de autenticación ─────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const lastSignInTime = firebaseUser.metadata?.lastSignInTime;

        if (lastSignInTime) {
          const lastSignIn = new Date(lastSignInTime).getTime();
          const now = new Date().getTime();
          // 2 hours en milisegundos
          const timeMax = 2 * 60 * 60 * 1000;

          if (now - lastSignIn > timeMax) {
            signOut(auth);
            setUser(null);
            setLoading(false);
            Swal.fire({
              icon: 'info',
              title: 'Sesión expirada',
              text: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
            return;
          }
        }
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ─ Registro ────────────────────────────────────────────────────────────
  const register = useCallback(async (
    displayName: string,
    email: string,
    password: string
  ) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credential.user, { displayName });

    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      displayName,
      email,
    });

    setUser({
      ...credential.user,
      displayName,
    });
  }, []);

  // ─ Login ───────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error logging in:", error);
      Swal.fire({
        icon: "error",
        title: "Error al iniciar sesión",
        text: "Las credenciales proporcionadas no son válidas.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    }
  }, []);

  // ─ Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  // ─ Login con Google ────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);

    const userRef = doc(db, "users", result.user.uid);
    const exists = await getDoc(userRef);

    if (!exists.exists()) {
      await setDoc(userRef, {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
      });
    }
  }, []);

  // ─ Valor del contexto ──────────────────────────────────────────────────
  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useAuth() {
  return useContext(AuthContext);
}