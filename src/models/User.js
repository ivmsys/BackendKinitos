/**
 * Modelo de Usuario para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

class User {
    constructor(data) {
        this._id = data._id || null;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role || 'customer'; // 'admin', 'customer'
        this.address = data.address || {};
        this.phone = data.phone || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    // Validación básica del usuario
    validate() {
        if (!this.firstName || this.firstName.trim() === '') {
            throw new Error('El nombre es obligatorio');
        }
        
        if (!this.lastName || this.lastName.trim() === '') {
            throw new Error('El apellido es obligatorio');
        }
        
        if (!this.email || !this.validateEmail(this.email)) {
            throw new Error('El email no es válido');
        }
        
        if (!this.password || this.password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        
        return true;
    }

    // Validar formato de email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Método para encriptar la contraseña
    async hashPassword() {
        if (this.password) {
            this.password = await bcrypt.hash(this.password, 10);
        }
    }

    // Método para verificar la contraseña
    async comparePassword(plainPassword) {
        return await bcrypt.compare(plainPassword, this.password);
    }

    // Método para convertir a formato JSON (sin incluir la contraseña)
    toJSON() {
        return {
            _id: this._id,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            role: this.role,
            address: this.address,
            phone: this.phone,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Método para obtener el nombre completo
    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }
}

module.exports = User;