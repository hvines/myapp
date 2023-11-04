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
  votos: Number,
  evento: { type: mongoose.Schema.Types.ObjectId, ref: "Evento" },
});

// Definir el modelo Candidato
const Candidato = mongoose.model("Candidato", candidatoSchema);

const eventoSchema = new mongoose.Schema(
  {
    nombreEvento: String,
    candidatos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Candidato" }],
  },
  { timestamps: true }
); // Habilita la creación de campos para timestamps

const Evento = mongoose.model("Evento", eventoSchema);

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

async function obtenerDatosDeEleccionesReales() {
  try {
    // Obtenemos todos los eventos y populamos el campo de candidatos para cada uno
    const eventos = await Evento.find().populate("candidatos").exec();

    // Mapeamos los eventos para reformatear la información que vamos a enviar al frontend
    const datosElecciones = eventos.map((evento) => {
      return {
        id: evento._id,
        nombre: evento.nombreEvento,
        fechaCreacion: evento.createdAt, // Fecha de creación del evento
        candidatos: evento.candidatos.map((candidato) => {
          return { nombre: candidato.nombre, indice: candidato.indice };
        }),
      };
    });

    return datosElecciones;
  } catch (error) {
    console.error("Error al obtener los datos de las elecciones:", error);
    return [];
  }
}

app.post("/votar", (req, res) => {
  setTimeout(() => {
    res.send("<h2>Votación Exitosa</h2>");
  }, 3000);
});

/**
 * RUTA ELECCIONES
 */
app.get("/elecciones", async (req, res) => {
  try {
    const datosElecciones = await obtenerDatosDeEleccionesReales();
    res.render("elecciones", { datosElecciones });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar las elecciones.");
  }
});

// Ruta para ver eleccion en especifico
app.get("/ver_Eleccion/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Encuentra el evento por el id proporcionado y populate los candidatos asociados
    const evento = await Evento.findById(id).populate("candidatos");

    if (!evento) {
      return res.status(404).send("Evento no encontrado");
    }

    // Renderiza la plantilla con los datos del evento y sus candidatos
    res.render("ver_Eleccion", {
      nombreEvento: evento.nombreEvento,
      estadoEvento: "En Curso", // Suponiendo que no tienes un campo para el estado del evento
      candidatos: evento.candidatos, // Los candidatos son parte del evento
      fechaCreacion: evento.createdAt, // Usando el campo generado por timestamps
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
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

/**
 * RUTA CREAR ELECCIÓN
 */
app.post("/crear_Eleccion", async (req, res) => {
  const { nombreEvento, cantidadCandidatos } = req.body;
  console.log(nombreEvento);
  console.log(req.body);

  try {
    // Crear el evento
    const nuevoEvento = new Evento({ nombreEvento });
    await nuevoEvento.save();

    // Crear candidatos asociados al evento
    const candidatos = [];
    for (let i = 1; i <= cantidadCandidatos; i++) {
      const candidatoNombre = req.body[`candidato${i}`];
      const candidato = new Candidato({
        nombre: candidatoNombre,
        indice: i,
        votos: 0,
        evento: nuevoEvento._id, // Asocia cada candidato al evento
      });
      candidatos.push(candidato);
    }

    // Insertar candidatos en la base de datos
    await Candidato.insertMany(candidatos);

    // Actualizar el evento con los candidatos creados
    nuevoEvento.candidatos = candidatos.map((candidato) => candidato._id);
    await nuevoEvento.save();

    res.redirect("/elecciones");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
