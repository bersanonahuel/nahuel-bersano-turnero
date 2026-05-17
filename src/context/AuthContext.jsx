import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle as firebaseLoginWithGoogle, logoutFirebase } from '../lib/firebase';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // Esperamos a que Firebase resuelva

  // ── Escuchar cambios de sesión de Firebase ─────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Usuario logueado — sincronizar con Supabase
        const profile = await syncUserWithSupabase(firebaseUser);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Sincronizar/crear usuario en Supabase ──────────────────────────────
  async function syncUserWithSupabase(firebaseUser) {
    const base = {
      uid:    firebaseUser.uid,
      email:  firebaseUser.email,
      name:   firebaseUser.displayName,
      avatar: firebaseUser.photoURL,
      role:   'client',
      puntos: 0,
    };

    // Upsert: si no existe lo crea, si existe no sobreescribe puntos/role
    const { data, error } = await supabase
      .from('clientes')
      .upsert(
        { uid: base.uid, email: base.email, name: base.name, avatar: base.avatar },
        { onConflict: 'uid', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      // Si Supabase no está configurado aún, usamos los datos de Firebase igual
      console.warn('Supabase no configurado aún, usando datos de Firebase:', error.message);
      return base;
    }

    // data tiene puntos y role actualizados desde la DB
    return {
      uid:    data.uid,
      email:  data.email,
      name:   data.name,
      avatar: data.avatar,
      role:   data.role   ?? 'client',
      permiso_horarios: data.permiso_horarios ?? false,
      puntos: data.puntos ?? 0,
    };
  }

  // ── Login con Google ───────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    try {
      await firebaseLoginWithGoogle();
      // onAuthStateChanged se dispara automáticamente después
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err.message);
      throw err;
    }
  };

  // ── Admin login (email hardcodeado hasta tener roles en DB) ───────────
  const loginAsAdmin = () => {
    const adminUser = {
      uid:    'admin',
      name:   'Admin',
      email:  'admin@nahuel.com',
      role:   'admin',
      permiso_horarios: true,
      puntos: null,
    };
    setUser(adminUser);
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = async () => {
    await logoutFirebase();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginAsAdmin, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
