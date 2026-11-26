const dbName = process.env.MONGO_DB;
const app = db.getSiblingDB(dbName);
const priv = (coleccion, acciones) => ({ resource: { db: dbName, collection: coleccion }, actions: acciones });

app.createRole({
  role: "rol_api",
  privileges: [
    priv("sensores", ["find", "insert", "update"]),
    priv("lecturas", ["find"]),
    priv("alertas", ["find", "update"]),
    priv("notificaciones", ["find"]),
    priv("resumen_horario", ["find"])
  ],
  roles: []
});

app.createRole({
  role: "rol_worker",
  privileges: [
    priv("sensores", ["find"]),
    priv("lecturas", ["find", "insert"]),
    priv("alertas", ["find", "insert"]),
    priv("notificaciones", ["insert"]),
    priv("resumen_horario", ["find", "insert", "update"])
  ],
  roles: []
});

app.createRole({
  role: "rol_simulador",
  privileges: [priv("sensores", ["find"])],
  roles: []
});

app.createUser({ user: process.env.MONGO_API_USER, pwd: process.env.MONGO_API_PASSWORD, roles: ["rol_api"] });
app.createUser({ user: process.env.MONGO_WORKER_USER, pwd: process.env.MONGO_WORKER_PASSWORD, roles: ["rol_worker"] });
app.createUser({ user: process.env.MONGO_SIM_USER, pwd: process.env.MONGO_SIM_PASSWORD, roles: ["rol_simulador"] });
