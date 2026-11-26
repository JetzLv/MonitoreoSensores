import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './estilos/global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ErrorApi } from './api/cliente';
import { Disposicion } from './componentes/Disposicion';
import { Alertas } from './paginas/Alertas';
import { InicioSesion } from './paginas/InicioSesion';
import { Mensajes } from './paginas/Mensajes';
import { Sensores } from './paginas/Sensores';
import { Tablero } from './paginas/Tablero';
import { Tickets } from './paginas/Tickets';
import { Usuarios } from './paginas/Usuarios';
import { ProveedorSesion, useSesion } from './sesion/ContextoSesion';
import { ProveedorVivo } from './sesion/ContextoVivo';

// La gráfica (Recharts) solo se descarga al abrir un sensor.
const DetalleSensor = lazy(() => import('./paginas/DetalleSensor').then((m) => ({ default: m.DetalleSensor })));

const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: (intentos, error) => !(error instanceof ErrorApi && error.estado < 500) && intentos < 2,
    },
  },
});

function Aplicacion() {
  const { usuario, cargando, tieneRol } = useSesion();
  if (cargando) return <div aria-busy="true" style={{ minHeight: '100vh' }} />;
  if (!usuario) return <InicioSesion />;
  return (
    <Routes>
      <Route element={<Disposicion />}>
        <Route index element={<Tablero />} />
        <Route path="sensores" element={<Sensores />} />
        <Route path="sensores/:id" element={<Suspense fallback={null}><DetalleSensor /></Suspense>} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="mensajes" element={<Mensajes />} />
        {tieneRol('administrador') && <Route path="usuarios" element={<Usuarios />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorSesion>
        <ProveedorVivo>
          <BrowserRouter>
            <Aplicacion />
          </BrowserRouter>
        </ProveedorVivo>
      </ProveedorSesion>
    </QueryClientProvider>
  </StrictMode>,
);
