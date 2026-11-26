import { CircleAlert, CircleCheck, Inbox, Pause, Play } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ErrorApi } from '../api/cliente';
import { haceCuanto } from '../formato';
import { useVivo } from '../sesion/ContextoVivo';

export function EncabezadoPagina({ titulo, subtitulo, acciones, antes }: {
  titulo: ReactNode; subtitulo?: ReactNode; acciones?: ReactNode; antes?: ReactNode;
}) {
  return (
    <header className="encabezado">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {antes}
        <h1>{titulo}</h1>
        {subtitulo && <p className="secundario" style={{ fontSize: 14 }}>{subtitulo}</p>}
      </div>
      {acciones && <div className="encabezado-acciones">{acciones}</div>}
    </header>
  );
}

export function Etiqueta({ tono, children }: { tono: string; children: ReactNode }) {
  return <span className={`tag ${tono}`}>{children}</span>;
}

export function IndicadorVivo({ actualizadoEn }: { actualizadoEn: number }) {
  const { enVivo, alternar } = useVivo();
  const [ahora, cambiarAhora] = useState(Date.now());
  useEffect(() => {
    const reloj = setInterval(() => cambiarAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);
  const texto = enVivo
    ? `En vivo · actualizado ${actualizadoEn ? haceCuanto(actualizadoEn, ahora) : 'ahora'}`
    : `En pausa · datos de las ${new Date(actualizadoEn || ahora).toLocaleTimeString('es-MX')}`;
  return (
    <>
      <span className="vivo">
        <span className={`punto ${enVivo ? 'pulso' : ''}`} style={{ background: enVivo ? 'var(--ok)' : 'var(--texto-secundario)' }} />
        {texto}
      </span>
      <button type="button" className="boton-secundario" onClick={alternar} aria-pressed={!enVivo}>
        {enVivo ? <><Pause size={16} aria-hidden />Pausar</> : <><Play size={16} aria-hidden />Reanudar</>}
      </button>
    </>
  );
}

export function EstadoVacio({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <div className="vacio" role="status">
      <Inbox size={28} aria-hidden />
      <strong>{titulo}</strong>
      {texto && <span style={{ fontSize: 14 }}>{texto}</span>}
    </div>
  );
}

export function Esqueleto({ filas = 3, alto = 44 }: { filas?: number; alto?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: filas }, (_, i) => <div key={i} className="esqueleto" style={{ height: alto }} />)}
    </div>
  );
}

export function AvisoError({ error }: { error: unknown }) {
  if (!error) return null;
  const texto = error instanceof ErrorApi ? error.message : 'No se pudo conectar con el servidor.';
  return <div className="aviso aviso-error" role="alert"><CircleAlert size={18} aria-hidden /><span>{texto}</span></div>;
}

export function AvisoExito({ children }: { children: ReactNode }) {
  return <div className="aviso aviso-ok" role="status"><CircleCheck size={18} aria-hidden /><span>{children}</span></div>;
}
