/**
 * Rutas para la gestión de órdenes/pedidos de la tienda online de ropa infantil
 */
const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');

// Middleware para verificar token JWT (importado de auth.js)
const { verificarToken } = require('./auth');

// Middleware para inicializar el controlador de órdenes
const initOrderController = async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        if (!db) {
            throw new Error('No hay conexión a la base de datos');
        }
        req.orderController = new OrderController(db);
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
    }
};

// Aplicar middleware a todas las rutas
router.use(verificarToken); // Todas las rutas de órdenes requieren autenticación
router.use(initOrderController);

/**
 * @route   GET /api/orders
 * @desc    Obtener todas las órdenes del usuario autenticado
 * @access  Private
 */
router.get('/', async (req, res) => {
    try {
        const { limit, page } = req.query;
        const result = await req.orderController.getUserOrders(
            req.user.userId,
            parseInt(limit) || 10,
            parseInt(page) || 1
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Obtener una orden por su ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
    try {
        const order = await req.orderController.getOrderById(req.params.id, req.user.userId);
        res.json(order);
    } catch (error) {
        if (error.message === 'Orden no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/orders
 * @desc    Crear una nueva orden
 * @access  Private
 */
router.post('/', async (req, res) => {
    try {
        // Asegurar que el userId en la orden sea el del usuario autenticado
        const orderData = {
            ...req.body,
            userId: req.user.userId
        };
        
        const order = await req.orderController.createOrder(orderData);
        res.status(201).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   PATCH /api/orders/:id/cancel
 * @desc    Cancelar una orden
 * @access  Private
 */
router.patch('/:id/cancel', async (req, res) => {
    try {
        const order = await req.orderController.cancelOrder(req.params.id, req.user.userId);
        res.json(order);
    } catch (error) {
        if (error.message === 'Orden no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('No se puede cancelar')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Rutas administrativas (solo accesibles para administradores)

/**
 * @route   GET /api/orders/admin/all
 * @desc    Obtener todas las órdenes (admin)
 * @access  Private (Admin)
 */
router.get('/admin/all', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const { limit, page, status } = req.query;
        const filters = {};
        if (status) filters.orderStatus = status;
        
        const result = await req.orderController.getAllOrders(
            filters,
            parseInt(limit) || 20,
            parseInt(page) || 1
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Actualizar el estado de una orden (admin)
 * @access  Private (Admin)
 */
router.patch('/:id/status', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'El estado de la orden es obligatorio' });
        }
        
        const order = await req.orderController.updateOrderStatus(req.params.id, status);
        res.json(order);
    } catch (error) {
        if (error.message === 'Orden no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Estado de orden no válido')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PATCH /api/orders/:id/payment
 * @desc    Actualizar el estado de pago de una orden (admin)
 * @access  Private (Admin)
 */
router.patch('/:id/payment', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'El estado de pago es obligatorio' });
        }
        
        const order = await req.orderController.updatePaymentStatus(req.params.id, status);
        res.json(order);
    } catch (error) {
        if (error.message === 'Orden no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Estado de pago no válido')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;