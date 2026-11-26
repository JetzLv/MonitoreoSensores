export class ErrorApi extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

let alExpirarSesion: (() => void) | null = null;

export function registrarExpiracion(funcion: () => void) {
  alExpirarSesion = funcion;
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PATCH';
  cuerpo?: unknown;
}

export async function peticion<T>(ruta: string, { metodo = 'GET', cuerpo }: Opciones = {}): Promise<T> {
  const respuesta = await fetch(`/api/v1${ruta}`, {
    method: metodo,
    credentials: 'same-origin',
    headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (respuesta.status === 401 && ruta !== '/auth/login') alExpirarSesion?.();
  if (!respuesta.ok) {
    let detalle = 'Ocurrió un error inesperado. Intenta de nuevo.';
    try {
      const datos = await respuesta.json();
      if (typeof datos.detail === 'string') detalle = datos.detail;
      else if (Array.isArray(datos.detail)) detalle = datos.detail.map((d: { msg: string }) => d.msg).join('. ');
    } catch {
      // Respuesta sin JSON: se conserva el mensaje genérico.
    }
    throw new ErrorApi(respuesta.status, detalle);
  }
  return respuesta.status === 204 ? (undefined as T) : respuesta.json();
}

export function consulta(parametros: Record<string, string | number | boolean | undefined | null>) {
  const filtrados = Object.entries(parametros).filter(([, valor]) => valor !== undefined && valor !== null && valor !== '');
  const texto = new URLSearchParams(filtrados.map(([clave, valor]) => [clave, String(valor)])).toString();
  return texto ? `?${texto}` : '';
}
