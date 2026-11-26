import { createContext, useContext, useState, type ReactNode } from 'react';

const INTERVALO_MS = 10_000;

const ContextoVivo = createContext<{ enVivo: boolean; alternar: () => void }>({ enVivo: true, alternar: () => undefined });

export function ProveedorVivo({ children }: { children: ReactNode }) {
  const [enVivo, cambiarEnVivo] = useState(true);
  return (
    <ContextoVivo.Provider value={{ enVivo, alternar: () => cambiarEnVivo((actual) => !actual) }}>
      {children}
    </ContextoVivo.Provider>
  );
}

export function useVivo() {
  return useContext(ContextoVivo);
}

/** Intervalo de actualización para TanStack Query; se detiene al pausar. */
export function useIntervalo() {
  return useVivo().enVivo ? INTERVALO_MS : false;
}
