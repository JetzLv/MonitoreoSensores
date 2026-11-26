const app = db.getSiblingDB(process.env.MONGO_DB);

app.createCollection("sensores", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "tipo", "ubicacion", "umbrales", "estado", "instalado_en"],
      properties: {
        _id: { bsonType: "string", pattern: "^(TMP|ENE|AIR)-[0-9]{3}$" },
        tipo: { enum: ["temperatura", "energia", "aire"] },
        ubicacion: {
          bsonType: "object",
          required: ["edificio", "piso", "zona"],
          properties: {
            edificio: { bsonType: "string" },
            piso: { bsonType: "int", minimum: 0 },
            zona: { bsonType: "string" }
          }
        },
        umbrales: { bsonType: "object" },
        estado: { enum: ["activo", "inactivo", "baja"] },
        instalado_en: { bsonType: "date" }
      }
    }
  }
});
app.sensores.createIndex({ tipo: 1, estado: 1 });

app.createCollection("lecturas", {
  timeseries: { timeField: "ts", metaField: "meta", granularity: "seconds" },
  expireAfterSeconds: 2592000
});
app.lecturas.createIndex({ "meta.sensor_id": 1, ts: -1 });

app.createCollection("alertas");
app.alertas.createIndex({ "sensor.id": 1, metrica: 1, ts_lectura: 1 }, { unique: true });
app.alertas.createIndex({ estado: 1, creada_en: -1 });

app.createCollection("notificaciones");
app.notificaciones.createIndex({ creada_en: 1 }, { expireAfterSeconds: 604800 });

app.createCollection("resumen_horario");
