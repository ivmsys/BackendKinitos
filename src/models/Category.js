/**
 * Modelo de Categoría para la tienda online de ropa infantil
 */
const { ObjectId } = require('mongodb');

class Category {
    constructor(data) {
        this._id = data._id || null;
        this.name = data.name;
        this.description = data.description || '';
        this.slug = data.slug || this.generateSlug(data.name);
        this.parentId = data.parentId || null; // Para subcategorías
        this.image = data.image || '';
        this.active = data.active !== undefined ? data.active : true;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    // Validación básica de la categoría
    validate() {
        if (!this.name || this.name.trim() === '') {
            throw new Error('El nombre de la categoría es obligatorio');
        }
        
        return true;
    }

    // Generar slug a partir del nombre
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[áéíóúüñ]/g, match => {
                const chars = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n' };
                return chars[match];
            })
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    // Método para convertir a formato JSON
    toJSON() {
        return {
            _id: this._id,
            name: this.name,
            description: this.description,
            slug: this.slug,
            parentId: this.parentId,
            image: this.image,
            active: this.active,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Category;