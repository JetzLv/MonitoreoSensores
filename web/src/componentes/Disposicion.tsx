import { useQuery } from '@tanstack/react-query';
import { Activity, Bell, Inbox, LayoutGrid, LogOut, Ticket, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { peticion } from '../api/cliente';
import { NOMBRE_ROL } from '../formato';
import { useSesion } from '../sesion/ContextoSesion';

export function useNoLeidos() {
  return useQuery({
    queryKey: ['mensajes', 'no-leidos'],
    queryFn: () => peticion<{ total: number }>('/mensajes/no-leidos'),
    refetchInterval: 15_000,
  });
}

export function Disposicion() {
  const { usuario, cerrarSesion, tieneRol } = useSesion();
  const noLeidos = useNoLeidos().data?.total ?? 0;

  return (
    <div className="app">
      <nav className="nav" aria-label="Principal">
        <div className="nav-marca"><Activity size={22} color="#4ADE80" aria-hidden />Monitoreo IoT</div>
        <NavLink to="/" end><LayoutGrid size={18} aria-hidden />Dashboard</NavLink>
        <NavLink to="/sensores"><Activity size={18} aria-hidden />Sensores</NavLink>
        <NavLink to="/alertas"><Bell size={18} aria-hidden />Alertas</NavLink>
        <NavLink to="/tickets"><Ticket size={18} aria-hidden />Tickets</NavLink>
        <NavLink to="/mensajes">
          <Inbox size={18} aria-hidden />Mensajes
          {noLeidos > 0 && <span className="nav-contador" aria-label={`${noLeidos} sin leer`}>{noLeidos}</span>}
        </NavLink>
        {tieneRol('administrador') && <NavLink to="/usuarios"><Users size={18} aria-hidden />Usuarios</NavLink>}
        <div className="nav-usuario">
          <span style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 600 }}>{usuario?.nombre}</span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{usuario && NOMBRE_ROL[usuario.rol]}</span>
          <button type="button" className="nav-salir" onClick={cerrarSesion} style={{ padding: 0 }}>
            <LogOut size={16} aria-hidden />Cerrar sesión
          </button>
        </div>
      </nav>
      <div className="contenido">
        <Outlet />
      </div>
    </div>
  );
}
