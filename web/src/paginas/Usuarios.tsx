import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { peticion } from '../api/cliente';
import type { Rol, Usuario } from '../api/tipos';
import { AvisoError, AvisoExito, EncabezadoPagina, Esqueleto, Etiqueta } from '../componentes/Comunes';
import { NOMBRE_ROL } from '../formato';
import { useSesion } from '../sesion/ContextoSesion';

export function Usuarios() {
  const { usuario: yo } = useSesion();
  const [editando, cambiarEditando] = useState<Usuario | null>(null);
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
      <EncabezadoPagina titulo="Usuarios" subtitulo="Solo visible para administradores"
        acciones={editando && <button type="button" className="boton" onClick={() => cambiarEditando(null)}><Plus size={16} aria-hidden />Nuevo usuario</button>} />
      <main className="principal fila" style={{ flexDirection: 'row' }}>
        <section className="tarjeta tabla-caja ancho desplazable" aria-label="Lista de usuarios">
          <AvisoError error={usuarios.error ?? actualizar.error} />
          {usuarios.isPending ? <div style={{ padding: 20 }}><Esqueleto filas={4} /></div> : (
            <table style={{ minWidth: 640 }}>
              <thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col"><span className="solo-lector">Acciones</span></th></tr></thead>
              <tbody>
                {(usuarios.data ?? []).map((u) => {
                  const esYo = u.id === yo?.id;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.nombre}{esYo && <span className="secundario" style={{ fontWeight: 400 }}> (tú)</span>}</td>
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
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button type="button" className="boton-secundario chico" aria-label={`Editar a ${u.nombre}`}
                            aria-pressed={editando?.id === u.id} onClick={() => cambiarEditando(u)}>Editar</button>
                          {!esYo && (
                            <button type="button" className="boton-secundario chico" disabled={actualizar.isPending}
                              onClick={() => actualizar.mutate({ id: u.id, cambios: { activo: !u.activo } })}>
                              {u.activo ? 'Desactivar' : 'Reactivar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
        <aside className="tarjeta tarjeta-relleno angosto desplazable" aria-label={editando ? 'Editar usuario' : 'Nuevo usuario'}>
          {editando ? <EditarUsuario key={editando.id} usuario={editando} esYo={editando.id === yo?.id} alCancelar={() => cambiarEditando(null)} /> : (
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
          )}
        </aside>
      </main>
    </>
  );
}

function EditarUsuario({ usuario, esYo, alCancelar }: { usuario: Usuario; esYo: boolean; alCancelar: () => void }) {
  const { cerrarSesion, actualizarUsuario, usuario: sesion } = useSesion();
  const clienteConsultas = useQueryClient();
  const [guardado, cambiarGuardado] = useState(false);
  const guardar = useMutation({
    mutationFn: (cambios: Partial<Pick<Usuario, 'nombre' | 'correo'>> & { contrasena?: string }) =>
      peticion<Usuario>(`/usuarios/${usuario.id}`, { metodo: 'PATCH', cuerpo: cambios }),
    onSuccess: async (actualizado, cambios) => {
      if (esYo && (cambios.correo || cambios.contrasena)) {
        await cerrarSesion();
        return;
      }
      if (esYo && sesion) actualizarUsuario({ ...sesion, nombre: actualizado.nombre });
      clienteConsultas.invalidateQueries({ queryKey: ['usuarios'] });
      cambiarGuardado(true);
    },
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const nombre = String(datos.get('nombre')).trim();
    const correo = String(datos.get('correo')).trim().toLowerCase();
    const contrasena = String(datos.get('contrasena'));
    const cambios = {
      ...(nombre !== usuario.nombre && { nombre }),
      ...(correo !== usuario.correo && { correo }),
      ...(contrasena && { contrasena }),
    };
    cambiarGuardado(false);
    if (Object.keys(cambios).length) guardar.mutate(cambios);
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2>Editar usuario</h2>
      <p className="secundario" style={{ fontSize: 14 }}>{NOMBRE_ROL[usuario.rol]} · {usuario.activo ? 'Activo' : 'Inactivo'}</p>
      <div className="campo"><label htmlFor="e-nombre">Nombre</label><input id="e-nombre" name="nombre" required minLength={2} maxLength={80} defaultValue={usuario.nombre} autoComplete="off" /></div>
      <div className="campo">
        <label htmlFor="e-correo">Correo</label>
        <input id="e-correo" name="correo" type="email" required maxLength={120} defaultValue={usuario.correo} autoComplete="off" aria-describedby="ayuda-correo" />
        <span id="ayuda-correo" className="ayuda">Debe ser único; es el usuario para iniciar sesión.</span>
      </div>
      <div className="campo">
        <label htmlFor="e-contrasena">Nueva contraseña</label>
        <input id="e-contrasena" name="contrasena" type="password" minLength={10} maxLength={128} placeholder="Dejar vacío para conservarla"
          autoComplete="new-password" aria-describedby="ayuda-nueva" />
        <span id="ayuda-nueva" className="ayuda">
          {esYo ? 'Si cambias tu correo o contraseña, tendrás que iniciar sesión de nuevo.' : 'Mínimo 10 caracteres. Al cambiar correo o contraseña se cierran sus sesiones abiertas.'}
        </span>
      </div>
      <AvisoError error={guardar.error} />
      {guardado && <AvisoExito>Cambios guardados.</AvisoExito>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className="boton" disabled={guardar.isPending}>Guardar cambios</button>
        <button type="button" className="boton-secundario" onClick={alCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
