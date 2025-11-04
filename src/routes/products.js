/**
 * Rutas para la gestión de productos de la tienda online de ropa infantil
 */
const express = require('express');
const router = express.Router();
const { connectDB } = require('../app');
const ProductController = require('../controllers/ProductController');

// Middleware para verificar token JWT (importado de auth.js)
const { verificarToken } = require('./auth');

// Middleware para inicializar el controlador de productos
const initProductController = async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        if (!db) {
            throw new Error('No hay conexión a la base de datos');
        }
        req.productController = new ProductController(db);
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
    }
};

// Aplicar middleware a todas las rutas
router.use(initProductController);

/**
 * @route   GET /api/products
 * @desc    Obtener todos los productos con filtros opcionales
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const { category, gender, ageRange, minPrice, maxPrice, featured, sort, limit, page } = req.query;
        
        // Construir objeto de filtros
        const filters = {};
        if (category) filters.category = category;
        if (gender) filters.gender = gender;
        if (ageRange) filters.ageRange = ageRange;
        if (minPrice || maxPrice) {
            filters.price = {};
            if (minPrice) filters.price.$gte = parseFloat(minPrice);
            if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
        }
        if (featured) filters.featured = featured === 'true';
        
        // Construir objeto de ordenamiento
        const sortObj = {};
        if (sort) {
            const [field, order] = sort.split(':');
            sortObj[field] = order === 'desc' ? -1 : 1;
        } else {
            sortObj.createdAt = -1; // Por defecto, ordenar por fecha de creación descendente
        }
        
        const result = await req.productController.getAllProducts(
            filters,
            sortObj,
            parseInt(limit) || 12,
            parseInt(page) || 1
        );
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/products/:id
 * @desc    Obtener un producto por su ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
        const product = await req.productController.getProductById(req.params.id);
        res.json(product);
    } catch (error) {
        if (error.message === 'Producto no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/products/category/:categoryId
 * @desc    Obtener productos por categoría
 * @access  Public
 */
router.get('/category/:categoryId', async (req, res) => {
    try {
        const { limit, page } = req.query;
        const result = await req.productController.getProductsByCategory(
            req.params.categoryId,
            parseInt(limit) || 12,
            parseInt(page) || 1
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/products/search/:term
 * @desc    Buscar productos por término
 * @access  Public
 */
router.get('/search/:term', async (req, res) => {
    try {
        const { limit, page } = req.query;
        const result = await req.productController.searchProducts(
            req.params.term,
            parseInt(limit) || 12,
            parseInt(page) || 1
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/products/featured
 * @desc    Obtener productos destacados
 * @access  Public
 */
router.get('/featured', async (req, res) => {
    try {
        const { limit } = req.query;
        const products = await req.productController.getFeaturedProducts(parseInt(limit) || 8);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/products
 * @desc    Crear un nuevo producto
 * @access  Private (Admin)
 */
router.post('/', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const product = await req.productController.createProduct(req.body);
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Actualizar un producto existente
 * @access  Private (Admin)
 */
router.put('/:id', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const product = await req.productController.updateProduct(req.params.id, req.body);
        res.json(product);
    } catch (error) {
        if (error.message === 'Producto no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Eliminar un producto
 * @access  Private (Admin)
 */
router.delete('/:id', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const result = await req.productController.deleteProduct(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.message === 'Producto no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;