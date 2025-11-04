/**
 * Rutas de autenticación para la tienda online de ropa infantil (MongoDB)
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserController = require('../controllers/UserController');

// Clave secreta para firmar los tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'kinitos_secret_key';

// Middleware para verificar token JWT
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// Middleware para inicializar el controlador de usuarios
const initUserController = async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        if (!db) {
            throw new Error('No hay conexión a la base de datos');
        }
        req.userController = new UserController(db);
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
    }
};

// Aplicar middleware a todas las rutas
router.use(initUserController);

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario
 * @access  Public
 */
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, address } = req.body;
        
        // Validar datos obligatorios
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }
        
        const userData = {
            firstName,
            lastName,
            email,
            password,
            phone,
            address,
            role: 'customer' // Por defecto, todos los usuarios registrados son clientes
        };
        
        const result = await req.userController.register(userData);
        
        res.status(201).json({
            message: 'Usuario registrado correctamente',
            user: result.user,
            token: result.token
        });
    } catch (error) {
        if (error.message.includes('El email ya está registrado')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        }
        
        const result = await req.userController.login(email, password);
        
        res.json({
            message: 'Inicio de sesión exitoso',
            user: result.user,
            token: result.token
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/profile', verificarToken, async (req, res) => {
    try {
        const user = await req.userController.getUserProfile(req.user.userId);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Actualizar perfil del usuario autenticado
 * @access  Private
 */
router.put('/profile', verificarToken, async (req, res) => {
    try {
        // No permitir actualizar el rol desde esta ruta
        const { role, password, ...updateData } = req.body;
        
        const user = await req.userController.updateUserProfile(req.user.userId, updateData);
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contraseña del usuario autenticado
 * @access  Private
 */
router.put('/change-password', verificarToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' });
        }
        
        const result = await req.userController.changePassword(
            req.user.userId,
            currentPassword,
            newPassword
        );
        
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/auth/profile
 * @desc    Eliminar cuenta del usuario autenticado
 * @access  Private
 */
router.delete('/profile', verificarToken, async (req, res) => {
    try {
        const result = await req.userController.deleteUser(req.user.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rutas administrativas

/**
 * @route   GET /api/auth/users
 * @desc    Obtener todos los usuarios (admin)
 * @access  Private (Admin)
 */
router.get('/users', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const users = await req.userController.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Actualizar un usuario (admin)
 * @access  Private (Admin)
 */
router.put('/users/:id', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const user = await req.userController.updateUserProfile(req.params.id, req.body);
        res.json(user);
    } catch (error) {
        if (error.message.includes('Usuario no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Eliminar un usuario (admin)
 * @access  Private (Admin)
 */
router.delete('/users/:id', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        
        const result = await req.userController.deleteUser(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.message.includes('Usuario no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, verificarToken };