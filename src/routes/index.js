const express = require('express');
const router = express.Router();

// Importar rutas existentes
const userRoutes = require('./user');
const SQLRoutes = require('./SQL');
const consultasRoutes = require('./consultas');
const mongoRoutes = require('./mongo');
const { router: authRoutes, verificarToken } = require('./auth');
const passwordRoutes = require('./password');

// Importar nuevas rutas para la tienda online
const productRoutes = require('./products');
const categoryRoutes = require('./categories');
const cartRoutes = require('./cart');
const orderRoutes = require('./orders');
const shippingRoutes = require('./shipping');
const paymentRoutes = require('./payments');

// Importar rutas de autenticación con MongoDB
const { router: authMongoRoutes, verificarToken: verificarTokenMongo } = require('./auth-mongo');

// Ruta de prueba
router.get('/', (req, res) => {
  res.send('✅ API funcionando correctamente');
});

// Rutas existentes
router.use('/users', userRoutes);
router.use('/insertSQL', SQLRoutes);
router.use('/api', consultasRoutes);
router.use('/mongo', mongoRoutes);
router.use('/auth', authRoutes);
router.use('/password', passwordRoutes);

// Nuevas rutas para la tienda online
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/shipping', shippingRoutes);
router.use('/payments', paymentRoutes);
router.use('/auth-mongo', authMongoRoutes); // Autenticación con MongoDB
module.exports = router;

