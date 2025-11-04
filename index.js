const { app, connectDB } = require('./src/app');
const { conectar } = require('./src/OracleDb/oraclestring');
const port = 3000;

// Función principal para iniciar el servidor y las conexiones a bases de datos
async function startServer() {
    try {
        // Iniciar conexión a MongoDB
        const mongoDB = await connectDB();
        console.log('MongoDB conectado correctamente');
        
        // Guardar la conexión a MongoDB en app.locals para que esté disponible en todas las rutas
        app.locals.db = mongoDB;
        
        // Variable para controlar el estado de Oracle
        let oracleDisponible = false;
        
        // Probar conexión a Oracle
        try {
            const oracleConn = await conectar();
            if (oracleConn) {
                console.log('Oracle conectado correctamente');
                await oracleConn.close();
                oracleDisponible = true;
            }
        } catch (oracleError) {
            console.warn('Advertencia: No se pudo conectar a Oracle:', oracleError.message);
            console.warn('Las funcionalidades que dependen de Oracle no estarán disponibles');
        }
        
        // Guardar el estado de Oracle en app.locals
        app.locals.oracleDisponible = oracleDisponible;
        
        // Iniciar el servidor Express
        app.listen(port, "0.0.0.0", () => {
            console.log(`API corriendo en http://localhost:${port}`);
            console.log(`Endpoints disponibles en http://localhost:${port}/api`);
            if (!oracleDisponible) {
                console.log('NOTA: Las funcionalidades de Oracle no están disponibles. Asegúrate de que el servidor Oracle esté en ejecución.');
            }
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Iniciar el servidor
startServer();

