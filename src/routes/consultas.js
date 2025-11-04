const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const {conectar} = require('../OracleDb/oraclestring');

// Middleware para verificar si Oracle está disponible
const verificarOracle = (req, res, next) => {
    if (!req.app.locals.oracleDisponible) {
        return res.status(503).json({
            error: 'Servicio de Oracle no disponible',
            mensaje: 'La base de datos Oracle no está disponible en este momento. Por favor, inténtelo más tarde.'
        });
    }
    next();
};

// Obtener todos los usuarios
router.get("/usuarios", verificarOracle, async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        
        const sql = `SELECT * FROM USUARIO WHERE activo = 1`;
        const result = await connection.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error("Error consultando usuarios en Oracle:", error);
        res.status(500).json({error: 'Error al consultar usuarios', detalle: error.message});
    } finally {
        if (connection) {
            try { await connection.close(); } catch(err) { console.error('Error cerrando conexión OracleDB:', err); }
        }
    }
});

// Obtener un usuario por ID
router.get("/usuarios/:id", verificarOracle, async (req, res) => {
    let connection;
    try {
        const id = req.params.id;
        connection = await conectar();
        
        const sql = `SELECT * FROM USUARIO WHERE id_user = :id AND activo = 1`;
        const result = await connection.execute(sql, {id}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (result.rows.length === 0) {
            return res.status(404).json({error: 'Usuario no encontrado'});
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error consultando usuario en Oracle:", error);
        res.status(500).json({error: 'Error al consultar usuario', detalle: error.message});
    } finally {
        if (connection) {
            try { await connection.close(); } catch(err) { console.error('Error cerrando conexión OracleDB:', err); }
        }
    }
});

// Actualizar un usuario
router.put("/usuarios/:id", verificarOracle, async (req, res) => {
    let connection;
    try {
        const id = req.params.id;
        const { password, nombre, correo, apellido_paterno, rol } = req.body;
        
        connection = await conectar();
        
        // Verificar que el usuario existe
        const checkSql = `SELECT COUNT(*) as count FROM USUARIO WHERE id_user = :id AND activo = 1`;
        const checkResult = await connection.execute(checkSql, {id}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (checkResult.rows[0].COUNT === 0) {
            return res.status(404).json({error: 'Usuario no encontrado'});
        }
        
        // Construir la consulta SQL dinámicamente basada en los campos proporcionados
        let updateFields = [];
        let bindParams = {id};
        
        if (password) {
            updateFields.push('password = :password');
            bindParams.password = password;
        }
        
        if (nombre) {
            updateFields.push('nombre = :nombre');
            bindParams.nombre = nombre;
        }
        
        if (correo) {
            updateFields.push('correo = :correo');
            bindParams.correo = correo;
        }
        
        if (apellido_paterno) {
            updateFields.push('apellido_paterno = :apellido_paterno');
            bindParams.apellido_paterno = apellido_paterno;
        }
        
        if (rol) {
            updateFields.push('rol = :rol');
            bindParams.rol = rol;
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({error: 'No se proporcionaron campos para actualizar'});
        }
        
        const updateSql = `UPDATE USUARIO SET ${updateFields.join(', ')} WHERE id_user = :id`;
        const result = await connection.execute(updateSql, bindParams, { autoCommit: true });
        
        res.json({
            success: true,
            message: 'Usuario actualizado correctamente',
            filasAfectadas: result.rowsAffected
        });
    } catch (error) {
        console.error("Error actualizando usuario en Oracle:", error);
        res.status(500).json({error: 'Error al actualizar usuario', detalle: error.message});
    } finally {
        if (connection) {
            try { await connection.close(); } catch(err) { console.error('Error cerrando conexión OracleDB:', err); }
        }
    }
});

// Eliminar un usuario (baja lógica)
router.delete("/usuarios/:id", verificarOracle, async (req, res) => {
    let connection;
    try {
        const id = req.params.id;
        connection = await conectar();
        
        // Verificar que el usuario existe
        const checkSql = `SELECT COUNT(*) as count FROM USUARIO WHERE id_user = :id AND activo = 1`;
        const checkResult = await connection.execute(checkSql, {id}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (checkResult.rows[0].COUNT === 0) {
            return res.status(404).json({error: 'Usuario no encontrado'});
        }
        
        // Realizar baja lógica (cambiar activo a 0)
        const sql = `UPDATE USUARIO SET activo = 0 WHERE id_user = :id`;
        const result = await connection.execute(sql, {id}, { autoCommit: true });
        
        res.json({
            success: true,
            message: 'Usuario eliminado correctamente',
            filasAfectadas: result.rowsAffected
        });
    } catch (error) {
        console.error("Error eliminando usuario en Oracle:", error);
        res.status(500).json({error: 'Error al eliminar usuario', detalle: error.message});
    } finally {
        if (connection) {
            try { await connection.close(); } catch(err) { console.error('Error cerrando conexión OracleDB:', err); }
        }
    }
});

// Autenticación de usuario (login)
router.post("/login", verificarOracle, async (req, res) => {
    let connection;
    try {
        const { id_user, password } = req.body;
        
        if (!id_user || !password) {
            return res.status(400).json({error: 'Se requiere ID de usuario y contraseña'});
        }
        
        connection = await conectar();
        
        const sql = `
            SELECT * FROM USUARIO 
            WHERE id_user = :id_user 
            AND password = :password 
            AND activo = 1
        `;
        
        const result = await connection.execute(
            sql, 
            {id_user, password}, 
            {outFormat: oracledb.OUT_FORMAT_OBJECT}
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({error: 'Credenciales inválidas'});
        }
        
        // Actualizar fecha de último login
        const updateSql = `UPDATE USUARIO SET fecha_ultimo_login = SYSDATE WHERE id_user = :id_user`;
        await connection.execute(updateSql, {id_user}, {autoCommit: true});
        
        // Eliminar la contraseña del objeto de respuesta por seguridad
        const userData = result.rows[0];
        delete userData.PASSWORD;
        
        res.json({
            success: true,
            message: 'Login exitoso',
            usuario: userData
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({error: 'Error al procesar el login', detalle: error.message});
    } finally {
        if (connection) {
            try { await connection.close(); } catch(err) { console.error('Error cerrando conexión OracleDB:', err); }
        }
    }
});

module.exports = router;