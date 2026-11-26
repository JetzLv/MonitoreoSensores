const nombreBd = process.env.MONGO_DB;
const bd = db.getSiblingDB(nombreBd);
const permiso = (coleccion, acciones) => ({ resource: { db: nombreBd, collection: coleccion }, actions: acciones });

bd.createRole({
  role: "rol_api",
  privileges: [
    permiso("sensores", ["find", "insert", "update"]),
    permiso("lecturas", ["find"]),
    permiso("alertas", ["find", "update"]),
    permiso("notificaciones", ["find"]),
    permiso("resumen_horario", ["find"])
  ],
  roles: []
});

bd.createRole({
  role: "rol_worker",
  privileges: [
    permiso("sensores", ["find"]),
    permiso("lecturas", ["find", "insert"]),
    permiso("alertas", ["find", "insert"]),
    permiso("notificaciones", ["insert"]),
    permiso("resumen_horario", ["find", "insert", "update"])
  ],
  roles: []
});

bd.createRole({
  role: "rol_simulador",
  privileges: [permiso("sensores", ["find"])],
  roles: []
});

bd.createUser({ user: process.env.MONGO_API_USER, pwd: process.env.MONGO_API_PASSWORD, roles: ["rol_api"] });
bd.createUser({ user: process.env.MONGO_WORKER_USER, pwd: process.env.MONGO_WORKER_PASSWORD, roles: ["rol_worker"] });
bd.createUser({ user: process.env.MONGO_SIM_USER, pwd: process.env.MONGO_SIM_PASSWORD, roles: ["rol_simulador"] });
