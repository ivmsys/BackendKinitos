/**
 * Controlador de Usuarios para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

class UserController {
    constructor(db) {
        this.collection = db.collection('users');
        this.JWT_SECRET = process.env.JWT_SECRET || 'kinitos_secret_key';
        this.JWT_EXPIRES_IN = '24h';
    }

    /**
     * Registrar un nuevo usuario
     */
    async register(userData) {
        try {
            // Verificar si el email ya está registrado
            const existingUser = await this.collection.findOne({ email: userData.email });
            if (existingUser) {
                throw new Error('El email ya está registrado');
            }
            
            // Crear y validar el nuevo usuario
            const user = new User(userData);
            user.validate();
            
            // Encriptar la contraseña
            await user.hashPassword();
            
            // Guardar el usuario en la base de datos
            const result = await this.collection.insertOne(user);
            user._id = result.insertedId;
            
            // Generar token de autenticación
            const token = this._generateToken(user);
            
            return {
                user: user.toJSON(),
                token
            };
        } catch (error) {
            throw new Error(`Error al registrar usuario: ${error.message}`);
        }
    }

    /**
     * Iniciar sesión de usuario
     */
    async login(email, password) {
        try {
            // Buscar usuario por email
            const userData = await this.collection.findOne({ email });
            if (!userData) {
                throw new Error('Credenciales inválidas');
            }
            
            const user = new User(userData);
            
            // Verificar contraseña
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                throw new Error('Credenciales inválidas');
            }
            
            // Generar token de autenticación
            const token = this._generateToken(user);
            
            return {
                user: user.toJSON(),
                token
            };
        } catch (error) {
            throw new Error(`Error al iniciar sesión: ${error.message}`);
        }
    }

    /**
     * Obtener perfil de usuario
     */
    async getUserProfile(userId) {
        try {
            const objectId = new ObjectId(userId);
            const userData = await this.collection.findOne({ _id: objectId });
            
            if (!userData) {
                throw new Error('Usuario no encontrado');
            }
            
            const user = new User(userData);
            return user.toJSON();
        } catch (error) {
            throw new Error(`Error al obtener perfil de usuario: ${error.message}`);
        }
    }

    /**
     * Actualizar perfil de usuario
     */
    async updateUserProfile(userId, userData) {
        try {
            const objectId = new ObjectId(userId);
            const existingUserData = await this.collection.findOne({ _id: objectId });
            
            if (!existingUserData) {
                throw new Error('Usuario no encontrado');
            }
            
            // Si se intenta cambiar el email, verificar que no exista otro usuario con ese email
            if (userData.email && userData.email !== existingUserData.email) {
                const emailExists = await this.collection.findOne({ 
                    email: userData.email,
                    _id: { $ne: objectId }
                });
                
                if (emailExists) {
                    throw new Error('El email ya está en uso por otro usuario');
                }
            }
            
            // Combinar datos existentes con los nuevos
            const updatedData = { ...existingUserData, ...userData, updatedAt: new Date() };
            delete updatedData.password; // No actualizar la contraseña en este método
            
            const user = new User(updatedData);
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: user }
            );
            
            return user.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar perfil de usuario: ${error.message}`);
        }
    }

    /**
     * Cambiar contraseña de usuario
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const objectId = new ObjectId(userId);
            const userData = await this.collection.findOne({ _id: objectId });
            
            if (!userData) {
                throw new Error('Usuario no encontrado');
            }
            
            const user = new User(userData);
            
            // Verificar contraseña actual
            const isPasswordValid = await user.comparePassword(currentPassword);
            if (!isPasswordValid) {
                throw new Error('La contraseña actual es incorrecta');
            }
            
            // Actualizar contraseña
            user.password = newPassword;
            await user.hashPassword();
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: { password: user.password, updatedAt: new Date() } }
            );
            
            return { success: true, message: 'Contraseña actualizada correctamente' };
        } catch (error) {
            throw new Error(`Error al cambiar contraseña: ${error.message}`);
        }
    }

    /**
     * Eliminar cuenta de usuario
     */
    async deleteUser(userId) {
        try {
            const objectId = new ObjectId(userId);
            const result = await this.collection.deleteOne({ _id: objectId });
            
            if (result.deletedCount === 0) {
                throw new Error('Usuario no encontrado');
            }
            
            return { success: true, message: 'Cuenta eliminada correctamente' };
        } catch (error) {
            throw new Error(`Error al eliminar cuenta: ${error.message}`);
        }
    }

    /**
     * Generar token JWT
     * @private
     */
    _generateToken(user) {
        const payload = {
            userId: user._id,
            email: user.email,
            role: user.role
        };
        
        return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
    }

    /**
     * Verificar token JWT
     */
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET);
            return decoded;
        } catch (error) {
            throw new Error('Token inválido o expirado');
        }
    }
}

module.exports = UserController;