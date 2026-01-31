const WebSocket = require('ws');

// Creamos el servidor en el puerto 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log("📡 Servidor Titan Online en puerto 8080");

// Lista de usuarios conectados
let clientes = [];

wss.on('connection', (ws) => {
  // 1. Cuando alguien se conecta, lo guardamos
  clientes.push(ws);
  console.log("Nuevo Piloto conectado. Total: " + clientes.length);

  // Le damos la bienvenida solo a él
  ws.send(JSON.stringify({
    tipo: 'sistema',
    texto: 'Conectado al Nodo Central de Titan.'
  }));

  // 2. Cuando recibimos un mensaje de alguien
  ws.on('message', (message) => {
    try {
        // El mensaje llega como "buffer" (datos crudos), lo convertimos a texto
        const datos = JSON.parse(message.toString());
        
        console.log(`[${datos.canal}] ${datos.autor}: ${datos.texto}`);

        // 3. REENVIAR A TODOS (Broadcast)
        const mensajeParaEnviar = JSON.stringify({
          tipo: 'chat',
          autor: datos.autor,
          texto: datos.texto,
          canal: datos.canal,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        clientes.forEach(cliente => {
          if (cliente.readyState === WebSocket.OPEN) {
            // AQUI OCURRE LA MAGIA: 
            // El servidor se lo manda a TODOS, pero el cliente decidirá si mostrarlo o no.
            // (Esta es la forma fácil. La forma "Pro" sería guardar en qué canal está cada socket, 
            // pero para empezar, dejaremos que el cliente filtre).
            cliente.send(mensajeParaEnviar);
          }
        });
    } catch (e) {
        console.error("Error procesando mensaje:", e);
    }
  });

  // 4. Cuando alguien se desconecta
  ws.on('close', () => {
    clientes = clientes.filter(c => c !== ws);
    console.log("Piloto desconectado. Quedan: " + clientes.length);
  });
});