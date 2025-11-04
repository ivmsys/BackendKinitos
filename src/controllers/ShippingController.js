/**
 * Controlador de Envíos para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');
const Shipping = require('../models/Shipping');

class ShippingController {
    constructor(db) {
        this.collection = db.collection('shipping');
        this.ordersCollection = db.collection('orders');
    }

    /**
     * Crear un nuevo registro de envío
     */
    async createShipping(shippingData) {
        try {
            // Verificar que la orden exista
            const orderId = new ObjectId(shippingData.orderId);
            const order = await this.ordersCollection.findOne({ _id: orderId });
            
            if (!order) {
                throw new Error('Orden no encontrada');
            }
            
            // Verificar que no exista ya un envío para esta orden
            const existingShipping = await this.collection.findOne({ orderId: orderId.toString() });
            if (existingShipping) {
                throw new Error('Ya existe un registro de envío para esta orden');
            }
            
            // Crear y validar el envío
            const shipping = new Shipping(shippingData);
            shipping.validate();
            
            // Guardar en la base de datos
            const result = await this.collection.insertOne(shipping);
            shipping._id = result.insertedId;
            
            // Actualizar el estado de la orden a 'shipped' si corresponde
            if (shipping.status === 'shipped') {
                await this.ordersCollection.updateOne(
                    { _id: orderId },
                    { $set: { orderStatus: 'shipped', updatedAt: new Date() } }
                );
            }
            
            return shipping.toJSON();
        } catch (error) {
            throw new Error(`Error al crear el registro de envío: ${error.message}`);
        }
    }

    /**
     * Obtener un registro de envío por ID
     */
    async getShippingById(id) {
        try {
            const objectId = new ObjectId(id);
            const shipping = await this.collection.findOne({ _id: objectId });
            
            if (!shipping) {
                throw new Error('Registro de envío no encontrado');
            }
            
            return new Shipping(shipping).toJSON();
        } catch (error) {
            throw new Error(`Error al obtener el registro de envío: ${error.message}`);
        }
    }

    /**
     * Obtener un registro de envío por ID de orden
     */
    async getShippingByOrderId(orderId) {
        try {
            const shipping = await this.collection.findOne({ orderId: orderId });
            
            if (!shipping) {
                throw new Error('Registro de envío no encontrado para esta orden');
            }
            
            return new Shipping(shipping).toJSON();
        } catch (error) {
            throw new Error(`Error al obtener el registro de envío: ${error.message}`);
        }
    }

    /**
     * Actualizar un registro de envío
     */
    async updateShipping(id, shippingData) {
        try {
            const objectId = new ObjectId(id);
            const existingShipping = await this.collection.findOne({ _id: objectId });
            
            if (!existingShipping) {
                throw new Error('Registro de envío no encontrado');
            }
            
            // Combinar datos existentes con los nuevos
            const updatedData = { ...existingShipping, ...shippingData, updatedAt: new Date() };
            const shipping = new Shipping(updatedData);
            shipping.validate();
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: shipping }
            );
            
            // Si se actualiza el estado a 'delivered', actualizar también la orden
            if (shipping.status === 'delivered' && existingShipping.status !== 'delivered') {
                const orderId = new ObjectId(shipping.orderId);
                await this.ordersCollection.updateOne(
                    { _id: orderId },
                    { $set: { orderStatus: 'delivered', updatedAt: new Date() } }
                );
            }
            
            return shipping.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar el registro de envío: ${error.message}`);
        }
    }

    /**
     * Actualizar el estado de un envío
     */
    async updateShippingStatus(id, status) {
        try {
            const objectId = new ObjectId(id);
            const existingShipping = await this.collection.findOne({ _id: objectId });
            
            if (!existingShipping) {
                throw new Error('Registro de envío no encontrado');
            }
            
            const shipping = new Shipping(existingShipping);
            shipping.updateStatus(status);
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: { 
                    status: shipping.status, 
                    updatedAt: shipping.updatedAt,
                    actualDeliveryDate: shipping.actualDeliveryDate 
                } }
            );
            
            // Actualizar también el estado de la orden si corresponde
            if (status === 'delivered') {
                const orderId = new ObjectId(shipping.orderId);
                await this.ordersCollection.updateOne(
                    { _id: orderId },
                    { $set: { orderStatus: 'delivered', updatedAt: new Date() } }
                );
            } else if (status === 'shipped') {
                const orderId = new ObjectId(shipping.orderId);
                await this.ordersCollection.updateOne(
                    { _id: orderId },
                    { $set: { orderStatus: 'shipped', updatedAt: new Date() } }
                );
            }
            
            return shipping.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar el estado del envío: ${error.message}`);
        }
    }

    /**
     * Actualizar el número de seguimiento de un envío
     */
    async updateTrackingNumber(id, trackingNumber) {
        try {
            const objectId = new ObjectId(id);
            const result = await this.collection.updateOne(
                { _id: objectId },
                { $set: { trackingNumber, updatedAt: new Date() } }
            );
            
            if (result.matchedCount === 0) {
                throw new Error('Registro de envío no encontrado');
            }
            
            return { success: true, message: 'Número de seguimiento actualizado correctamente' };
        } catch (error) {
            throw new Error(`Error al actualizar el número de seguimiento: ${error.message}`);
        }
    }

    /**
     * Obtener todos los envíos con filtros opcionales (para administradores)
     */
    async getAllShippings(filters = {}, sort = {}, limit = 20, page = 1) {
        try {
            const skip = (page - 1) * limit;
            const query = {};
            
            // Aplicar filtros
            if (filters.status) query.status = filters.status;
            if (filters.carrier) query.carrier = filters.carrier;
            if (filters.trackingNumber) query.trackingNumber = filters.trackingNumber;
            
            const [shippings, total] = await Promise.all([
                this.collection.find(query)
                    .sort(sort.field ? { [sort.field]: sort.order === 'desc' ? -1 : 1 } : { createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                this.collection.countDocuments(query)
            ]);
            
            return {
                shippings: shippings.map(s => new Shipping(s).toJSON()),
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new Error(`Error al obtener los registros de envío: ${error.message}`);
        }
    }
}

module.exports = ShippingController;