/**
 * Controlador de Productos para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');
const Product = require('../models/Product');

class ProductController {
    constructor(db) {
        this.collection = db.collection('products');
    }

    /**
     * Obtener todos los productos con filtros opcionales
     */
    async getAllProducts(filters = {}, sort = {}, limit = 50, page = 1) {
        try {
            const skip = (page - 1) * limit;
            const query = this._buildQuery(filters);
            
            const [products, total] = await Promise.all([
                this.collection.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                this.collection.countDocuments(query)
            ]);
            
            return {
                products: products.map(p => new Product(p).toJSON()),
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new Error(`Error al obtener productos: ${error.message}`);
        }
    }

    /**
     * Obtener un producto por su ID
     */
    async getProductById(id) {
        try {
            const objectId = new ObjectId(id);
            const product = await this.collection.findOne({ _id: objectId });
            
            if (!product) {
                throw new Error('Producto no encontrado');
            }
            
            return new Product(product).toJSON();
        } catch (error) {
            if (error.message === 'Producto no encontrado') {
                throw error;
            }
            throw new Error(`Error al obtener el producto: ${error.message}`);
        }
    }

    /**
     * Crear un nuevo producto
     */
    async createProduct(productData) {
        try {
            const product = new Product(productData);
            product.validate();
            
            const result = await this.collection.insertOne(product);
            product._id = result.insertedId;
            
            return product.toJSON();
        } catch (error) {
            throw new Error(`Error al crear el producto: ${error.message}`);
        }
    }

    /**
     * Actualizar un producto existente
     */
    async updateProduct(id, productData) {
        try {
            const objectId = new ObjectId(id);
            const existingProduct = await this.collection.findOne({ _id: objectId });
            
            if (!existingProduct) {
                throw new Error('Producto no encontrado');
            }
            
            // Combinar datos existentes con los nuevos
            const updatedData = { ...existingProduct, ...productData, updatedAt: new Date() };
            const product = new Product(updatedData);
            product.validate();
            
            await this.collection.updateOne(
                { _id: objectId },
                { $set: product }
            );
            
            return product.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar el producto: ${error.message}`);
        }
    }

    /**
     * Eliminar un producto
     */
    async deleteProduct(id) {
        try {
            const objectId = new ObjectId(id);
            const result = await this.collection.deleteOne({ _id: objectId });
            
            if (result.deletedCount === 0) {
                throw new Error('Producto no encontrado');
            }
            
            return { success: true, message: 'Producto eliminado correctamente' };
        } catch (error) {
            throw new Error(`Error al eliminar el producto: ${error.message}`);
        }
    }

    /**
     * Obtener productos destacados
     */
    async getFeaturedProducts(limit = 8) {
        try {
            const products = await this.collection.find({ featured: true })
                .limit(limit)
                .toArray();
                
            return products.map(p => new Product(p).toJSON());
        } catch (error) {
            throw new Error(`Error al obtener productos destacados: ${error.message}`);
        }
    }

    /**
     * Obtener productos por categoría
     */
    async getProductsByCategory(categoryId, limit = 50, page = 1) {
        try {
            return await this.getAllProducts({ category: categoryId }, {}, limit, page);
        } catch (error) {
            throw new Error(`Error al obtener productos por categoría: ${error.message}`);
        }
    }

    /**
     * Buscar productos
     */
    async searchProducts(searchTerm, limit = 50, page = 1) {
        try {
            const query = {
                $or: [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } }
                ]
            };
            
            const skip = (page - 1) * limit;
            
            const [products, total] = await Promise.all([
                this.collection.find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                this.collection.countDocuments(query)
            ]);
            
            return {
                products: products.map(p => new Product(p).toJSON()),
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new Error(`Error en la búsqueda de productos: ${error.message}`);
        }
    }

    /**
     * Construir query para filtros
     * @private
     */
    _buildQuery(filters) {
        const query = {};
        
        if (filters.category) {
            query.category = filters.category;
        }
        
        if (filters.gender) {
            query.gender = filters.gender;
        }
        
        if (filters.ageRange) {
            query.ageRange = filters.ageRange;
        }
        
        if (filters.size) {
            query.size = filters.size;
        }
        
        if (filters.color) {
            query.color = filters.color;
        }
        
        if (filters.minPrice || filters.maxPrice) {
            query.price = {};
            
            if (filters.minPrice) {
                query.price.$gte = parseFloat(filters.minPrice);
            }
            
            if (filters.maxPrice) {
                query.price.$lte = parseFloat(filters.maxPrice);
            }
        }
        
        return query;
    }
}

module.exports = ProductController;