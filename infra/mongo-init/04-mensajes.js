const nombreBd = process.env.MONGO_DB;
const bd = db.getSiblingDB(nombreBd);

bd.createCollection("mensajes");
bd.mensajes.createIndex({ para_rol: 1, creado_en: -1 });
bd.mensajes.createIndex({ para_usuario: 1, creado_en: -1 });
bd.mensajes.createIndex({ creado_en: 1 }, { expireAfterSeconds: 2592000 });

bd.grantPrivilegesToRole("rol_api", [{ resource: { db: nombreBd, collection: "mensajes" }, actions: ["find", "update"] }]);
bd.grantPrivilegesToRole("rol_worker", [{ resource: { db: nombreBd, collection: "mensajes" }, actions: ["insert"] }]);
