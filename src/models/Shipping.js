/**
 * Modelo de Envío para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');

class Shipping {
    constructor(data) {
        this._id = data._id || null;
        this.orderId = data.orderId;
        this.carrier = data.carrier; // Empresa de transporte (ej: DHL, FedEx, etc.)
        this.trackingNumber = data.trackingNumber || '';
        this.status = data.status || 'pending'; // 'pending', 'shipped', 'delivered', 'returned'
        this.estimatedDeliveryDate = data.estimatedDeliveryDate || null;
        this.actualDeliveryDate = data.actualDeliveryDate || null;
        this.shippingAddress = data.shippingAddress || {};
        this.shippingCost = parseFloat(data.shippingCost) || 0;
        this.notes = data.notes || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    // Validación básica del envío
    validate() {
        if (!this.orderId) {
            throw new Error('El ID de orden es obligatorio');
        }
        
        if (!this.carrier) {
            throw new Error('La empresa de transporte es obligatoria');
        }
        
        if (!this.shippingAddress || !this.shippingAddress.street || !this.shippingAddress.city) {
            throw new Error('La dirección de envío es obligatoria');
        }
        
        return true;
    }

    // Método para actualizar el estado del envío
    updateStatus(status) {
        const validStatuses = ['pending', 'shipped', 'delivered', 'returned'];
        if (!validStatuses.includes(status)) {
            throw new Error('Estado de envío no válido');
        }
        this.status = status;
        this.updatedAt = new Date();
        
        // Si el estado es 'delivered', actualizar la fecha de entrega real
        if (status === 'delivered') {
            this.actualDeliveryDate = new Date();
        }
    }

    // Método para convertir a formato JSON
    toJSON() {
        return {
            _id: this._id,
            orderId: this.orderId,
            carrier: this.carrier,
            trackingNumber: this.trackingNumber,
            status: this.status,
            estimatedDeliveryDate: this.estimatedDeliveryDate,
            actualDeliveryDate: this.actualDeliveryDate,
            shippingAddress: this.shippingAddress,
            shippingCost: this.shippingCost,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Shipping;