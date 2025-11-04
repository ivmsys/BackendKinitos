/**
 * Modelo de Carrito de Compras para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');

class Cart {
    constructor(data) {
        this._id = data._id || null;
        this.userId = data.userId;
        this.items = data.items || [];
        this.totalAmount = data.totalAmount || 0;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    // Validación básica del carrito
    validate() {
        if (!this.userId) {
            throw new Error('El ID de usuario es obligatorio');
        }
        
        return true;
    }

    // Método para añadir un producto al carrito
    addItem(product, quantity = 1, size) {
        // Verificar si el producto ya está en el carrito
        const existingItemIndex = this.items.findIndex(item => 
            item.productId.toString() === product._id.toString() && item.size === size
        );

        if (existingItemIndex > -1) {
            // Actualizar cantidad si el producto ya existe
            this.items[existingItemIndex].quantity += quantity;
        } else {
            // Añadir nuevo producto al carrito
            this.items.push({
                productId: product._id,
                name: product.name,
                price: product.getDiscountedPrice(),
                quantity: quantity,
                size: size,
                image: product.images[0] || ''
            });
        }

        this.calculateTotal();
        this.updatedAt = new Date();
    }

    // Método para eliminar un producto del carrito
    removeItem(itemId) {
        this.items = this.items.filter(item => item.productId.toString() !== itemId.toString());
        this.calculateTotal();
        this.updatedAt = new Date();
    }

    // Método para actualizar la cantidad de un producto
    updateItemQuantity(itemId, quantity, size) {
        const itemIndex = this.items.findIndex(item => 
            item.productId.toString() === itemId.toString() && item.size === size
        );

        if (itemIndex > -1) {
            if (quantity <= 0) {
                // Eliminar el producto si la cantidad es 0 o menos
                this.removeItem(itemId);
            } else {
                // Actualizar la cantidad
                this.items[itemIndex].quantity = quantity;
                this.calculateTotal();
            }
        }
        
        this.updatedAt = new Date();
    }

    // Método para calcular el total del carrito
    calculateTotal() {
        this.totalAmount = this.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
        return this.totalAmount;
    }

    // Método para vaciar el carrito
    clear() {
        this.items = [];
        this.totalAmount = 0;
        this.updatedAt = new Date();
    }

    // Método para convertir a formato JSON
    toJSON() {
        return {
            _id: this._id,
            userId: this.userId,
            items: this.items,
            totalAmount: this.totalAmount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Cart;