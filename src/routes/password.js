const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
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

// Solicitar recuperación de contraseña
router.post("/solicitar-recuperacion", verificarOracle, async (req, res) => {
    let connection;
    try {
        const { correo } = req.body;
        
        if (!correo) {
            return res.status(400).json({error: 'Se requiere correo electrónico'});
        }
        
        connection = await conectar();
        
        // Verificar si el correo existe
        const checkSql = `SELECT id_user FROM USUARIO WHERE correo = :correo AND activo = 1`;
        const checkResult = await connection.execute(
            checkSql, 
            {correo}, 
            {outFormat: oracledb.OUT_FORMAT_OBJECT}
        );
        
        if (checkResult.rows.length === 0) {
            // Por seguridad, no revelamos si el correo existe o no
            return res.json({
                success: true,
                message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña'
            });
        }
        
        // Generar token de recuperación
        const token = crypto.randomBytes(20).toString('hex');
        const expiracion = new Date();
        expiracion.setHours(expiracion.getHours() + 1); // Token válido por 1 hora
        
        // Guardar token en la base de datos
        const updateSql = `
            UPDATE USUARIO 
            SET token_recuperacion = :token, 
                token_expiracion = TO_DATE(:expiracion, 'YYYY-MM-DD HH24:MI:SS') 
            WHERE correo = :correo
        `;
        
        await connection.execute(
            updateSql, 
            {
                token,
                expiracion: expiracion.toISOString().replace('T', ' ').substring(0, 19),
                correo
            }, 
            {autoCommit: true}
        );
        
        // En un entorno real, aquí enviaríamos un correo con el enlace de recuperación
        // Por ahora, solo devolvemos el token en la respuesta
        
        res.json({
            success: true,
            message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña',
            // Solo para desarrollo, en producción no se devolvería el token
            dev_token: token
        });
    } catch (error) {
        console.error("Error en solicitud de recuperación:", error);
        res.status(500).json({error: 'Error al procesar la solicitud', detalle: error.message});
    } finally {
        if (connection) {
            try { await connection.close(); } catch(err) { console.error('Error cerrando conexión OracleDB:', err); }
        }
    }
});

// Restablecer contraseña
router.post("/restablecer-password", verificarOracle, async (req, res) => {
    let connection;
    try {
        const { token, nueva_password } = req.body;
        
        if (!token || !nueva_password) {
            return res.status(400).json({error: 'Se requiere token y nueva contraseña'});
        }
        
        connection = await conectar();
        
        // Verificar si el token es válido y no ha expirado
        const checkSql = `
            SELECT id_user 
            FROM USUARIO 
            WHERE token_recuperacion = :token 
            AND token_expiracion > SYSDATE 
            AND activo = 1
        `;
        
        const checkResult = await connection.execute(
            checkSql, 
            {token}, 
            {outFormat: oracledb.OUT_FORMAT_OBJECT}
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(400).json({error: 'Token inválido o expirado'});
        }
        
        // Encriptar nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(nueva_password, saltRounds);
        
        // Actualizar contraseña y limpiar token
        const updateSql = `
            UPDATE USUARIO 
            SET password = :password, 
                token_recuperacion = NULL, 
                token_expiracion = NULL 
            WHERE token_recuperacion = :token
        `;
        
        await connection.execute(
            updateSql, 
            {password: hashedPassword, token}, 
            {autoCommit: true}
        );
        
        res.json({
            success: true,
            message: 'Contraseña restablecida correctamente'
        });
    } catch (error) {
        console.error("Error restableciendo contraseña:", error);
        res.status(500).json({error: 'Error al restablecer contraseña', detalle: error.message});
    } finally {
        if (connection) {
            try { await connection.close(); } catch(err) { console.error('Error cerrando conexión OracleDB:', err); }
        }
    }
});

module.exports = router;