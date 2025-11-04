/**
 * Rutas para la gestión de categorías de la tienda online de ropa infantil
 */
const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');

// Middleware para verificar token JWT (importado de auth.js)
const { verificarToken } = require('./auth');

// Middleware para inicializar el controlador de categorías
const initCategoryController = async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        if (!db) {
            throw new Error('No hay conexión a la base de datos');
        }
        req.categoryController = new CategoryController(db);
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
    }
};

// Aplicar middleware a todas las rutas
router.use(initCategoryController);

/**
 * @route   GET /api/categories
 * @desc    Obtener todas las categorías
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const categories = await req.categoryController.getAllCategories(includeInactive);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/categories/:id
 * @desc    Obtener una categoría por su ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
        const category = await req.categoryController.getCategoryById(req.params.id);
        res.json(category);
    } catch (error) {
        if (error.message.includes('Categoría no encontrada')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/categories/slug/:slug
 * @desc    Obtener una categoría por su slug
 * @access  Public
 */
router.get('/slug/:slug', async (req, res) => {
    try {
        const category = await req.categoryController.getCategoryBySlug(req.params.slug);
        res.json(category);
    } catch (error) {
        if (error.message.includes('Categoría no encontrada')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/categories/:id/subcategories
 * @desc    Obtener subcategorías de una categoría
 * @access  Public
 */
router.get('/:id/subcategories', async (req, res) => {
    try {
        const subcategories = await req.categoryController.getSubcategories(req.params.id);
        res.json(subcategories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/categories
 * @desc    Crear una nueva categoría
 * @access  Private (Admin)
 */
router.post('/', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const category = await req.categoryController.createCategory(req.body);
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/categories/:id
 * @desc    Actualizar una categoría existente
 * @access  Private (Admin)
 */
router.put('/:id', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const category = await req.categoryController.updateCategory(req.params.id, req.body);
        res.json(category);
    } catch (error) {
        if (error.message.includes('Categoría no encontrada')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/categories/:id
 * @desc    Eliminar una categoría
 * @access  Private (Admin)
 */
router.delete('/:id', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const result = await req.categoryController.deleteCategory(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.message.includes('Categoría no encontrada')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PATCH /api/categories/:id/status
 * @desc    Activar o desactivar una categoría
 * @access  Private (Admin)
 */
router.patch('/:id/status', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const { active } = req.body;
        if (active === undefined) {
            return res.status(400).json({ error: 'Se requiere el campo active' });
        }
        
        const result = await req.categoryController.toggleCategoryStatus(req.params.id, active);
        res.json(result);
    } catch (error) {
        if (error.message.includes('Categoría no encontrada')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;