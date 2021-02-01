const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: ["http://eyesdowneyesup.com", "http://192.168.1.42:3000", "127.0.0.1:3000"]
    }
});

const players = [];

const otherActivePlayers = socket => players
    .filter(s => s.socket !== socket && s.name);

const checkVotes = () => {
    if (players.length && players.every(s => s.vote)) {
        players.forEach(s => {
            const matchingPlayer = (players.find(s2 => s2.vote === s.id && s2.id == s.vote) || {});
            s.socket.emit("match", matchingPlayer.name);
        });
        players.forEach(s => s.vote = undefined);
        console.log("Clearing");
    }
}

io.on("connection", (socket) => {
    players.push({socket: socket, id: socket.id});
    console.log("New client connected with id " + socket.id);

    socket.on("disconnect", () => {
        const disconnectedSocket = players.find(s => s.socket === socket);
        console.log(`${disconnectedSocket.id}-${disconnectedSocket.name} disconnected`);
        otherActivePlayers(socket).forEach(s => s.socket.emit("retire", disconnectedSocket.id));
        players.splice(players.indexOf(disconnectedSocket), 1);
        checkVotes();
    })

    socket.on("name", name => {
        console.log(`${name} reporting for duty`);
        const player = players.find(s => s.socket === socket);
        player.name = name;
        players
            .forEach(s => s.socket.emit("player", { name: player.name, id: player.id }));

        socket.emit("players", otherActivePlayers(socket).map(s => ({ name: s.name, id: s.id })));
    })

    socket.on("vote", id => {
        players.find(s => s.socket === socket).vote = id;
        checkVotes();
    })
})

server.listen(port, () => console.log(`Listening on port ${port}`));
