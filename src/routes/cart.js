/**
 * Rutas para la gestión del carrito de compras de la tienda online de ropa infantil
 */
const express = require('express');
const router = express.Router();
const CartController = require('../controllers/CartController');

// Middleware para verificar token JWT (importado de auth.js)
const { verificarToken } = require('./auth');

// Middleware para inicializar el controlador de carrito
const initCartController = async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        if (!db) {
            throw new Error('No hay conexión a la base de datos');
        }
        req.cartController = new CartController(db);
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
    }
};

// Aplicar middleware a todas las rutas
router.use(verificarToken); // Todas las rutas del carrito requieren autenticación
router.use(initCartController);

/**
 * @route   GET /api/cart
 * @desc    Obtener el carrito del usuario autenticado
 * @access  Private
 */
router.get('/', async (req, res) => {
    try {
        const cart = await req.cartController.getCart(req.user.userId);
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/cart/items
 * @desc    Añadir un producto al carrito
 * @access  Private
 */
router.post('/items', async (req, res) => {
    try {
        const { productId, quantity, size } = req.body;
        
        if (!productId || !size) {
            return res.status(400).json({ error: 'ID de producto y talla son obligatorios' });
        }
        
        const cart = await req.cartController.addItem(
            req.user.userId,
            productId,
            quantity || 1,
            size
        );
        
        res.status(201).json(cart);
    } catch (error) {
        if (error.message.includes('Stock insuficiente')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/cart/items/:productId
 * @desc    Actualizar la cantidad de un producto en el carrito
 * @access  Private
 */
router.put('/items/:productId', async (req, res) => {
    try {
        const { quantity, size } = req.body;
        
        if (!quantity || !size) {
            return res.status(400).json({ error: 'Cantidad y talla son obligatorios' });
        }
        
        const cart = await req.cartController.updateItemQuantity(
            req.user.userId,
            req.params.productId,
            parseInt(quantity),
            size
        );
        
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/cart/items/:productId
 * @desc    Eliminar un producto del carrito
 * @access  Private
 */
router.delete('/items/:productId', async (req, res) => {
    try {
        const cart = await req.cartController.removeItem(
            req.user.userId,
            req.params.productId
        );
        
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/cart
 * @desc    Vaciar el carrito
 * @access  Private
 */
router.delete('/', async (req, res) => {
    try {
        const cart = await req.cartController.clearCart(req.user.userId);
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;