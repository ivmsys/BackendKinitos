const oracledb = require('oracledb');

/**
 * Función para conectar a la base de datos Oracle
 * @returns {Promise<Connection>} Conexión a Oracle
 */
async function conectar() {
    try {
        const connection = await oracledb.getConnection({
            user: 'C##KINITOS',
            password: 'Rodrigo01',  
            connectString: 'localhost:1521/XE'
        });

        console.log('Conexión exitosa a Oracle');
        return connection;
    } catch (err) {
        console.error('Error conectando a Oracle', err);
        throw err; // Propagar el error para manejarlo en el nivel superior
    }
}   

module.exports = {conectar};