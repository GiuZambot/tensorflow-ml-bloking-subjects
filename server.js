const http = require('http');
const express = require("express");
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(express.static("www"));

app.get("/", (request, response) => {
    response.sendFile(__dirname + "/www/index.html");
});

io.on('connect', socket => {
    console.log('Client connected');

    // de um db
    // socket.emit('storedComments', commentObjectArray);  

    // Listen pelos comentários
    socket.on('comment', (data) => {
        // executa função no cliente
        socket.broadcast.emit('remoteComment', data);
    });
});

// port process.env.PORT
const listener = server.listen(process.env.PORT, () => {
    console.log("Your app is listening on port " + listener.address().port);
});