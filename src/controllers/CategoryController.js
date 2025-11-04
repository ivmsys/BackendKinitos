/**
 * Controlador de Categorías para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');
const Category = require('../models/Category');

class CategoryController {
    constructor(db) {
        this.collection = db.collection('categories');
    }

    /**
     * Obtener todas las categorías
     */
    async getAllCategories(includeInactive = false) {
        try {
            // Construir la consulta
            const query = includeInactive ? {} : { active: true };
            
            // Obtener categorías
            const categories = await this.collection.find(query).toArray();
            
            return categories.map(c => new Category(c).toJSON());
        } catch (error) {
            throw new Error(`Error al obtener categorías: ${error.message}`);
        }
    }

    /**
     * Obtener una categoría por su ID
     */
    async getCategoryById(id) {
        try {
            const objectId = new ObjectId(id);
            const category = await this.collection.findOne({ _id: objectId });
            
            if (!category) {
                throw new Error('Categoría no encontrada');
            }
            
            return new Category(category).toJSON();
        } catch (error) {
            throw new Error(`Error al obtener la categoría: ${error.message}`);
        }
    }

    /**
     * Obtener una categoría por su slug
     */
    async getCategoryBySlug(slug) {
        try {
            const category = await this.collection.findOne({ slug: slug });
            
            if (!category) {
                throw new Error('Categoría no encontrada');
            }
            
            return new Category(category).toJSON();
        } catch (error) {
            throw new Error(`Error al obtener la categoría: ${error.message}`);
        }
    }

    /**
     * Crear una nueva categoría
     */
    async createCategory(categoryData) {
        try {
            // Verificar si ya existe una categoría con el mismo nombre o slug
            const slug = new Category(categoryData).generateSlug(categoryData.name);
            const existingCategory = await this.collection.findOne({
                $or: [
                    { name: categoryData.name },
                    { slug: slug }
                ]
            });
            
            if (existingCategory) {
                throw new Error('Ya existe una categoría con ese nombre');
            }
            
            // Crear y validar la categoría
            const category = new Category(categoryData);
            category.validate();
            
            // Guardar en la base de datos
            const result = await this.collection.insertOne(category);
            category._id = result.insertedId;
            
            return category.toJSON();
        } catch (error) {
            throw new Error(`Error al crear la categoría: ${error.message}`);
        }
    }

    /**
     * Actualizar una categoría existente
     */
    async updateCategory(id, categoryData) {
        try {
            const objectId = new ObjectId(id);
            
            // Verificar si la categoría existe
            const existingCategory = await this.collection.findOne({ _id: objectId });
            
            if (!existingCategory) {
                throw new Error('Categoría no encontrada');
            }
            
            // Si se está actualizando el nombre, verificar que no exista otra categoría con ese nombre
            if (categoryData.name && categoryData.name !== existingCategory.name) {
                const slug = new Category(categoryData).generateSlug(categoryData.name);
                const duplicateCategory = await this.collection.findOne({
                    _id: { $ne: objectId },
                    $or: [
                        { name: categoryData.name },
                        { slug: slug }
                    ]
                });
                
                if (duplicateCategory) {
                    throw new Error('Ya existe otra categoría con ese nombre');
                }
                
                // Actualizar el slug si se cambia el nombre
                categoryData.slug = slug;
            }
            
            // Combinar datos existentes con los nuevos
            const updatedData = { ...existingCategory, ...categoryData, updatedAt: new Date() };
            const category = new Category(updatedData);
            category.validate();
            
            // Actualizar en la base de datos
            await this.collection.updateOne(
                { _id: objectId },
                { $set: category }
            );
            
            return category.toJSON();
        } catch (error) {
            throw new Error(`Error al actualizar la categoría: ${error.message}`);
        }
    }

    /**
     * Eliminar una categoría
     */
    async deleteCategory(id) {
        try {
            const objectId = new ObjectId(id);
            
            // Verificar si existen productos asociados a esta categoría
            // Esto requeriría acceso a la colección de productos
            // Por ahora, simplemente eliminamos la categoría
            
            const result = await this.collection.deleteOne({ _id: objectId });
            
            if (result.deletedCount === 0) {
                throw new Error('Categoría no encontrada');
            }
            
            return { success: true, message: 'Categoría eliminada correctamente' };
        } catch (error) {
            throw new Error(`Error al eliminar la categoría: ${error.message}`);
        }
    }

    /**
     * Activar o desactivar una categoría
     */
    async toggleCategoryStatus(id, active) {
        try {
            const objectId = new ObjectId(id);
            
            const result = await this.collection.updateOne(
                { _id: objectId },
                { $set: { active: active, updatedAt: new Date() } }
            );
            
            if (result.matchedCount === 0) {
                throw new Error('Categoría no encontrada');
            }
            
            return { 
                success: true, 
                message: `Categoría ${active ? 'activada' : 'desactivada'} correctamente` 
            };
        } catch (error) {
            throw new Error(`Error al cambiar estado de la categoría: ${error.message}`);
        }
    }

    /**
     * Obtener subcategorías de una categoría
     */
    async getSubcategories(parentId) {
        try {
            const categories = await this.collection.find({ parentId: parentId, active: true }).toArray();
            
            return categories.map(c => new Category(c).toJSON());
        } catch (error) {
            throw new Error(`Error al obtener subcategorías: ${error.message}`);
        }
    }
}

module.exports = CategoryController;