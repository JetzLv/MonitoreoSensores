import type { EstadoOperativo, EstadoTicket, Prioridad, Rol, Severidad, TipoSensor } from './api/tipos';

export const NOMBRE_METRICA: Record<string, string> = {
  temp_c: 'Temperatura', humedad_pct: 'Humedad', voltaje_v: 'Voltaje', corriente_a: 'Corriente',
  potencia_kw: 'Potencia', pm25: 'PM2.5', pm10: 'PM10', co_ppm: 'CO',
};

export const UNIDAD_METRICA: Record<string, string> = {
  temp_c: '°C', humedad_pct: '%', voltaje_v: 'V', corriente_a: 'A',
  potencia_kw: 'kW', pm25: 'µg/m³', pm10: 'µg/m³', co_ppm: 'ppm',
};

export const METRICA_PRINCIPAL: Record<TipoSensor, string> = {
  temperatura: 'temp_c', energia: 'voltaje_v', aire: 'pm25',
};

export const NOMBRE_TIPO: Record<TipoSensor, string> = {
  temperatura: 'Temperatura', energia: 'Energía', aire: 'Calidad del aire',
};

export const NOMBRE_ROL: Record<Rol, string> = {
  administrador: 'Administrador', monitorista: 'Monitorista', soporte: 'Soporte',
};

export const ESTADO_OPERATIVO: Record<EstadoOperativo, { texto: string; tono: string; borde: string }> = {
  normal: { texto: 'Normal', tono: 'tag-ok', borde: 'var(--ok)' },
  alerta: { texto: 'Alerta', tono: 'tag-aviso', borde: 'var(--aviso)' },
  inactivo: { texto: 'Sin datos', tono: 'tag-gris', borde: 'var(--texto-secundario)' },
  fuera_de_servicio: { texto: 'Fuera de servicio', tono: 'tag-gris', borde: 'var(--borde-control)' },
};

export const SEVERIDAD: Record<Severidad, { texto: string; tono: string; color: string }> = {
  media: { texto: 'Media', tono: 'tag-aviso', color: '#F59E0B' },
  alta: { texto: 'Alta', tono: 'tag-alta', color: '#C2410C' },
  critica: { texto: 'Crítica', tono: 'tag-critico', color: '#7F1D1D' },
};

export const ESTADO_TICKET: Record<EstadoTicket, string> = {
  abierto: 'Abierto', en_proceso: 'En proceso', resuelto: 'Resuelto', cerrado: 'Cerrado',
};

export const PRIORIDAD: Record<Prioridad, { texto: string; tono: string }> = {
  baja: { texto: 'Baja', tono: 'tag-gris' },
  media: { texto: 'Media', tono: 'tag-info' },
  alta: { texto: 'Alta', tono: 'tag-alta' },
  critica: { texto: 'Crítica', tono: 'tag-critico' },
};

export function valorConUnidad(metrica: string, valor: number | undefined | null) {
  if (valor === undefined || valor === null) return '—';
  return `${valor.toFixed(1)} ${UNIDAD_METRICA[metrica] ?? ''}`.trim();
}

export function hora(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}

export function fechaHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

export function haceCuanto(iso: string | number | null, ahora = Date.now()) {
  if (iso === null) return 'sin lecturas';
  const segundos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  return `hace ${Math.round(minutos / 60)} h`;
}
