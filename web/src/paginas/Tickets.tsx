import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { consulta, peticion } from '../api/cliente';
import type { EstadoTicket, Prioridad, Ticket } from '../api/tipos';
import { AvisoError, AvisoExito, EncabezadoPagina, Esqueleto, EstadoVacio, Etiqueta } from '../componentes/Comunes';
import { ESTADO_TICKET, fechaHora, PRIORIDAD } from '../formato';
import { useSesion } from '../sesion/ContextoSesion';
import { useIntervalo } from '../sesion/ContextoVivo';
import { useEstadoSensores } from './Tablero';

const COLUMNAS: EstadoTicket[] = ['abierto', 'en_proceso', 'resuelto', 'cerrado'];

export function Tickets() {
  const { tieneRol } = useSesion();
  const [parametros, cambiarParametros] = useSearchParams();
  const [soloMios, cambiarSoloMios] = useState(false);
  const folio = parametros.get('folio');
  const modoNuevo = parametros.get('nuevo') === '1';
  const modoCierre = parametros.get('cierre') === '1';
  const puedeCerrar = tieneRol('monitorista', 'administrador');

  const tickets = useQuery({
    queryKey: ['tickets', soloMios],
    queryFn: () => peticion<Ticket[]>('/tickets' + consulta({ asignados_a_mi: soloMios || undefined })),
    refetchInterval: useIntervalo(),
  });
  const seleccionado = folio ?? tickets.data?.[0]?.folio ?? null;
  const elegir = (f: string) => cambiarParametros({ folio: f });

  return (
    <>
      <EncabezadoPagina
        titulo="Tickets"
        subtitulo="Seguimiento entre monitoreo y soporte"
        acciones={<>
          {tieneRol('soporte') && (
            <button type="button" className="pastilla" aria-pressed={soloMios} onClick={() => cambiarSoloMios(!soloMios)}>Asignados a mí</button>
          )}
          {tieneRol('monitorista', 'administrador') && (
            <button type="button" className="boton" onClick={() => cambiarParametros({ nuevo: '1' })}><Plus size={16} aria-hidden />Nuevo ticket</button>
          )}
        </>}
      />
      <main className="principal fila" style={{ flexDirection: 'row' }}>
        <section aria-label="Tablero de tickets" className="ancho">
          <AvisoError error={tickets.error} />
          {tickets.isPending ? <Esqueleto filas={4} alto={90} /> : (
            <div className="tablero-tickets">
              {COLUMNAS.map((columna) => {
                const lista = (tickets.data ?? []).filter((t) => t.estado === columna);
                return (
                  <div key={columna} className="columna-tickets">
                    <h2 className="etiqueta-campo" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      {ESTADO_TICKET[columna]}<span className="mono">{lista.length}</span>
                    </h2>
                    {columna === 'resuelto' && puedeCerrar && lista.length > 1 && (
                      <button type="button" className="enlace-boton" style={{ alignSelf: 'flex-start' }}
                        onClick={() => cambiarParametros({ cierre: '1' })}>Cerrar varios</button>
                    )}
                    <div className="desplazable bajo" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
                    {lista.map((t) => (
                      <button key={t.folio} type="button" className="ficha-ticket" aria-pressed={!modoNuevo && !modoCierre && t.folio === seleccionado} onClick={() => elegir(t.folio)}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                          <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{t.folio}</span>
                          <Etiqueta tono={PRIORIDAD[t.prioridad].tono}>{PRIORIDAD[t.prioridad].texto}</Etiqueta>
                        </span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{t.titulo}</span>
                        <span className="secundario" style={{ fontSize: 12 }}>{t.sensor_id} · {t.asignado ?? 'Sin asignar'}</span>
                        {t.vencido && <Etiqueta tono="tag-critico">SLA vencido</Etiqueta>}
                      </button>
                    ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <aside className="tarjeta tarjeta-relleno angosto desplazable" aria-label={modoNuevo ? 'Nuevo ticket' : modoCierre ? 'Cierre de tickets' : 'Detalle del ticket'}>
          {modoCierre
            ? <CierreMasivo key={(tickets.data ?? []).length} resueltos={(tickets.data ?? []).filter((t) => t.estado === 'resuelto')} alCancelar={() => cambiarParametros({})} />
            : modoNuevo
            ? <FormularioTicket parametros={parametros} alCrear={elegir} alCancelar={() => cambiarParametros({})} />
            : seleccionado ? <DetalleTicket folio={seleccionado} /> : <EstadoVacio titulo="Sin tickets" texto="Los tickets se levantan desde una alerta o un sensor." />}
        </aside>
      </main>
    </>
  );
}

function CierreMasivo({ resueltos, alCancelar }: { resueltos: Ticket[]; alCancelar: () => void }) {
  const clienteConsultas = useQueryClient();
  const [marcados, cambiarMarcados] = useState<Set<string>>(() => new Set(resueltos.map((t) => t.folio)));
  const [comentario, cambiarComentario] = useState('');
  const cerrar = useMutation({
    mutationFn: (cuerpo: object) => peticion<{ cerrados: string[]; omitidos: string[] }>('/tickets/cierre-masivo', { metodo: 'POST', cuerpo }),
    onSuccess: () => clienteConsultas.invalidateQueries({ queryKey: ['tickets'] }),
  });
  const seleccion = resueltos.filter((t) => marcados.has(t.folio)).map((t) => t.folio);

  if (cerrar.data) {
    const { cerrados, omitidos } = cerrar.data;
    return (
      <div className="formulario">
        <h2>Cierre de tickets</h2>
        <AvisoExito>{cerrados.length} tickets cerrados. Cada creador recibió el aviso en su bandeja.</AvisoExito>
        {omitidos.length > 0 && <p className="secundario" style={{ fontSize: 14 }}>Sin cambios porque ya no estaban resueltos: {omitidos.join(', ')}.</p>}
        <button type="button" className="boton-secundario" style={{ alignSelf: 'flex-start' }} onClick={alCancelar}>Volver al tablero</button>
      </div>
    );
  }

  function alternar(folio: string) {
    const siguiente = new Set(marcados);
    if (siguiente.has(folio)) siguiente.delete(folio); else siguiente.add(folio);
    cambiarMarcados(siguiente);
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    cerrar.mutate({ folios: seleccion, comentario: comentario.trim() });
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2>Cerrar tickets resueltos</h2>
      <p className="secundario" style={{ fontSize: 14 }}>Confirma que revisaste la solución. Cada ticket guarda tu comentario en su historial.</p>
      {resueltos.length === 0 ? <EstadoVacio titulo="No hay tickets resueltos" /> : (
        <fieldset style={{ border: '1px solid var(--borde)', borderRadius: 8, margin: 0, padding: '8px 12px', display: 'flex', flexDirection: 'column' }}>
          <legend style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>Resueltos ({resueltos.length})</legend>
          {resueltos.map((t) => (
            <label key={t.folio} style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 44, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" className="casilla" checked={marcados.has(t.folio)} onChange={() => alternar(t.folio)} />
              <span className="mono" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{t.folio}</span><span>{t.titulo}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="campo">
        <label htmlFor="c-comentario">Comentario de revisión</label>
        <textarea id="c-comentario" rows={3} required minLength={3} maxLength={2000} value={comentario} onChange={(e) => cambiarComentario(e.target.value)} />
      </div>
      <AvisoError error={cerrar.error} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className="boton" disabled={seleccion.length === 0 || cerrar.isPending}>Cerrar {seleccion.length} tickets</button>
        <button type="button" className="boton-secundario" onClick={alCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

function FormularioTicket({ parametros, alCrear, alCancelar }: {
  parametros: URLSearchParams; alCrear: (folio: string) => void; alCancelar: () => void;
}) {
  const clienteConsultas = useQueryClient();
  const sensores = useEstadoSensores().data ?? [];
  const crear = useMutation({
    mutationFn: (cuerpo: object) => peticion<Ticket>('/tickets', { metodo: 'POST', cuerpo }),
    onSuccess: (ticket) => {
      clienteConsultas.invalidateQueries({ queryKey: ['tickets'] });
      alCrear(ticket.folio);
    },
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    crear.mutate({
      sensor_id: datos.get('sensor'), titulo: String(datos.get('titulo')).trim(),
      descripcion: String(datos.get('descripcion')).trim(), prioridad: datos.get('prioridad') as Prioridad,
      alerta_id: parametros.get('alerta') || null,
    });
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2>Levantar ticket</h2>
      <div className="campo">
        <label htmlFor="t-sensor">Sensor</label>
        {/* key: vuelve a aplicar el sensor precargado cuando llega la lista. */}
        <select key={sensores.length} id="t-sensor" name="sensor" required defaultValue={parametros.get('sensor') ?? ''}>
          <option value="" disabled>Elige un sensor</option>
          {sensores.map((s) => <option key={s.sensor_id} value={s.sensor_id}>{s.sensor_id} · Edificio {s.ubicacion.edificio}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="t-titulo">Título</label>
        <input id="t-titulo" name="titulo" required minLength={5} maxLength={120} defaultValue={parametros.get('titulo') ?? ''} />
      </div>
      <div className="campo">
        <label htmlFor="t-prioridad">Prioridad</label>
        <select id="t-prioridad" name="prioridad" defaultValue="media">
          {(Object.keys(PRIORIDAD) as Prioridad[]).map((p) => <option key={p} value={p}>{PRIORIDAD[p].texto}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="t-descripcion">Descripción</label>
        <textarea id="t-descripcion" name="descripcion" rows={4} required minLength={5} maxLength={2000} />
      </div>
      {parametros.get('alerta') && <p className="secundario" style={{ fontSize: 13 }}>Se vinculará con la alerta de origen.</p>}
      <AvisoError error={crear.error} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className="boton" disabled={crear.isPending}>Crear ticket</button>
        <button type="button" className="boton-secundario" onClick={alCancelar}>Cancelar</button>
      </div>
      <p className="secundario" style={{ fontSize: 13 }}>Soporte recibe el aviso en su bandeja.</p>
    </form>
  );
}

function DetalleTicket({ folio }: { folio: string }) {
  const { tieneRol } = useSesion();
  const clienteConsultas = useQueryClient();
  const [comentario, cambiarComentario] = useState('');
  const ticket = useQuery({ queryKey: ['ticket', folio], queryFn: () => peticion<Ticket>(`/tickets/${folio}`) });
  const actualizar = useMutation({
    mutationFn: (cambio: { estado?: EstadoTicket; tomar?: boolean }) =>
      peticion<Ticket>(`/tickets/${folio}`, { metodo: 'PATCH', cuerpo: { ...cambio, comentario } }),
    onSuccess: (actualizado) => {
      clienteConsultas.setQueryData(['ticket', folio], actualizado);
      clienteConsultas.invalidateQueries({ queryKey: ['tickets'] });
      cambiarComentario('');
    },
  });

  if (ticket.isPending) return <Esqueleto filas={4} />;
  if (!ticket.data) return <AvisoError error={ticket.error} />;
  const t = ticket.data;
  const esSoporte = tieneRol('soporte', 'administrador');
  const acciones: { texto: string; cambio: { estado?: EstadoTicket; tomar?: boolean }; principal: boolean }[] = [];
  if (t.estado === 'abierto' && esSoporte) acciones.push({ texto: 'Tomar ticket', cambio: { estado: 'en_proceso', tomar: true }, principal: true });
  if (t.estado === 'en_proceso' && esSoporte) acciones.push({ texto: 'Marcar resuelto', cambio: { estado: 'resuelto' }, principal: true });
  if (t.estado === 'resuelto' && tieneRol('monitorista', 'administrador')) acciones.push({ texto: 'Cerrar', cambio: { estado: 'cerrado' }, principal: true });
  if (t.estado === 'resuelto' && esSoporte) acciones.push({ texto: 'Reabrir', cambio: { estado: 'en_proceso' }, principal: false });

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="mono secundario" style={{ fontSize: 13 }}>{t.folio}</span>
        <h2>{t.titulo}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <Etiqueta tono={PRIORIDAD[t.prioridad].tono}>Prioridad {PRIORIDAD[t.prioridad].texto.toLowerCase()}</Etiqueta>
          <Etiqueta tono="tag-gris">{ESTADO_TICKET[t.estado]}</Etiqueta>
          {t.vencido && <Etiqueta tono="tag-critico">SLA vencido</Etiqueta>}
        </div>
      </div>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 14 }}>
        <dt className="secundario">Sensor</dt><dd style={{ margin: 0 }}><Link className="mono" to={`/sensores/${t.sensor_id}`}>{t.sensor_id}</Link></dd>
        <dt className="secundario">Creó</dt><dd style={{ margin: 0 }}>{t.creador} · {fechaHora(t.creado_en)}</dd>
        <dt className="secundario">Asignado</dt><dd style={{ margin: 0 }}>{t.asignado ?? 'Sin asignar'}</dd>
      </dl>
      <p style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{t.descripcion}</p>
      {acciones.length > 0 && (
        <form className="formulario" onSubmit={(e) => e.preventDefault()}>
          <div className="campo">
            <label htmlFor="t-comentario">Comentario (opcional)</label>
            <textarea id="t-comentario" rows={2} maxLength={2000} value={comentario} onChange={(e) => cambiarComentario(e.target.value)} />
          </div>
          <AvisoError error={actualizar.error} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {acciones.map((a) => (
              <button key={a.texto} type="button" className={a.principal ? 'boton' : 'boton-secundario'} disabled={actualizar.isPending}
                onClick={() => actualizar.mutate(a.cambio)}>{a.texto}</button>
            ))}
          </div>
        </form>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 className="etiqueta-campo" style={{ fontSize: 13 }}>Historial</h3>
        <ol className="historial">
          {(t.historial ?? []).map((h, i) => (
            <li key={i}>
              <strong>{h.usuario}</strong> · {h.estado_anterior ? `${ESTADO_TICKET[h.estado_anterior]} → ${ESTADO_TICKET[h.estado_nuevo]}` : 'creó el ticket'}
              {h.comentario && h.estado_anterior && <>: {h.comentario}</>}
              <br /><span className="mono secundario">{fechaHora(h.creado_en)}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
