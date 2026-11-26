import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { EstadoOperativo, EstadoSensor } from '../api/tipos';
import { ESTADO_OPERATIVO, haceCuanto, METRICA_PRINCIPAL, valorConUnidad } from '../formato';
import { EstadoVacio, Etiqueta } from './Comunes';

type Filtro = 'todos' | EstadoOperativo;

const OPCIONES: [Filtro, string][] = [['todos', 'Todos'], ['alerta', 'Con alerta'], ['inactivo', 'Sin datos'], ['normal', 'Normales']];

export function PanelSensores({ sensores, titulo = 'Sensores' }: { sensores: EstadoSensor[]; titulo?: string }) {
  const [filtro, cambiarFiltro] = useState<Filtro>('todos');
  const idTitulo = useId();
  const visibles = filtro === 'todos' ? sensores : sensores.filter((s) => s.estado === filtro);
  const contar = (f: Filtro) => (f === 'todos' ? sensores.length : sensores.filter((s) => s.estado === f).length);

  return (
    <section className="tarjeta tarjeta-relleno" aria-labelledby={idTitulo}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 id={idTitulo}>{titulo}</h2>
        <div className="pastillas" role="group" aria-label={`Filtrar ${titulo.toLowerCase()} por estado`}>
          {OPCIONES.map(([clave, texto]) => (
            <button key={clave} type="button" className="pastilla" aria-pressed={filtro === clave} onClick={() => cambiarFiltro(clave)}>
              {texto} ({contar(clave)})
            </button>
          ))}
        </div>
      </div>
      {visibles.length === 0 ? (
        <EstadoVacio titulo="Sin sensores en este estado" />
      ) : (
        <div className="rejilla-sensores">
          {visibles.map((s) => {
            const estilo = ESTADO_OPERATIVO[s.estado];
            const metrica = METRICA_PRINCIPAL[s.tipo];
            return (
              <Link key={s.sensor_id} to={`/sensores/${s.sensor_id}`} className="mosaico" style={{ borderLeftColor: estilo.borde }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span className="mono" style={{ fontWeight: 500, fontSize: 14 }}>{s.sensor_id}</span>
                  <Etiqueta tono={estilo.tono}>{estilo.texto}</Etiqueta>
                </span>
                <span className="mono" style={{ fontSize: 20 }}>
                  {s.estado === 'inactivo' ? '—' : valorConUnidad(metrica, s.valores?.[metrica])}
                </span>
                <span className="secundario" style={{ fontSize: 12 }}>
                  Edificio {s.ubicacion.edificio} · {haceCuanto(s.ultima_lectura)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
