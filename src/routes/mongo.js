const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

// Función para obtener la conexión a MongoDB desde app.js
async function getMongoConnection(req) {
    if (!req.app.locals.db) {
        throw new Error('La conexión a MongoDB no está disponible');
    }
    return req.app.locals.db;
}

// Obtener todos los documentos de una colección
router.get('/:coleccion', async (req, res) => {
    try {
        const db = await getMongoConnection(req);
        const coleccion = req.params.coleccion;
        
        const documentos = await db.collection(coleccion).find({}).toArray();
        
        res.json({
            success: true,
            data: documentos
        });
    } catch (error) {
        console.error(`Error al obtener documentos de ${req.params.coleccion}:`, error);
        res.status(500).json({error: `Error al obtener documentos de ${req.params.coleccion}`, detalle: error.message});
    }
});

// Obtener un documento por ID
router.get('/:coleccion/:id', async (req, res) => {
    try {
        const db = await getMongoConnection(req);
        const coleccion = req.params.coleccion;
        const id = req.params.id;
        
        // Validar que el ID tenga el formato correcto para MongoDB
        let objectId;
        try {
            const { ObjectId } = require('mongodb');
            objectId = new ObjectId(id);
        } catch (error) {
            return res.status(400).json({error: 'ID inválido'});
        }
        
        const documento = await db.collection(coleccion).findOne({_id: objectId});
        
        if (!documento) {
            return res.status(404).json({error: 'Documento no encontrado'});
        }
        
        res.json({
            success: true,
            data: documento
        });
    } catch (error) {
        console.error(`Error al obtener documento de ${req.params.coleccion}:`, error);
        res.status(500).json({error: `Error al obtener documento de ${req.params.coleccion}`, detalle: error.message});
    }
});

// Crear un nuevo documento
router.post('/:coleccion', async (req, res) => {
    try {
        const db = await getMongoConnection(req);
        const coleccion = req.params.coleccion;
        const datos = req.body;
        
        if (!datos || Object.keys(datos).length === 0) {
            return res.status(400).json({error: 'No se proporcionaron datos para insertar'});
        }
        
        const resultado = await db.collection(coleccion).insertOne(datos);
        
        res.status(201).json({
            success: true,
            message: 'Documento creado correctamente',
            id: resultado.insertedId
        });
    } catch (error) {
        console.error(`Error al crear documento en ${req.params.coleccion}:`, error);
        res.status(500).json({error: `Error al crear documento en ${req.params.coleccion}`, detalle: error.message});
    }
});

// Actualizar un documento
router.put('/:coleccion/:id', async (req, res) => {
    try {
        const db = await getMongoConnection(req);
        const coleccion = req.params.coleccion;
        const id = req.params.id;
        const datos = req.body;
        
        if (!datos || Object.keys(datos).length === 0) {
            return res.status(400).json({error: 'No se proporcionaron datos para actualizar'});
        }
        
        // Validar que el ID tenga el formato correcto para MongoDB
        let objectId;
        try {
            const { ObjectId } = require('mongodb');
            objectId = new ObjectId(id);
        } catch (error) {
            return res.status(400).json({error: 'ID inválido'});
        }
        
        const resultado = await db.collection(coleccion).updateOne(
            {_id: objectId},
            {$set: datos}
        );
        
        if (resultado.matchedCount === 0) {
            return res.status(404).json({error: 'Documento no encontrado'});
        }
        
        res.json({
            success: true,
            message: 'Documento actualizado correctamente',
            documentosActualizados: resultado.modifiedCount
        });
    } catch (error) {
        console.error(`Error al actualizar documento en ${req.params.coleccion}:`, error);
        res.status(500).json({error: `Error al actualizar documento en ${req.params.coleccion}`, detalle: error.message});
    }
});

// Eliminar un documento
router.delete('/:coleccion/:id', async (req, res) => {
    try {
        const db = await getMongoConnection(req);
        const coleccion = req.params.coleccion;
        const id = req.params.id;
        
        // Validar que el ID tenga el formato correcto para MongoDB
        let objectId;
        try {
            const { ObjectId } = require('mongodb');
            objectId = new ObjectId(id);
        } catch (error) {
            return res.status(400).json({error: 'ID inválido'});
        }
        
        const resultado = await db.collection(coleccion).deleteOne({_id: objectId});
        
        if (resultado.deletedCount === 0) {
            return res.status(404).json({error: 'Documento no encontrado'});
        }
        
        res.json({
            success: true,
            message: 'Documento eliminado correctamente'
        });
    } catch (error) {
        console.error(`Error al eliminar documento de ${req.params.coleccion}:`, error);
        res.status(500).json({error: `Error al eliminar documento de ${req.params.coleccion}`, detalle: error.message});
    }
});

module.exports = router;