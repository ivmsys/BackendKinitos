/**
 * Controlador de Carrito de Compras para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

class CartController {
    constructor(db) {
        this.collection = db.collection('carts');
        this.productsCollection = db.collection('products');
    }

    /**
     * Obtener el carrito de un usuario
     */
    async getCart(userId) {
        try {
            // Buscar el carrito del usuario
            const cartData = await this.collection.findOne({ userId: userId });
            
            // Si no existe, crear uno nuevo
            if (!cartData) {
                return await this.createCart(userId);
            }
            
            return new Cart(cartData).toJSON();
        } catch (error) {
            throw new Error(`Error al obtener el carrito: ${error.message}`);
        }
    }

    /**
     * Crear un nuevo carrito para un usuario
     */
    async createCart(userId) {
        try {
            // Verificar si ya existe un carrito para este usuario
            const existingCart = await this.collection.findOne({ userId: userId });
            
            if (existingCart) {
                throw new Error('El usuario ya tiene un carrito');
            }
            
            // Crear un nuevo carrito
            const cart = new Cart({ userId: userId });
            
            // Guardar en la base de datos
            const result = await this.collection.insertOne(cart);
            cart._id = result.insertedId;
            
            return cart.toJSON();
        } catch (error) {
            throw new Error(`Error al crear el carrito: ${error.message}`);
        }
    }

    /**
     * Añadir un producto al carrito
     */
    async addItem(userId, productId, quantity = 1, size) {
        try {
            // Validar datos
            if (!productId || !size) {
                throw new Error('ID de producto y talla son obligatorios');
            }
            
            // Convertir a ObjectId
            const objectId = new ObjectId(productId);
            
            // Obtener el producto
            const product = await this.productsCollection.findOne({ _id: objectId });
            
            if (!product) {
                throw new Error('Producto no encontrado');
            }
            
            // Verificar stock
            if (product.stock < quantity) {
                throw new Error(`Stock insuficiente para el producto: ${product.name}`);
            }
            
            // Obtener el carrito del usuario
            let cartData = await this.collection.findOne({ userId: userId });
            
            // Si no existe, crear uno nuevo
            if (!cartData) {
                const newCart = new Cart({ userId: userId });
                const result = await this.collection.insertOne(newCart);
                cartData = newCart;
                cartData._id = result.insertedId;
            }
            
            // Crear instancia del carrito
            const cart = new Cart(cartData);
            
            // Añadir el producto
            cart.addItem(product, quantity, size);
            
            // Actualizar en la base de datos
            await this.collection.updateOne(
                { _id: cart._id },
                { $set: { items: cart.items, totalAmount: cart.totalAmount, updatedAt: cart.updatedAt } }
            );
            
            return cart.toJSON();
        } catch (error) {
            throw new Error(`Error al añadir producto al carrito: ${error.message}`);
        }
    }

    /**
     * Eliminar un producto del carrito
     */
    async removeItem(userId, productId) {
        try {
            // Obtener el carrito del usuario
            const cartData = await this.collection.findOne({ userId: userId });
            
            if (!cartData) {
                throw new Error('Carrito no encontrado');
            }
            
            // Crear instancia del carrito
            const cart = new Cart(cartData);
            
            // Eliminar el producto
            cart.removeItem(productId);
            
            // Actualizar en la base de datos
            await this.collection.updateOne(
                { _id: cart._id },
                { $set: { items: cart.items, totalAmount: cart.totalAmount, updatedAt: cart.updatedAt } }
            );
            
            return cart.toJSON();
        } catch (error) {
            throw new Error(`Error al eliminar producto del carrito: ${error.message}`);
        }
    }

    /**
     * Actualizar la cantidad de un producto en el carrito
     */
    async updateItemQuantity(userId, productId, quantity, size) {
        try {
            // Obtener el carrito del usuario
            const cartData = await this.collection.findOne({ userId: userId });
            
            if (!cartData) {
                throw new Error('Carrito no encontrado');
            }
            
            // Crear instancia del carrito
            const cart = new Cart(cartData);
            
            // Actualizar la cantidad
            cart.updateItemQuantity(productId, quantity, size);
            
            // Actualizar en la base de datos
            await this.collection.updateOne(
                { _id: cart._id },
                { $set: { items: cart.items, totalAmount: cart.totalAmount, updatedAt: cart.updatedAt } }
            );
            
            return cart.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar cantidad en el carrito: ${error.message}`);
        }
    }

    /**
     * Vaciar el carrito
     */
    async clearCart(userId) {
        try {
            // Obtener el carrito del usuario
            const cartData = await this.collection.findOne({ userId: userId });
            
            if (!cartData) {
                throw new Error('Carrito no encontrado');
            }
            
            // Crear instancia del carrito
            const cart = new Cart(cartData);
            
            // Vaciar el carrito
            cart.clear();
            
            // Actualizar en la base de datos
            await this.collection.updateOne(
                { _id: cart._id },
                { $set: { items: cart.items, totalAmount: cart.totalAmount, updatedAt: cart.updatedAt } }
            );
            
            return cart.toJSON();
        } catch (error) {
            throw new Error(`Error al vaciar el carrito: ${error.message}`);
        }
    }
}

module.exports = CartController;