const bd = db.getSiblingDB(process.env.MONGO_DB);

const umbrales = {
  temperatura: { temp_c: { min: 15, max: 30 }, humedad_pct: { min: 20, max: 70 } },
  energia: { voltaje_v: { min: 114, max: 140 }, corriente_a: { min: 0, max: 15 }, potencia_kw: { min: 0, max: 2 } },
  aire: { pm25: { min: 0, max: 45 }, pm10: { min: 0, max: 75 }, co_ppm: { min: 0, max: 9 } }
};
const prefijos = { temperatura: "TMP", energia: "ENE", aire: "AIR" };
const edificios = ["A", "B", "C"];
const zonas = ["Norte", "Sur", "Centro", "Laboratorio", "Servidores"];

const sensores = [];
for (const tipo of Object.keys(prefijos)) {
  for (let i = 1; i <= 10; i++) {
    sensores.push({
      _id: `${prefijos[tipo]}-${String(i).padStart(3, "0")}`,
      tipo: tipo,
      ubicacion: { edificio: edificios[i % 3], piso: NumberInt(1 + (i % 4)), zona: zonas[i % 5] },
      umbrales: umbrales[tipo],
      estado: "activo",
      instalado_en: new Date("2026-09-01T00:00:00Z"),
      meta: { creado_en: new Date(), actualizado_en: new Date() }
    });
  }
}
bd.sensores.insertMany(sensores);
