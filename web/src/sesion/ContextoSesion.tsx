import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { peticion, registrarExpiracion } from '../api/cliente';
import type { Rol, Usuario } from '../api/tipos';

interface ValorSesion {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  tieneRol: (...roles: Rol[]) => boolean;
}

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, cambiarUsuario] = useState<Usuario | null>(null);
  const [cargando, cambiarCargando] = useState(true);
  const clienteConsultas = useQueryClient();

  useEffect(() => {
    registrarExpiracion(() => {
      cambiarUsuario(null);
      clienteConsultas.clear();
    });
    peticion<Usuario>('/auth/yo')
      .then(cambiarUsuario)
      .catch(() => cambiarUsuario(null))
      .finally(() => cambiarCargando(false));
  }, [clienteConsultas]);

  const valor: ValorSesion = {
    usuario,
    cargando,
    iniciarSesion: async (correo, contrasena) => {
      cambiarUsuario(await peticion<Usuario>('/auth/login', { metodo: 'POST', cuerpo: { correo, contrasena } }));
    },
    cerrarSesion: async () => {
      await peticion('/auth/logout', { metodo: 'POST' }).catch(() => undefined);
      clienteConsultas.clear();
      cambiarUsuario(null);
    },
    tieneRol: (...roles) => !!usuario && roles.includes(usuario.rol),
  };

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion() {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return valor;
}
