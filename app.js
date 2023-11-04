const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const app = express();
const port = process.env.PORT || 3000;

// Configuración de mongoose
mongoose.connect("mongodb://127.0.0.1:27017/desing_web_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir un esquema para la tabla de administradores
const administradorSchema = new mongoose.Schema({
  nombre_completo: String,
  rut: String,
  contrasena: String,
});

// Definir el modelo Administrador
const Administrador = mongoose.model("Administrador", administradorSchema);

// Definir un esquema para la tabla de candidatos
const candidatoSchema = new mongoose.Schema({
  nombre: String,
  indice: Number,
});

// Definir el modelo Candidato
const Candidato = mongoose.model("Candidato", candidatoSchema);

// Configuración de EJS como motor de vistas
app.set("view engine", "ejs");
app.set("views", __dirname + "/contenido");

// Middleware para procesar datos JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para gestionar sesiones
app.use(
  session({
    secret: "udperkin",
    resave: false,
    saveUninitialized: true,
  })
);

// Ruta para la página principal
app.get("/", (req, res) => {
  const nombre_completo = req.session.nombre_completo || "";

  res.render("main", { nombre_completo });
});

// Ruta para la página de registro de administrador
app.get("/registrar_administrador", (req, res) => {
  res.render("registrar_Administrador");
});

// Ruta para la pagina de ingreso como administrador
app.get("/ingresar_Administrador", (req, res) => {
  res.render("ingresar_Administrador"); // Especifica la ubicación de la vista
});

// Ruta para ingresar a las votaciones
app.get("/ingreso_Votaciones", (req, res) => {
  res.render("ingreso_Votaciones"); // Debes tener una vista llamada "ingreso_Votaciones.ejs"
});

// Ruta para ver la página de creación de elecciones
app.get("/crear_Eleccion", (req, res) => {
  res.render("crear_Eleccion");
});

function obtenerFechaAleatoria() {
  const fechaInicio = new Date("2023-01-01");
  const fechaFin = new Date("2023-12-31");
  const fechaAleatoria = new Date(
    +fechaInicio + Math.random() * (fechaFin - fechaInicio)
  );

  const anio = fechaAleatoria.getFullYear();
  const mes = String(fechaAleatoria.getMonth() + 1).padStart(2, "0");
  const dia = String(fechaAleatoria.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function obtenerDatosDeEleccionesAleatorios() {
  const elecciones = [];

  for (let i = 1; i <= 10; i++) {
    const fechaCreacion = obtenerFechaAleatoria();
    elecciones.push({ id: i, nombre: `Elección ${i}`, fechaCreacion });
  }

  return elecciones;
}

app.post("/votar", (req, res) => {
  setTimeout(() => {
    res.send("<h2>Votación Exitosa</h2>");
  }, 3000);
});

// Ruta para ver las elecciones
app.get("/elecciones", (req, res) => {
  const datosElecciones = obtenerDatosDeEleccionesAleatorios();
  res.render("elecciones", { datosElecciones });
});

// Ruta para ver eleccion en especifico
app.get("/ver_Eleccion", (req, res) => {
  const nombreEvento = "Elección Presidencial";
  const estadoEvento = "En Curso";
  res.render("ver_Eleccion", { nombreEvento, estadoEvento });
});

// Ruta para formulario votar
app.get("/votar", (req, res) => {
  const exito = req.query.exito === "true";
  res.render("votar", { exito });
});

// Ruta para procesar el formulario de registro de administrador
app.post("/registrar_administrador", async (req, res) => {
  try {
    const existeTabla = await mongoose.connection.db
      .listCollections({ name: "administradores" })
      .next();
    if (!existeTabla) {
      mongoose.connection.db.createCollection("administradores");
    }

    const nuevoAdministrador = new Administrador({
      nombre_completo: req.body.nombre_completo,
      rut: req.body.rut,
      contrasena: req.body.contrasena,
    });
    await nuevoAdministrador.save();
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para procesar el formulario de inicio de sesión
app.post("/ingresar_Administrador", async (req, res) => {
  const { rut, contrasena } = req.body;

  try {
    const administrador = await Administrador.findOne({
      rut,
      contrasena,
    }).exec();

    if (administrador) {
      req.session.nombre_completo = administrador.nombre_completo;
      res.locals.nombre_completo = administrador.nombre_completo;
      res.redirect("/");
    } else {
      res.render("error", { mensaje: "Credenciales incorrectas" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para procesar la creación de elecciones
app.post("/crear_Eleccion", async (req, res) => {
  const { nombreEvento, cantidadCandidatos } = req.body;

  try {
    const existeTablaCandidatos = await mongoose.connection.db
      .listCollections({ name: "candidatos" })
      .next();
    if (!existeTablaCandidatos) {
      mongoose.connection.db.createCollection("candidatos");
    }
    const candidatos = [];
    for (let i = 1; i <= cantidadCandidatos; i++) {
      const candidatoNombre = req.body[`candidato${i}`];
      candidatos.push({ nombre: candidatoNombre, indice: i });
    }
    await Candidato.insertMany(candidatos);
    res.redirect("/elecciones");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
