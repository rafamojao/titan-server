const WebSocket = require('ws');

// Creamos el servidor en el puerto 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log("📡 Servidor Titan Online en puerto 8080");

// Lista de usuarios (referencia, aunque usamos wss.clients para la verdad)
let usuariosConectados = [];

wss.on('connection', (ws) => {
    console.log('Nueva conexión al núcleo Titan.');

    // Asignamos un nombre temporal al conectar
    ws.nombreUsuario = "Anónimo"; 

    ws.on('message', (message) => {
        try {
            const datos = JSON.parse(message.toString());

            // --- CASO 1: LOGIN (Usuario se identifica) ---
            if (datos.tipo === 'login') {
                ws.nombreUsuario = datos.autor;
                
                // Actualizar lista global
                actualizarListaUsuarios();
            }

            // --- CASO 2: MENSAJE DE CHAT (Texto) ---
            else if (datos.canal) { 
                console.log(`[${datos.canal}] ${datos.autor}: ${datos.texto}`);
                
                // El chat se envía a TODOS (incluido el que lo escribió para que lo vea)
                broadcast({
                    tipo: 'chat',
                    autor: datos.autor,
                    texto: datos.texto,
                    canal: datos.canal,
                    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }, true); // true = enviar a mí mismo también
            }

            // --- CASO 3: SEÑALIZACIÓN WebRTC (AUDIO/VIDEO) ---
            // Esto conecta a los usuarios entre sí. 
            // IMPORTANTE: Se envía a todos MENOS al que lo envió (evitar eco lógico).
            else if (datos.tipo === 'oferta' || datos.tipo === 'respuesta' || datos.tipo === 'candidato') {
                broadcast(datos, false, ws); 
            }

        } catch (e) { console.error("Error procesando mensaje:", e); }
    });

    ws.on('close', () => {
        // Cuando alguien se va, actualizamos la lista
        actualizarListaUsuarios();
    });

    // --- FUNCIONES AUXILIARES ---

    // Función para avisar a todos de quién está online
    function actualizarListaUsuarios() {
        const listaNombres = [];
        wss.clients.forEach((cliente) => {
            if (cliente.readyState === WebSocket.OPEN && cliente.nombreUsuario) {
                listaNombres.push(cliente.nombreUsuario);
            }
        });

        // Enviamos la lista a TODOS (true)
        broadcast({
            tipo: 'lista-usuarios',
            usuarios: listaNombres
        }, true);
    }

    /**
     * Función BROADCAST MEJORADA
     * @param {object} data - El mensaje JSON a enviar
     * @param {boolean} enviarAmiMismo - Si es true, me lo envía a mí también. Si es false, me ignora.
     * @param {WebSocket} remitente - El socket del que envía el mensaje (para poder ignorarlo si es necesario)
     */
    function broadcast(data, enviarAmiMismo, remitente) {
        wss.clients.forEach(cliente => {
            if (cliente.readyState === WebSocket.OPEN) {
                // Lógica de filtrado:
                // Si 'enviarAmiMismo' es falso Y el cliente actual es el remitente... NO enviamos.
                if (!enviarAmiMismo && cliente === remitente) {
                    return; 
                }
                
                cliente.send(JSON.stringify(data));
            }
        });
    }
});