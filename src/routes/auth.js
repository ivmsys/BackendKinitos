const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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

// Clave secreta para firmar los tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'kinitos_secret_key_2024';

// Middleware para verificar token JWT
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// Registro de usuario
router.post("/registro", verificarOracle, async (req, res) => {
    let connection;

    try {
        connection = await conectar();

        const {
            id_user,
            password,
            nombre,
            correo,
            apellido_paterno,
            rol
        } = req.body;

        // Validar datos obligatorios
        if(!id_user || !password || !nombre || !correo || !apellido_paterno || !rol) {
            return res.status(400).json({error: 'Faltan datos obligatorios'});
        }

        // Verificar si el usuario ya existe
        const checkUserSql = `SELECT COUNT(*) as count FROM USUARIO WHERE id_user = :id_user OR correo = :correo`;
        const checkResult = await connection.execute(
            checkUserSql, 
            {id_user, correo}, 
            {outFormat: oracledb.OUT_FORMAT_OBJECT}
        );

        if (checkResult.rows[0].COUNT > 0) {
            return res.status(409).json({error: 'El usuario o correo ya está registrado'});
        }

        // Encriptar contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insertar nuevo usuario
        const sql = `
        INSERT INTO USUARIO (cve_usuario,id_user,password,nombre,correo,apellido_paterno,rol,fecha_registro,activo,fecha_ultimo_login)
        VALUES (seq_usuario.nextval,:id_user,:password,:nombre,:correo,:apellido_paterno,:rol,SYSDATE,1,SYSDATE)`;

        const result = await connection.execute(
            sql, 
            { id_user, password: hashedPassword, nombre, correo, apellido_paterno, rol}, 
            { autoCommit: true }
        );

        res.status(201).json({
            success: true,
            message: 'Usuario registrado correctamente',
            filasAfectadas: result.rowsAffected
        });
    } catch(error) {
        console.error("Error registrando usuario en Oracle:", error);
        res.status(500).json({error: 'Error al registrar usuario', detalle: error.message});
    } finally {
        if (connection) {
            try { await connection.close(); } catch(err) { console.error('Error cerrando conexión OracleDB:', err); }
        }
    }
});

// Login de usuario
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
            AND activo = 1
        `;
        
        const result = await connection.execute(
            sql, 
            {id_user}, 
            {outFormat: oracledb.OUT_FORMAT_OBJECT}
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({error: 'Usuario no encontrado o inactivo'});
        }
        
        const user = result.rows[0];
        
        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!passwordMatch) {
            return res.status(401).json({error: 'Contraseña incorrecta'});
        }
        
        // Actualizar fecha de último login
        const updateSql = `UPDATE USUARIO SET fecha_ultimo_login = SYSDATE WHERE id_user = :id_user`;
        await connection.execute(updateSql, {id_user}, {autoCommit: true});
        
        // Generar token JWT
        const token = jwt.sign(
            { 
                id: user.CVE_USUARIO, 
                id_user: user.ID_USER, 
                nombre: user.NOMBRE,
                rol: user.ROL 
            }, 
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: {
                id: user.CVE_USUARIO,
                id_user: user.ID_USER,
                nombre: user.NOMBRE,
                correo: user.CORREO,
                rol: user.ROL
            }
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

// Verificar token (endpoint para comprobar si un token es válido)
router.get("/verificar-token", verificarToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Exportar el middleware verificarToken para usarlo en otras rutas
module.exports = { router, verificarToken };