const express = require('express');
const cors = require('cors');

const { MongoClient } = require("mongodb");
const routes = require('./routes');

const app = express();

app.use(express.urlencoded({extended: true}));
app.use(express.json());


app.use(express.json());
app.use(cors());
app.use('/api',routes);






//función para conectar base de datos Mongo
const uri = "mongodb+srv://revio02:rodrigo01@rodrigocluster0.bympgsv.mongodb.net/"
const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        console.log("Conectado a Mongo correctamente");

        const db = client.db("Kinitos");
        return db;
    } catch (error){
        console.error("Error en la conexión a mongo: ",error);
    }

}

module.exports = {app, connectDB};