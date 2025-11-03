const express  = require('express')
const router = express.Router();



router.get('/', (req,res) => {
    res.send('Hola esta es mi prueba de usuarios');
});

router.post("/", (req,res) => {
    const { nombre,clave } = req.body;
    console.log("Datos bien recibidos: ", nombre, clave);
    res.json({ok: true, mensaje: "Login correcto"});
})
module.exports = router;    