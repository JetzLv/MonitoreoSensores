const dbName = process.env.MONGO_DB;
const app = db.getSiblingDB(dbName);

app.createCollection("mensajes");
app.mensajes.createIndex({ para_rol: 1, creado_en: -1 });
app.mensajes.createIndex({ para_usuario: 1, creado_en: -1 });
app.mensajes.createIndex({ creado_en: 1 }, { expireAfterSeconds: 2592000 });

app.grantPrivilegesToRole("rol_api", [{ resource: { db: dbName, collection: "mensajes" }, actions: ["find", "update"] }]);
app.grantPrivilegesToRole("rol_worker", [{ resource: { db: dbName, collection: "mensajes" }, actions: ["insert"] }]);
