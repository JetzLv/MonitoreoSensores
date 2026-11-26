import { Activity } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AvisoError } from '../componentes/Comunes';
import { useSesion } from '../sesion/ContextoSesion';

export function InicioSesion() {
  const { iniciarSesion } = useSesion();
  const [error, cambiarError] = useState<unknown>(null);
  const [enviando, cambiarEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    cambiarEnviando(true);
    cambiarError(null);
    try {
      await iniciarSesion(String(datos.get('correo')), String(datos.get('contrasena')));
    } catch (e) {
      cambiarError(e);
      cambiarEnviando(false);
    }
  }

  return (
    <div className="acceso">
      <section className="acceso-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: 18 }}>
          <Activity size={28} color="#4ADE80" aria-hidden />Monitoreo IoT
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 460 }}>
          <p style={{ fontSize: 36, lineHeight: 1.15, fontWeight: 700, color: '#F8FAFC' }}>Consola de operación de sensores</p>
          <p style={{ color: '#CBD5E1', fontSize: 16 }}>
            Lecturas en tiempo real, alertas por umbral y seguimiento de tickets para los equipos de monitoreo y soporte.
          </p>
        </div>
      </section>
      <main className="acceso-formulario">
        <form className="formulario" style={{ width: '100%', maxWidth: 380, gap: 20 }} onSubmit={enviar}>
          <div>
            <h1>Iniciar sesión</h1>
            <p className="secundario">Usa la cuenta que te asignó el administrador.</p>
          </div>
          <AvisoError error={error} />
          <div className="campo">
            <label htmlFor="correo">Correo</label>
            <input id="correo" name="correo" type="email" autoComplete="username" required maxLength={120} placeholder="nombre@iot.local" />
          </div>
          <div className="campo">
            <label htmlFor="contrasena">Contraseña</label>
            <input id="contrasena" name="contrasena" type="password" autoComplete="current-password" required maxLength={128} />
          </div>
          <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
          <p className="secundario" style={{ fontSize: 13 }}>Tras 10 intentos fallidos el acceso se bloquea 15 minutos.</p>
        </form>
      </main>
    </div>
  );
}
