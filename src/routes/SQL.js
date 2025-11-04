const express  = require('express')
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

router.post("/", verificarOracle, async (req,res) => {
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


if(!id_user || !password ||!nombre|| !correo || !apellido_paterno || !rol)
    res.status(400).json({error: 'Faltan datos obligaotorios'});

const sql = `
INSERT INTO USUARIO (cve_usuario,id_user,password,nombre,correo,apellido_paterno,rol,fecha_registro,activo,fecha_ultimo_login)
VALUES (seq_usuario.nextval,:id_user,:password,:nombre,:correo,:apellido_paterno,:rol,SYSDATE,1,SYSDATE)`;

const result = await connection.execute(sql, { id_user,password,nombre,correo,apellido_paterno,rol}, { autoCommit: true });

res.json({
    message: 'usuario insertado correctamente',
    filasAfectadas: result.rowsAffected
})
} catch(error){
    console.error("Error insertando en Oracle:",error);
    res.status(500).json({error:'Error al insertar en Oracle', detalle: error.message})
} finally {
    if (connection) {
        try { await connection.close(); }catch(err){ console.error('Error cerrando conexion OracleDB:',err); }
    }
}
}
)
module.exports = router;