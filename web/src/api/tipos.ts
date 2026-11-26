export type Rol = 'administrador' | 'monitorista' | 'soporte';
export type TipoSensor = 'temperatura' | 'energia' | 'aire';
export type EstadoOperativo = 'normal' | 'alerta' | 'inactivo' | 'fuera_de_servicio';
export type Severidad = 'media' | 'alta' | 'critica';
export type EstadoTicket = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
export type Prioridad = 'baja' | 'media' | 'alta' | 'critica';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
}

export interface Ubicacion {
  edificio: string;
  piso: number;
  zona: string;
}

export interface Umbral {
  min: number;
  max: number;
}

export interface Sensor {
  id: string;
  tipo: TipoSensor;
  ubicacion: Ubicacion;
  umbrales: Record<string, Umbral>;
  estado: 'activo' | 'inactivo' | 'baja';
  instalado_en: string;
}

export interface EstadoSensor {
  sensor_id: string;
  tipo: TipoSensor;
  ubicacion: Ubicacion;
  estado: EstadoOperativo;
  ultima_lectura: string | null;
  valores: Record<string, number> | null;
  alertas_abiertas: number;
}

export interface Lectura {
  ts: string;
  valores: Record<string, number>;
}

export interface Alerta {
  id: string;
  sensor: { id: string; tipo: TipoSensor; ubicacion: Ubicacion };
  metrica: string;
  valor: number;
  umbral: number;
  severidad: Severidad;
  estado: 'abierta' | 'atendida';
  ts_lectura: string;
  creada_en: string;
  atendida_en: string | null;
  atendida_por: string | null;
}

export interface AlertasPorUbicacion {
  por_edificio: { edificio: string; severidad: Severidad; total: number }[];
  por_severidad: Partial<Record<Severidad, number>>;
}

export interface PuntoTendencia {
  ts: string;
  valor: number;
  minimo: number;
  maximo: number;
  media_movil: number;
}

export interface Historial {
  usuario: string;
  estado_anterior: EstadoTicket | null;
  estado_nuevo: EstadoTicket;
  comentario: string;
  creado_en: string;
}

export interface Ticket {
  folio: string;
  titulo: string;
  descripcion: string;
  sensor_id: string;
  alerta_id: string | null;
  prioridad: Prioridad;
  estado: EstadoTicket;
  creador: string;
  asignado: string | null;
  creado_en: string;
  actualizado_en: string;
  resuelto_en: string | null;
  vencido: boolean;
  historial?: Historial[] | null;
}

export interface Mensaje {
  id: string;
  tipo: 'sensor_inactivo' | 'sensor_recuperado' | 'alerta_critica' | 'ticket_creado' | 'ticket_actualizado' | 'directo';
  asunto: string;
  cuerpo: string;
  para_rol: Rol | null;
  de: { tipo: 'sistema' | 'usuario'; usuario_id: number | null; nombre: string };
  referencia: Record<string, string>;
  leido: boolean;
  creado_en: string;
}
