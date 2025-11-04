/**
 * Controlador de Órdenes para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');
const Order = require('../models/Order');

class OrderController {
    constructor(db) {
        this.collection = db.collection('orders');
        this.productsCollection = db.collection('products');
    }

    /**
     * Crear una nueva orden
     */
    async createOrder(orderData) {
        try {
            // Verificar stock de productos
            await this._verifyProductStock(orderData.items);
            
            // Crear y validar la orden
            const order = new Order(orderData);
            order.validate();
            
            // Calcular el total
            order.calculateTotal();
            
            // Guardar la orden en la base de datos
            const result = await this.collection.insertOne(order);
            order._id = result.insertedId;
            
            // Actualizar el stock de productos
            await this._updateProductStock(order.items);
            
            return order.toJSON();
        } catch (error) {
            throw new Error(`Error al crear la orden: ${error.message}`);
        }
    }

    /**
     * Obtener todas las órdenes de un usuario
     */
    async getUserOrders(userId, limit = 10, page = 1) {
        try {
            const skip = (page - 1) * limit;
            
            const [orders, total] = await Promise.all([
                this.collection.find({ userId: userId })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                this.collection.countDocuments({ userId: userId })
            ]);
            
            return {
                orders: orders.map(o => new Order(o).toJSON()),
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new Error(`Error al obtener órdenes del usuario: ${error.message}`);
        }
    }

    /**
     * Obtener una orden por su ID
     */
    async getOrderById(orderId, userId = null) {
        try {
            const objectId = new ObjectId(orderId);
            
            // Construir la consulta (si se proporciona userId, verificar que la orden pertenezca a ese usuario)
            const query = { _id: objectId };
            if (userId) {
                query.userId = userId;
            }
            
            const orderData = await this.collection.findOne(query);
            
            if (!orderData) {
                throw new Error('Orden no encontrada');
            }
            
            return new Order(orderData).toJSON();
        } catch (error) {
            throw new Error(`Error al obtener la orden: ${error.message}`);
        }
    }

    /**
     * Actualizar el estado de una orden
     */
    async updateOrderStatus(orderId, status, userId = null) {
        try {
            const objectId = new ObjectId(orderId);
            
            // Construir la consulta (si se proporciona userId, verificar que la orden pertenezca a ese usuario)
            const query = { _id: objectId };
            if (userId) {
                query.userId = userId;
            }
            
            const orderData = await this.collection.findOne(query);
            
            if (!orderData) {
                throw new Error('Orden no encontrada');
            }
            
            const order = new Order(orderData);
            order.updateStatus(status);
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: { orderStatus: order.orderStatus, updatedAt: order.updatedAt } }
            );
            
            return order.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar el estado de la orden: ${error.message}`);
        }
    }

    /**
     * Actualizar el estado de pago de una orden
     */
    async updatePaymentStatus(orderId, status) {
        try {
            const objectId = new ObjectId(orderId);
            const orderData = await this.collection.findOne({ _id: objectId });
            
            if (!orderData) {
                throw new Error('Orden no encontrada');
            }
            
            const order = new Order(orderData);
            order.updatePaymentStatus(status);
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: { paymentStatus: order.paymentStatus, updatedAt: order.updatedAt } }
            );
            
            return order.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar el estado de pago: ${error.message}`);
        }
    }

    /**
     * Cancelar una orden
     */
    async cancelOrder(orderId, userId) {
        try {
            const objectId = new ObjectId(orderId);
            
            // Verificar que la orden exista y pertenezca al usuario
            const orderData = await this.collection.findOne({ 
                _id: objectId,
                userId: userId
            });
            
            if (!orderData) {
                throw new Error('Orden no encontrada');
            }
            
            // Verificar que la orden esté en un estado que permita cancelación
            if (orderData.orderStatus !== 'processing') {
                throw new Error('No se puede cancelar una orden que ya ha sido procesada o enviada');
            }
            
            const order = new Order(orderData);
            order.updateStatus('cancelled');
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: { orderStatus: order.orderStatus, updatedAt: order.updatedAt } }
            );
            
            // Restaurar el stock de productos
            await this._restoreProductStock(order.items);
            
            return order.toJSON();
        } catch (error) {
            throw new Error(`Error al cancelar la orden: ${error.message}`);
        }
    }

    /**
     * Verificar stock de productos
     * @private
     */
    async _verifyProductStock(items) {
        for (const item of items) {
            const productId = new ObjectId(item.productId);
            const product = await this.productsCollection.findOne({ _id: productId });
            
            if (!product) {
                throw new Error(`Producto no encontrado: ${item.productId}`);
            }
            
            if (product.stock < item.quantity) {
                throw new Error(`Stock insuficiente para el producto: ${product.name}`);
            }
        }
    }

    /**
     * Actualizar stock de productos después de una compra
     * @private
     */
    async _updateProductStock(items) {
        const bulkOps = [];
        
        for (const item of items) {
            const productId = new ObjectId(item.productId);
            
            bulkOps.push({
                updateOne: {
                    filter: { _id: productId },
                    update: { $inc: { stock: -item.quantity } }
                }
            });
        }
        
        if (bulkOps.length > 0) {
            await this.productsCollection.bulkWrite(bulkOps);
        }
    }

    /**
     * Restaurar stock de productos después de una cancelación
     * @private
     */
    async _restoreProductStock(items) {
        const bulkOps = [];
        
        for (const item of items) {
            const productId = new ObjectId(item.productId);
            
            bulkOps.push({
                updateOne: {
                    filter: { _id: productId },
                    update: { $inc: { stock: item.quantity } }
                }
            });
        }
        
        if (bulkOps.length > 0) {
            await this.productsCollection.bulkWrite(bulkOps);
        }
    }
}

module.exports = OrderController;