/**
 * Modelo de Producto para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');

class Product {
    constructor(data) {
        this._id = data._id || null;
        this.name = data.name;
        this.description = data.description;
        this.price = parseFloat(data.price);
        this.stock = parseInt(data.stock);
        this.category = data.category;
        this.gender = data.gender; // 'boy', 'girl', 'unisex'
        this.ageRange = data.ageRange; // '0-2', '2-5', '5-8', '8-12'
        this.size = data.size; // 'XS', 'S', 'M', 'L', 'XL'
        this.color = data.color;
        this.images = data.images || [];
        this.discount = data.discount || 0;
        this.featured = data.featured || false;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    // Validación básica del producto
    validate() {
        if (!this.name || this.name.trim() === '') {
            throw new Error('El nombre del producto es obligatorio');
        }
        
        if (!this.price || isNaN(this.price) || this.price <= 0) {
            throw new Error('El precio debe ser un número mayor que cero');
        }
        
        if (!this.stock || isNaN(this.stock) || this.stock < 0) {
            throw new Error('El stock debe ser un número no negativo');
        }
        
        if (!this.category) {
            throw new Error('La categoría es obligatoria');
        }
        
        if (!this.gender || !['boy', 'girl', 'unisex'].includes(this.gender)) {
            throw new Error('El género debe ser boy, girl o unisex');
        }
        
        return true;
    }

    // Método para convertir a formato JSON
    toJSON() {
        return {
            _id: this._id,
            name: this.name,
            description: this.description,
            price: this.price,
            stock: this.stock,
            category: this.category,
            gender: this.gender,
            ageRange: this.ageRange,
            size: this.size,
            color: this.color,
            images: this.images,
            discount: this.discount,
            featured: this.featured,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Método para calcular el precio con descuento
    getDiscountedPrice() {
        if (this.discount && this.discount > 0) {
            return this.price - (this.price * this.discount / 100);
        }
        return this.price;
    }
}

module.exports = Product;