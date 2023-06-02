const express = require('express');
const cors = require('cors')
const http = require('http')
const socketio = require('socket.io')

const app = express();

app.use(cors())

const server = http.createServer(app)

const io = socketio(server, {
    cors: {
        origin: ['http://localhost:4200', 'https://hanging-man.vercel.app']
    }
})

const path = require('path');

// Serve i file statici della build di Angular
app.use(express.static(path.join(__dirname, 'client_dist')));

const Scopes = {
    GLOBAL: 'GLOBAL',
    ROOM: 'ROOM'
};

const users = new Map()

const languages = new Map([ //language - roomObj[]
    ['de', []],
    ['en', []],
    ['it', []],
    ['es', []]
])

io.on('connection', socket => {
    console.log("user connected")
    //socket.emit = send to only one, io.emit = send to everyone, socket.broadcaset.emit = send to everyone but that one connection
    socket.emit('welcome', 'welcome to the circus')

    socket.on('disconnect', () => {
        console.log("user disconnected")

        const userData = users.get(socket.id);

        if (userData) {
            io.emit(userData.language + '-user-disconnected', socket.id)

            if (userData.room != 'none') {
                const room = languages.get(userData.language).find(rooms => rooms.id == userData.room)

                if (room.peers.length == 1) {
                    const indx = languages.get(userData.language).indexOf(room)

                    if (indx != -1) {
                        languages.get(userData.language).splice(indx, 1)
                    }

                    io.emit(userData.language + '-room-closed', room)
                }
                else {
                    const indx = room.peers.findIndex(el => el == socket.id);

                    if (indx != -1) {
                        room.peers.splice(indx, 1)
                    }

                    io.emit(room.id + "-user-leave", socket.id) //cambia nome
                }
            }
        }
    })

    socket.on('message', message => {
        console.log('message received')

        io.emit('message', message)
    })

    socket.on('join-country', language => {
        console.log('a user joined a country')

        users.set(socket.id, {
            language: language,
            room: 'none'
        })

        socket.broadcast.emit(language + '-user-connected', socket.id)
        socket.emit('rooms-list', languages.get(language))
    })

    socket.on('create-room', data => { //data = [language, roomObj]
        console.log('room created')

        const language = data[0];
        const room = data[1];

        languages.get(language).push(room)
        users.get(socket.id).room = room.id
        io.emit(language + '-room-created', room)
    })

    socket.on('join-room', data => { //data = [language, roomId]
        console.log('a user has joined a room')

        const language = data[0];
        const roomId = data[1];
        const room = languages.get(language).find(el => el.id == roomId)

        if(room){
            room.peers.push(socket.id)
        }

        socket.broadcast.emit(language + '-user-join', roomId, socket.id) //cambia tutto
    })
})

// route for handling requests from the Angular client
app.get('/api/message', (req, res) => {
    res.json({ message: 'Hello GEEKS FOR GEEKS Folks from the Express server!' });
});

// Aggiungi l'header Content-Type nelle risposte per i file JavaScript
app.get('*.js', function (req, res, next) {
    res.type('text/javascript');
    next();
});

app.get('*.css', function (req, res, next) {
    res.type('text/css');
    next();
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});