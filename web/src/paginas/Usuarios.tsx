import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { peticion } from '../api/cliente';
import type { Rol, Usuario } from '../api/tipos';
import { AvisoError, AvisoExito, EncabezadoPagina, Esqueleto, Etiqueta } from '../componentes/Comunes';
import { NOMBRE_ROL } from '../formato';
import { useSesion } from '../sesion/ContextoSesion';

export function Usuarios() {
  const { usuario: yo } = useSesion();
  const clienteConsultas = useQueryClient();
  const formulario = useRef<HTMLFormElement>(null);
  const [creado, cambiarCreado] = useState<string | null>(null);

  const usuarios = useQuery({ queryKey: ['usuarios'], queryFn: () => peticion<Usuario[]>('/usuarios') });
  const actualizar = useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: Partial<Pick<Usuario, 'rol' | 'activo'>> }) =>
      peticion<Usuario>(`/usuarios/${id}`, { metodo: 'PATCH', cuerpo: cambios }),
    onSuccess: () => clienteConsultas.invalidateQueries({ queryKey: ['usuarios'] }),
  });
  const crear = useMutation({
    mutationFn: (cuerpo: object) => peticion<Usuario>('/usuarios', { metodo: 'POST', cuerpo }),
    onSuccess: (nuevo) => {
      clienteConsultas.invalidateQueries({ queryKey: ['usuarios'] });
      formulario.current?.reset();
      cambiarCreado(nuevo.nombre);
    },
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    cambiarCreado(null);
    crear.mutate({
      nombre: String(datos.get('nombre')).trim(), correo: String(datos.get('correo')).trim(),
      rol: datos.get('rol') as Rol, contrasena: String(datos.get('contrasena')),
    });
  }

  return (
    <>
      <EncabezadoPagina titulo="Usuarios" subtitulo="Solo visible para administradores" />
      <main className="principal fila" style={{ flexDirection: 'row' }}>
        <section className="tarjeta tabla-caja ancho" aria-label="Lista de usuarios">
          <AvisoError error={usuarios.error ?? actualizar.error} />
          {usuarios.isPending ? <div style={{ padding: 20 }}><Esqueleto filas={4} /></div> : (
            <table style={{ minWidth: 640 }}>
              <thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col"><span className="solo-lector">Acciones</span></th></tr></thead>
              <tbody>
                {(usuarios.data ?? []).map((u) => {
                  const esYo = u.id === yo?.id;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                      <td className="secundario">{u.correo}</td>
                      <td>
                        {esYo ? NOMBRE_ROL[u.rol] : (
                          <select aria-label={`Rol de ${u.nombre}`} value={u.rol} disabled={actualizar.isPending}
                            onChange={(e) => actualizar.mutate({ id: u.id, cambios: { rol: e.target.value as Rol } })}
                            style={{ minHeight: 36, borderRadius: 8, border: '1px solid var(--borde-control)', background: 'var(--superficie)', color: 'var(--texto)', padding: '0 8px', font: 'inherit' }}>
                            {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
                          </select>
                        )}
                      </td>
                      <td><Etiqueta tono={u.activo ? 'tag-ok' : 'tag-gris'}>{u.activo ? 'Activo' : 'Inactivo'}</Etiqueta></td>
                      <td style={{ textAlign: 'right' }}>
                        {esYo ? <span className="secundario" style={{ fontSize: 12 }}>Tu cuenta</span> : (
                          <button type="button" className="boton-secundario chico" disabled={actualizar.isPending}
                            onClick={() => actualizar.mutate({ id: u.id, cambios: { activo: !u.activo } })}>
                            {u.activo ? 'Desactivar' : 'Reactivar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
        <aside className="tarjeta tarjeta-relleno angosto" aria-labelledby="titulo-nuevo-usuario">
          <form ref={formulario} className="formulario" onSubmit={enviar}>
            <h2 id="titulo-nuevo-usuario">Nuevo usuario</h2>
            <div className="campo"><label htmlFor="u-nombre">Nombre</label><input id="u-nombre" name="nombre" required minLength={2} maxLength={80} autoComplete="off" /></div>
            <div className="campo"><label htmlFor="u-correo">Correo</label><input id="u-correo" name="correo" type="email" required maxLength={120} autoComplete="off" /></div>
            <div className="campo">
              <label htmlFor="u-rol">Rol</label>
              <select id="u-rol" name="rol" defaultValue="monitorista">
                {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="u-contrasena">Contraseña temporal</label>
              <input id="u-contrasena" name="contrasena" type="password" required minLength={10} maxLength={128} autoComplete="new-password" aria-describedby="ayuda-contrasena" />
              <span id="ayuda-contrasena" className="ayuda">Mínimo 10 caracteres.</span>
            </div>
            <AvisoError error={crear.error} />
            {creado && <AvisoExito>{creado} ya puede iniciar sesión. Comparte la contraseña por un canal privado.</AvisoExito>}
            <button type="submit" className="boton" style={{ alignSelf: 'flex-start' }} disabled={crear.isPending}>Crear usuario</button>
          </form>
        </aside>
      </main>
    </>
  );
}
