/**
 * Rutas para la gestión de envíos de la tienda online de ropa infantil
 */
const express = require('express');
const router = express.Router();
const ShippingController = require('../controllers/ShippingController');

// Middleware para verificar token JWT (importado de auth.js)
const { verificarToken } = require('./auth');

// Middleware para inicializar el controlador de envíos
const initShippingController = async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        if (!db) {
            throw new Error('No hay conexión a la base de datos');
        }
        req.shippingController = new ShippingController(db);
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
    }
};

// Aplicar middleware a todas las rutas
router.use(verificarToken); // Todas las rutas de envíos requieren autenticación
router.use(initShippingController);

/**
 * @route   GET /api/shipping/order/:orderId
 * @desc    Obtener información de envío por ID de orden
 * @access  Private
 */
router.get('/order/:orderId', async (req, res) => {
    try {
        const shipping = await req.shippingController.getShippingByOrderId(req.params.orderId);
        res.json(shipping);
    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/shipping/:id
 * @desc    Obtener información de envío por ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
    try {
        const shipping = await req.shippingController.getShippingById(req.params.id);
        res.json(shipping);
    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Rutas administrativas (solo accesibles para administradores)

/**
 * @route   GET /api/shipping
 * @desc    Obtener todos los envíos con filtros opcionales (admin)
 * @access  Private (Admin)
 */
router.get('/', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const { status, carrier, trackingNumber, limit, page, sortField, sortOrder } = req.query;
        
        const filters = {};
        if (status) filters.status = status;
        if (carrier) filters.carrier = carrier;
        if (trackingNumber) filters.trackingNumber = trackingNumber;
        
        const sort = {};
        if (sortField) {
            sort.field = sortField;
            sort.order = sortOrder || 'asc';
        }
        
        const result = await req.shippingController.getAllShippings(
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
 * @route   POST /api/shipping
 * @desc    Crear un nuevo registro de envío (admin)
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const shipping = await req.shippingController.createShipping(req.body);
        res.status(201).json(shipping);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/shipping/:id
 * @desc    Actualizar un registro de envío (admin)
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const shipping = await req.shippingController.updateShipping(req.params.id, req.body);
        res.json(shipping);
    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   PATCH /api/shipping/:id/status
 * @desc    Actualizar el estado de un envío (admin)
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
            return res.status(400).json({ error: 'El estado del envío es obligatorio' });
        }
        
        const shipping = await req.shippingController.updateShippingStatus(req.params.id, status);
        res.json(shipping);
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
 * @route   PATCH /api/shipping/:id/tracking
 * @desc    Actualizar el número de seguimiento de un envío (admin)
 * @access  Private (Admin)
 */
router.patch('/:id/tracking', async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const { trackingNumber } = req.body;
        if (!trackingNumber) {
            return res.status(400).json({ error: 'El número de seguimiento es obligatorio' });
        }
        
        const result = await req.shippingController.updateTrackingNumber(req.params.id, trackingNumber);
        res.json(result);
    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;