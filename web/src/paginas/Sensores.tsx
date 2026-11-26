import { AvisoError, EncabezadoPagina, Esqueleto, IndicadorVivo } from '../componentes/Comunes';
import { PanelSensores } from '../componentes/PanelSensores';
import { NOMBRE_TIPO } from '../formato';
import type { TipoSensor } from '../api/tipos';
import { useEstadoSensores } from './Tablero';

const TIPOS: TipoSensor[] = ['temperatura', 'energia', 'aire'];

export function Sensores() {
  const sensores = useEstadoSensores();
  const lista = sensores.data ?? [];
  return (
    <>
      <EncabezadoPagina
        titulo="Sensores"
        subtitulo="Agrupados por tipo de medición"
        acciones={<IndicadorVivo actualizadoEn={sensores.dataUpdatedAt} />}
      />
      <main className="principal">
        <AvisoError error={sensores.error} />
        {sensores.isPending && <div className="tarjeta tarjeta-relleno"><Esqueleto filas={4} alto={80} /></div>}
        {TIPOS.map((tipo) => {
          const delTipo = lista.filter((s) => s.tipo === tipo);
          return delTipo.length > 0 && <PanelSensores key={tipo} sensores={delTipo} titulo={NOMBRE_TIPO[tipo]} />;
        })}
      </main>
    </>
  );
}
