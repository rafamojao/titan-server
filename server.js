const WebSocket = require('ws');

// Creamos el servidor en el puerto 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log("📡 Servidor Titan Online en puerto 8080");

// Lista de usuarios conectados
let usuariosConectados = [];

wss.on('connection', (ws) => {
    console.log('Nueva conexión al núcleo Titan.');

    // Asignamos un nombre temporal al conectar
    ws.nombreUsuario = "Anónimo"; 

    ws.on('message', (message) => {
        try {
            const datos = JSON.parse(message.toString());

            // CASO 1: ALGUIEN SE CONECTA O CAMBIA DE NOMBRE
            if (datos.tipo === 'login') {
                ws.nombreUsuario = datos.autor;
                
                // Actualizar lista global
                actualizarListaUsuarios();
            }

            // CASO 2: MENSAJE DE CHAT
            if (datos.canal) { // Si tiene canal, es un chat
                console.log(`[${datos.canal}] ${datos.autor}: ${datos.texto}`);
                broadcast({
                    tipo: 'chat',
                    autor: datos.autor,
                    texto: datos.texto,
                    canal: datos.canal,
                    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }

        } catch (e) { console.error("Error:", e); }
    });

    ws.on('close', () => {
        // Cuando alguien se va, actualizamos la lista
        actualizarListaUsuarios();
    });

    // Función auxiliar para avisar a todos de quién está online
    function actualizarListaUsuarios() {
        // Creamos una lista limpia solo con los nombres
        const listaNombres = [];
        wss.clients.forEach((cliente) => {
            if (cliente.readyState === WebSocket.OPEN && cliente.nombreUsuario) {
                listaNombres.push(cliente.nombreUsuario);
            }
        });

        // Enviamos la lista a TODOS
        broadcast({
            tipo: 'lista-usuarios',
            usuarios: listaNombres
        });
    }

    // Función para enviar a todos
    function broadcast(data) {
        wss.clients.forEach(cliente => {
            if (cliente.readyState === WebSocket.OPEN) {
                cliente.send(JSON.stringify(data));
            }
        });
    }
});