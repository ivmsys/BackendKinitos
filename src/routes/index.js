const express = require('express');
const router = express.Router();
const userRoutes = require('./user');
const SQLRoutes = require('./SQL');



// Ejemplo de ruta de prueba
router.get('/', (req, res) => {
  res.send('✅ API funcionando correctamente');
});



router.use('/users',userRoutes);
router.use('/insertSQL',SQLRoutes);
module.exports = router;

