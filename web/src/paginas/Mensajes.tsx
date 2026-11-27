import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { consulta, peticion } from '../api/cliente';
import type { Mensaje, Rol } from '../api/tipos';
import { AvisoError, AvisoExito, EncabezadoPagina, Esqueleto, EstadoVacio, Etiqueta } from '../componentes/Comunes';
import { useNoLeidos } from '../componentes/Disposicion';
import { fechaHora, hora, NOMBRE_ROL } from '../formato';
import { useSesion } from '../sesion/ContextoSesion';
import { useIntervalo } from '../sesion/ContextoVivo';

const TIPO_MENSAJE: Record<Mensaje['tipo'], { texto: string; tono: string }> = {
  sensor_inactivo: { texto: 'Sensor sin datos', tono: 'tag-gris' },
  sensor_recuperado: { texto: 'Sensor recuperado', tono: 'tag-ok' },
  alerta_critica: { texto: 'Alerta crítica', tono: 'tag-critico' },
  ticket_creado: { texto: 'Ticket nuevo', tono: 'tag-info' },
  ticket_actualizado: { texto: 'Ticket', tono: 'tag-info' },
  directo: { texto: 'Mensaje', tono: 'tag-info' },
};

export function Mensajes() {
  const clienteConsultas = useQueryClient();
  const [soloNoLeidos, cambiarSoloNoLeidos] = useState(false);
  const [seleccionado, cambiarSeleccionado] = useState<string | null>(null);
  const [redactando, cambiarRedactando] = useState(false);
  const [enviado, cambiarEnviado] = useState(false);

  const mensajes = useQuery({
    queryKey: ['mensajes', 'lista', soloNoLeidos],
    queryFn: () => peticion<Mensaje[]>('/mensajes' + consulta({ solo_no_leidos: soloNoLeidos || undefined, limite: 100 })),
    refetchInterval: useIntervalo(),
  });
  const marcarLeido = useMutation({
    mutationFn: (id: string) => peticion(`/mensajes/${id}/leido`, { metodo: 'PATCH' }),
    onSuccess: () => clienteConsultas.invalidateQueries({ queryKey: ['mensajes'] }),
  });

  const marcarTodos = useMutation({
    mutationFn: () => peticion<{ total: number }>('/mensajes/leidos', { metodo: 'PATCH' }),
    onSuccess: () => clienteConsultas.invalidateQueries({ queryKey: ['mensajes'] }),
  });
  const sinLeer = useNoLeidos().data?.total ?? 0;

  const lista = mensajes.data ?? [];
  const actual = lista.find((m) => m.id === seleccionado);

  function abrir(m: Mensaje) {
    cambiarSeleccionado(m.id);
    cambiarRedactando(false);
    cambiarEnviado(false);
    if (!m.leido) marcarLeido.mutate(m.id);
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Bandeja de mensajes"
        subtitulo="Avisos del sistema y del equipo, entregados por RabbitMQ"
        acciones={<button type="button" className="boton" onClick={() => { cambiarRedactando(true); cambiarEnviado(false); }}>
          <Send size={16} aria-hidden />Nuevo mensaje
        </button>}
      />
      <main className="principal fila" style={{ flexDirection: 'row' }}>
        <section className="tarjeta angosto" style={{ overflow: 'hidden', flexBasis: 380 }} aria-label="Mensajes">
          <div className="pastillas" role="group" aria-label="Filtro" style={{ padding: '14px 16px', borderBottom: '1px solid var(--borde)' }}>
            <button type="button" className="pastilla" aria-pressed={!soloNoLeidos} onClick={() => cambiarSoloNoLeidos(false)}>Todos</button>
            <button type="button" className="pastilla" aria-pressed={soloNoLeidos} onClick={() => cambiarSoloNoLeidos(true)}>Sin leer</button>
            <button type="button" className="enlace-boton" style={{ marginLeft: 'auto' }} disabled={sinLeer === 0 || marcarTodos.isPending}
              onClick={() => marcarTodos.mutate()}><CheckCheck size={14} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />Marcar todo como leído</button>
          </div>
          <AvisoError error={mensajes.error ?? marcarTodos.error} />
          {mensajes.isPending ? <div style={{ padding: 16 }}><Esqueleto filas={5} alto={64} /></div>
            : lista.length === 0 ? <EstadoVacio titulo={soloNoLeidos ? 'Todo leído' : 'Bandeja vacía'} />
            : (
              <ul className="lista-mensajes desplazable bajo">
                {lista.map((m) => (
                  <li key={m.id}>
                    <button type="button" className="mensaje-fila" aria-current={m.id === seleccionado && !redactando} onClick={() => abrir(m)}>
                      <span className="punto" style={{ marginTop: 7, background: m.leido ? 'transparent' : 'var(--enlace)' }} aria-hidden />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span className="secundario" style={{ fontSize: 13 }}>{m.de.nombre}</span>
                          <span className="mono secundario" style={{ fontSize: 12 }}>{hora(m.creado_en)}</span>
                        </span>
                        <span style={{ fontSize: 14, fontWeight: m.leido ? 400 : 700 }}>
                          {!m.leido && <span className="solo-lector">Sin leer: </span>}{m.asunto}
                        </span>
                        <span><Etiqueta tono={TIPO_MENSAJE[m.tipo].tono}>{TIPO_MENSAJE[m.tipo].texto}</Etiqueta></span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </section>
        <section className="tarjeta tarjeta-relleno ancho desplazable" style={{ flexBasis: 460, padding: 24 }} aria-label="Lectura">
          {enviado && <AvisoExito>Mensaje enviado. Llegará a la bandeja del rol destino en unos segundos.</AvisoExito>}
          {redactando ? <Redactar alEnviar={() => { cambiarRedactando(false); cambiarEnviado(true); }} alCancelar={() => cambiarRedactando(false)} />
            : actual ? <LecturaMensaje mensaje={actual} />
            : !enviado && <EstadoVacio titulo="Elige un mensaje para leerlo" />}
        </section>
      </main>
    </>
  );
}

function LecturaMensaje({ mensaje }: { mensaje: Mensaje }) {
  const { tieneRol } = useSesion();
  const { sensor_id: sensor, ticket_folio: ticket } = mensaje.referencia;
  const sugiereTicket = (mensaje.tipo === 'sensor_inactivo' || mensaje.tipo === 'alerta_critica') && tieneRol('monitorista', 'administrador');
  const tipo = TIPO_MENSAJE[mensaje.tipo];
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span><Etiqueta tono={tipo.tono}>{tipo.texto}</Etiqueta></span>
        <h2 style={{ fontSize: 20 }}>{mensaje.asunto}</h2>
        <p className="secundario" style={{ fontSize: 14 }}>
          De <strong style={{ color: 'var(--texto)' }}>{mensaje.de.nombre}</strong>
          {mensaje.para_rol && <> para {NOMBRE_ROL[mensaje.para_rol].toLowerCase()}</>} · <span className="mono">{fechaHora(mensaje.creado_en)}</span>
        </p>
      </div>
      <p style={{ whiteSpace: 'pre-line' }}>{mensaje.cuerpo}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {sensor && <Link className="boton-secundario" to={`/sensores/${sensor}`}>Ver sensor {sensor}</Link>}
        {ticket && <Link className="boton-secundario" to={`/tickets?folio=${ticket}`}>Abrir {ticket}</Link>}
        {sugiereTicket && sensor && (
          <Link className="boton" to={`/tickets${consulta({ nuevo: 1, sensor, alerta: mensaje.referencia.alerta_id, titulo: mensaje.asunto })}`}>Levantar ticket</Link>
        )}
      </div>
    </>
  );
}

function Redactar({ alEnviar, alCancelar }: { alEnviar: () => void; alCancelar: () => void }) {
  const enviar = useMutation({
    mutationFn: (cuerpo: object) => peticion('/mensajes', { metodo: 'POST', cuerpo }),
    onSuccess: alEnviar,
  });

  function alEnviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    enviar.mutate({
      para_rol: datos.get('para') as Rol, asunto: String(datos.get('asunto')).trim(), cuerpo: String(datos.get('cuerpo')).trim(),
    });
  }

  return (
    <form className="formulario" onSubmit={alEnviarFormulario}>
      <h2 style={{ fontSize: 20 }}>Nuevo mensaje</h2>
      <div className="campo">
        <label htmlFor="m-para">Para</label>
        <select id="m-para" name="para" defaultValue="soporte">
          {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="m-asunto">Asunto</label>
        <input id="m-asunto" name="asunto" required minLength={3} maxLength={120} />
      </div>
      <div className="campo">
        <label htmlFor="m-cuerpo">Mensaje</label>
        <textarea id="m-cuerpo" name="cuerpo" rows={5} required maxLength={2000} />
      </div>
      <AvisoError error={enviar.error} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className="boton" disabled={enviar.isPending}>Enviar</button>
        <button type="button" className="boton-secundario" onClick={alCancelar}>Cancelar</button>
      </div>
      <p className="secundario" style={{ fontSize: 13 }}>Se entrega a todas las personas con ese rol.</p>
    </form>
  );
}
