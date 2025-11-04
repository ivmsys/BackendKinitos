/**
 * Controlador de Pagos para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');
const Payment = require('../models/Payment');

class PaymentController {
    constructor(db) {
        this.collection = db.collection('payments');
        this.ordersCollection = db.collection('orders');
    }

    /**
     * Crear un nuevo registro de pago
     */
    async createPayment(paymentData) {
        try {
            // Verificar que la orden exista
            const orderId = new ObjectId(paymentData.orderId);
            const order = await this.ordersCollection.findOne({ _id: orderId });
            
            if (!order) {
                throw new Error('Orden no encontrada');
            }
            
            // Verificar que no exista ya un pago para esta orden
            const existingPayment = await this.collection.findOne({ orderId: paymentData.orderId });
            if (existingPayment) {
                throw new Error('Ya existe un registro de pago para esta orden');
            }
            
            // Crear y validar el pago
            const payment = new Payment(paymentData);
            payment.validate();
            
            // Guardar en la base de datos
            const result = await this.collection.insertOne(payment);
            payment._id = result.insertedId;
            
            // Actualizar el estado de pago de la orden si corresponde
            if (payment.status === 'completed') {
                await this.ordersCollection.updateOne(
                    { _id: orderId },
                    { $set: { paymentStatus: 'paid', updatedAt: new Date() } }
                );
            }
            
            return payment.toJSON();
        } catch (error) {
            throw new Error(`Error al crear el registro de pago: ${error.message}`);
        }
    }

    /**
     * Obtener un registro de pago por ID
     */
    async getPaymentById(id) {
        try {
            const objectId = new ObjectId(id);
            const payment = await this.collection.findOne({ _id: objectId });
            
            if (!payment) {
                throw new Error('Registro de pago no encontrado');
            }
            
            return new Payment(payment).toJSON();
        } catch (error) {
            throw new Error(`Error al obtener el registro de pago: ${error.message}`);
        }
    }

    /**
     * Obtener un registro de pago por ID de orden
     */
    async getPaymentByOrderId(orderId) {
        try {
            const payment = await this.collection.findOne({ orderId: orderId });
            
            if (!payment) {
                throw new Error('Registro de pago no encontrado para esta orden');
            }
            
            return new Payment(payment).toJSON();
        } catch (error) {
            throw new Error(`Error al obtener el registro de pago: ${error.message}`);
        }
    }

    /**
     * Actualizar un registro de pago
     */
    async updatePayment(id, paymentData) {
        try {
            const objectId = new ObjectId(id);
            const existingPayment = await this.collection.findOne({ _id: objectId });
            
            if (!existingPayment) {
                throw new Error('Registro de pago no encontrado');
            }
            
            // Combinar datos existentes con los nuevos
            const updatedData = { ...existingPayment, ...paymentData, updatedAt: new Date() };
            const payment = new Payment(updatedData);
            payment.validate();
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: payment }
            );
            
            // Si se actualiza el estado a 'completed', actualizar también la orden
            if (payment.status === 'completed' && existingPayment.status !== 'completed') {
                const orderId = new ObjectId(payment.orderId);
                await this.ordersCollection.updateOne(
                    { _id: orderId },
                    { $set: { paymentStatus: 'paid', updatedAt: new Date() } }
                );
            } else if (payment.status === 'failed' && existingPayment.status !== 'failed') {
                const orderId = new ObjectId(payment.orderId);
                await this.ordersCollection.updateOne(
                    { _id: orderId },
                    { $set: { paymentStatus: 'failed', updatedAt: new Date() } }
                );
            } else if (payment.status === 'refunded' && existingPayment.status !== 'refunded') {
                const orderId = new ObjectId(payment.orderId);
                await this.ordersCollection.updateOne(
                    { _id: orderId },
                    { $set: { paymentStatus: 'refunded', updatedAt: new Date() } }
                );
            }
            
            return payment.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar el registro de pago: ${error.message}`);
        }
    }

    /**
     * Actualizar el estado de un pago
     */
    async updatePaymentStatus(id, status) {
        try {
            const objectId = new ObjectId(id);
            const existingPayment = await this.collection.findOne({ _id: objectId });
            
            if (!existingPayment) {
                throw new Error('Registro de pago no encontrado');
            }
            
            const payment = new Payment(existingPayment);
            payment.updateStatus(status);
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: { 
                    status: payment.status, 
                    updatedAt: payment.updatedAt,
                    paymentDate: payment.paymentDate 
                } }
            );
            
            // Actualizar también el estado de pago de la orden
            const orderId = new ObjectId(payment.orderId);
            let orderPaymentStatus = 'pending';
            
            if (status === 'completed') {
                orderPaymentStatus = 'paid';
            } else if (status === 'failed') {
                orderPaymentStatus = 'failed';
            } else if (status === 'refunded') {
                orderPaymentStatus = 'refunded';
            }
            
            await this.ordersCollection.updateOne(
                { _id: orderId },
                { $set: { paymentStatus: orderPaymentStatus, updatedAt: new Date() } }
            );
            
            return payment.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar el estado del pago: ${error.message}`);
        }
    }

    /**
     * Registrar un reembolso
     */
    async processRefund(id, refundData) {
        try {
            const objectId = new ObjectId(id);
            const existingPayment = await this.collection.findOne({ _id: objectId });
            
            if (!existingPayment) {
                throw new Error('Registro de pago no encontrado');
            }
            
            if (existingPayment.status !== 'completed') {
                throw new Error('Solo se pueden reembolsar pagos completados');
            }
            
            const payment = new Payment(existingPayment);
            payment.updateStatus('refunded');
            payment.notes = refundData.notes || 'Reembolso procesado';
            payment.updatedAt = new Date();
            
            // Guardar información del reembolso
            payment.paymentDetails.refund = {
                amount: refundData.amount || payment.amount,
                reason: refundData.reason || 'Solicitud del cliente',
                refundDate: new Date(),
                refundTransactionId: refundData.refundTransactionId || ''
            };
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: payment }
            );
            
            // Actualizar el estado de pago de la orden
            const orderId = new ObjectId(payment.orderId);
            await this.ordersCollection.updateOne(
                { _id: orderId },
                { $set: { paymentStatus: 'refunded', updatedAt: new Date() } }
            );
            
            return payment.toJSON();
        } catch (error) {
            throw new Error(`Error al procesar el reembolso: ${error.message}`);
        }
    }

    /**
     * Obtener todos los pagos con filtros opcionales (para administradores)
     */
    async getAllPayments(filters = {}, sort = {}, limit = 20, page = 1) {
        try {
            const skip = (page - 1) * limit;
            const query = {};
            
            // Aplicar filtros
            if (filters.status) query.status = filters.status;
            if (filters.method) query.method = filters.method;
            if (filters.minAmount || filters.maxAmount) {
                query.amount = {};
                if (filters.minAmount) query.amount.$gte = parseFloat(filters.minAmount);
                if (filters.maxAmount) query.amount.$lte = parseFloat(filters.maxAmount);
            }
            if (filters.startDate || filters.endDate) {
                query.createdAt = {};
                if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
                if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
            }
            
            const [payments, total] = await Promise.all([
                this.collection.find(query)
                    .sort(sort.field ? { [sort.field]: sort.order === 'desc' ? -1 : 1 } : { createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                this.collection.countDocuments(query)
            ]);
            
            return {
                payments: payments.map(p => new Payment(p).toJSON()),
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new Error(`Error al obtener los registros de pago: ${error.message}`);
        }
    }
}

module.exports = PaymentController;