/**
 * Modelo de Orden/Pedido para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');

class Order {
    constructor(data) {
        this._id = data._id || null;
        this.userId = data.userId;
        this.items = data.items || [];
        this.totalAmount = data.totalAmount || 0;
        this.shippingAddress = data.shippingAddress || {};
        this.paymentMethod = data.paymentMethod;
        this.paymentStatus = data.paymentStatus || 'pending'; // 'pending', 'paid', 'failed'
        this.orderStatus = data.orderStatus || 'processing'; // 'processing', 'shipped', 'delivered', 'cancelled'
        this.shippingCost = data.shippingCost || 0;
        this.trackingNumber = data.trackingNumber || '';
        this.notes = data.notes || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    // Validación básica de la orden
    validate() {
        if (!this.userId) {
            throw new Error('El ID de usuario es obligatorio');
        }
        
        if (!this.items || !Array.isArray(this.items) || this.items.length === 0) {
            throw new Error('La orden debe contener al menos un producto');
        }
        
        if (!this.shippingAddress || !this.shippingAddress.street || !this.shippingAddress.city) {
            throw new Error('La dirección de envío es obligatoria');
        }
        
        if (!this.paymentMethod) {
            throw new Error('El método de pago es obligatorio');
        }
        
        return true;
    }

    // Método para calcular el total de la orden
    calculateTotal() {
        let total = 0;
        for (const item of this.items) {
            total += item.price * item.quantity;
        }
        this.totalAmount = total + this.shippingCost;
        return this.totalAmount;
    }

    // Método para convertir a formato JSON
    toJSON() {
        return {
            _id: this._id,
            userId: this.userId,
            items: this.items,
            totalAmount: this.totalAmount,
            shippingAddress: this.shippingAddress,
            paymentMethod: this.paymentMethod,
            paymentStatus: this.paymentStatus,
            orderStatus: this.orderStatus,
            shippingCost: this.shippingCost,
            trackingNumber: this.trackingNumber,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Método para actualizar el estado de la orden
    updateStatus(status) {
        const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error('Estado de orden no válido');
        }
        this.orderStatus = status;
        this.updatedAt = new Date();
    }

    // Método para actualizar el estado del pago
    updatePaymentStatus(status) {
        const validStatuses = ['pending', 'paid', 'failed'];
        if (!validStatuses.includes(status)) {
            throw new Error('Estado de pago no válido');
        }
        this.paymentStatus = status;
        this.updatedAt = new Date();
    }
}

module.exports = Order;