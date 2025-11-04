/**
 * Modelo de Pago para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');

class Payment {
    constructor(data) {
        this._id = data._id || null;
        this.orderId = data.orderId;
        this.amount = parseFloat(data.amount) || 0;
        this.currency = data.currency || 'MXN';
        this.method = data.method; // 'credit_card', 'debit_card', 'paypal', 'oxxo', etc.
        this.status = data.status || 'pending'; // 'pending', 'completed', 'failed', 'refunded'
        this.transactionId = data.transactionId || '';
        this.paymentDate = data.paymentDate || null;
        this.paymentDetails = data.paymentDetails || {};
        this.notes = data.notes || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    // Validación básica del pago
    validate() {
        if (!this.orderId) {
            throw new Error('El ID de orden es obligatorio');
        }
        
        if (!this.amount || this.amount <= 0) {
            throw new Error('El monto debe ser mayor que cero');
        }
        
        if (!this.method) {
            throw new Error('El método de pago es obligatorio');
        }
        
        return true;
    }

    // Método para actualizar el estado del pago
    updateStatus(status) {
        const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
        if (!validStatuses.includes(status)) {
            throw new Error('Estado de pago no válido');
        }
        this.status = status;
        this.updatedAt = new Date();
        
        // Si el estado es 'completed', actualizar la fecha de pago
        if (status === 'completed' && !this.paymentDate) {
            this.paymentDate = new Date();
        }
    }

    // Método para convertir a formato JSON
    toJSON() {
        return {
            _id: this._id,
            orderId: this.orderId,
            amount: this.amount,
            currency: this.currency,
            method: this.method,
            status: this.status,
            transactionId: this.transactionId,
            paymentDate: this.paymentDate,
            paymentDetails: this.paymentDetails,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Payment;