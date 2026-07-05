import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
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

import { auth, db } from "../../firebase/config";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;

  register: (
    displayName: string,
    email: string,
    password: string
  ) => Promise<void>;

  logout: () => Promise<void>;

  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function register(
    displayName: string,
    email: string,
    password: string
  ) {
    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    await updateProfile(credential.user, {
      displayName,
    });

    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      displayName,
      email,
    });

    setUser({
      ...credential.user,
      displayName,
    });
  }

  async function login(
    email: string,
    password: string
  ) {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
  }

  async function logout() {
    await signOut(auth);
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(
      auth,
      provider
    );

    const userRef = doc(
      db,
      "users",
      result.user.uid
    );

    const exists = await getDoc(userRef);

    if (!exists.exists()) {
      await setDoc(userRef, {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
      });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}