const express = require('express');
const cors = require('cors');
const { MongoClient } = require("mongodb");
const routes = require('./routes');

const app = express();

// Configuración de middlewares
app.use(express.urlencoded({extended: true}));
app.use(express.json()); // Eliminada la duplicación
app.use(cors({
  origin: '*', // Permite todas las solicitudes de origen cruzado
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configuración de rutas
app.use('/api', routes);






// Configuración de conexión a MongoDB
const uri = "mongodb+srv://revio02:rodrigo01@rodrigocluster0.bympgsv.mongodb.net/"
const client = new MongoClient(uri);

/**
 * Función para conectar a la base de datos MongoDB
 * @returns {Promise<Db>} Instancia de la base de datos MongoDB
 */
async function connectDB() {
    try {
        await client.connect();
        console.log("Conectado a MongoDB correctamente");

        const db = client.db("Kinitos");
        return db;
    } catch (error) {
        console.error("Error en la conexión a MongoDB: ", error);
        throw error; // Propagar el error para manejarlo en el nivel superior
    }
}

module.exports = {app, connectDB};