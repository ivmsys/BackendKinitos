/**
 * Rutas para la gestión de pagos de la tienda online de ropa infantil
 */
const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentController');

// Middleware para verificar token JWT (importado de auth.js)
const { verificarToken } = require('./auth');

// Middleware para inicializar el controlador de pagos
const initPaymentController = async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        if (!db) {
            throw new Error('No hay conexión a la base de datos');
        }
        req.paymentController = new PaymentController(db);
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
    }
};

// Aplicar middleware a todas las rutas
router.use(verificarToken); // Todas las rutas de pagos requieren autenticación
router.use(initPaymentController);

/**
 * @route   GET /api/payments/order/:orderId
 * @desc    Obtener información de pago por ID de orden
 * @access  Private
 */
router.get('/order/:orderId', async (req, res) => {
    try {
        // Verificar que el usuario sea el propietario de la orden o un administrador
        // Esta verificación requeriría acceso a la colección de órdenes
        // Por ahora, simplemente devolvemos la información del pago
        
        const payment = await req.paymentController.getPaymentByOrderId(req.params.orderId);
        res.json(payment);
    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/payments/:id
 * @desc    Obtener información de pago por ID
 * @access  Private (Admin)
 */
router.get('/:id', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const payment = await req.paymentController.getPaymentById(req.params.id);
        res.json(payment);
    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Rutas administrativas (solo accesibles para administradores)

/**
 * @route   GET /api/payments
 * @desc    Obtener todos los pagos con filtros opcionales (admin)
 * @access  Private (Admin)
 */
router.get('/', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const { status, method, minAmount, maxAmount, startDate, endDate, limit, page, sortField, sortOrder } = req.query;
        
        const filters = {};
        if (status) filters.status = status;
        if (method) filters.method = method;
        if (minAmount) filters.minAmount = minAmount;
        if (maxAmount) filters.maxAmount = maxAmount;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        const sort = {};
        if (sortField) {
            sort.field = sortField;
            sort.order = sortOrder || 'asc';
        }
        
        const result = await req.paymentController.getAllPayments(
            filters,
            sort,
            parseInt(limit) || 20,
            parseInt(page) || 1
        );
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/payments
 * @desc    Crear un nuevo registro de pago (admin)
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const payment = await req.paymentController.createPayment(req.body);
        res.status(201).json(payment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/payments/:id
 * @desc    Actualizar un registro de pago (admin)
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const payment = await req.paymentController.updatePayment(req.params.id, req.body);
        res.json(payment);
    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   PATCH /api/payments/:id/status
 * @desc    Actualizar el estado de un pago (admin)
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
            return res.status(400).json({ error: 'El estado del pago es obligatorio' });
        }
        
        const payment = await req.paymentController.updatePaymentStatus(req.params.id, status);
        res.json(payment);
    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('no válido')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Procesar un reembolso (admin)
 * @access  Private (Admin)
 */
router.post('/:id/refund', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const payment = await req.paymentController.processRefund(req.params.id, req.body);
        res.json(payment);
    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Solo se pueden reembolsar')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;