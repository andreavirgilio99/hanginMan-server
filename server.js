const express = require('express');
const { getRandomWord } = require('./util');
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

const RoomStates = {
    PENDING: 'PENDING',
    ONGOING: 'ONGOING'
}

const users = new Map()

const disconnectTimers = new Map()

const languages = new Map([ //language - roomObj[]
    ['de', []],
    ['en', []],
    ['it', []],
    ['es', []]
])

io.use((socket, next) => {
    const token = socket.handshake.query.token
    console.log(token)
    return next();
});

io.on('connection', socket => {
    try {
        if (disconnectTimers.has(socket.id)) {
            console.log('a user reconnected')
            const disconnectTimer = disconnectTimers.get(socket.id);

            if (disconnectTimer) {
                clearTimeout(disconnectTimer);
                disconnectTimers.delete(socket.id);
                userData = users.get(socket.id);

                if (userData.room != 'none') {
                    const room = languages.get(userData.language).find(rooms => rooms.id == userData.room)
                    io.emit(room.id + '-user-reconnected', { id: socket.id, username: userData.username });
                    socket.broadcast.emit(userData.language + '-user-connected', socket.id)
                }
            }
        }
        else {
            console.log("user connected")
            //socket.emit = send to only one, io.emit = send to everyone, socket.broadcaset.emit = send to everyone but that one connection
            socket.emit('welcome', 'welcome to the circus')


            socket.on('disconnect', () => {
                console.log("user disconnected")
                const userData = users.get(socket.id);

                if (userData) {
                    io.emit(userData.language + '-user-disconnected', socket.id)
                    const callBack = () => {
                        const userData = users.get(socket.id);
                        users.delete(socket.id);
                        disconnectTimers.delete(socket.id)
                        socket.removeAllListeners()
                        socket.emit('reconnect-timeout')

                        if (userData) {
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
                                    const indx = room.peers.findIndex(el => el.id == socket.id);

                                    if (indx != -1) {
                                        room.peers.splice(indx, 1)
                                    }

                                    if (socket.id == room.admin) {
                                        room.admin = room.peers[0].id;
                                        io.emit(userData.language + '-room-admin-change', room.peers[0].id, room.id)
                                    }

                                    const obj = { id: socket.id, username: userData.username }

                                    io.emit(userData.language + "-user-leave", room.id, obj)
                                }
                            }
                        }
                    }

                    if (userData.room != 'none') {
                        const room = languages.get(userData.language).find(rooms => rooms.id == userData.room)
                        io.emit(room.id + '-user-disconnected', { id: socket.id, username: userData.username });
                    }

                    disconnectTimers.set(socket.id, setTimeout(callBack, 30 * 1000))
                }
            })

            socket.on('global-message', message => {
                console.log('message received')

                io.emit('global-message', message)
            })

            socket.on('join-country', data => { //[language, username]
                const language = data[0]
                const username = data[1]
                console.log('a user joined a country')

                users.set(socket.id, {
                    language: language,
                    username: username,
                    room: 'none'
                })

                socket.broadcast.emit(language + '-user-connected', socket.id)
                socket.emit('rooms-list', [languages.get(language), countUsersByLanguage(language)])
            })

            socket.on('create-room', data => { //data = [language, roomObj]
                console.log('room created')

                const language = data[0];
                const room = data[1];

                languages.get(language).push(room)
                users.get(socket.id).room = room.id
                io.emit(language + '-room-created', room)

                socket.on(room.id + '-message', message => {
                    io.emit(room.id + '-message', message)
                })

                socket.on(room.id + '-queue-add', () => {
                    io.emit(room.id + '-queue-add', { id: socket.id, username: users.get(socket.id).username })
                })

                socket.on(room.id + '-queue-shift', () => {
                    io.emit(room.id + '-queue-shift')
                })

                socket.on(room.id + '-guess-word', (word) => {
                    io.emit(room.id + '-guess-word', word)
                })

                socket.on(room.id + '-guess-letter', (letter) => {
                    io.emit(room.id + '-guess-letter', letter)
                })

                socket.on(room.id + '-game-over', (win) => {
                    io.emit(room.id + '-game-over', win)
                })

            })

            socket.on('room-state-change', async data => { //data = [language, roomId, state]
                const language = data[0];
                const roomId = data[1];
                const state = data[2];

                const room = languages.get(language).find(el => el.id == roomId)
                room.state = state
                socket.broadcast.emit(language + '-room-state-change', [roomId, state])

                if (state == RoomStates.ONGOING) {
                    const res = await getRandomWord(language);
                    const word = res.data[0].toUpperCase()
                    room.secretWord = word
                    io.emit(room.id + '-generated-word', word)
                }
            })

            socket.on('join-room', data => { //data = [language, roomId]
                console.log('a user has joined a room')

                const language = data[0];
                const roomId = data[1];
                const room = languages.get(language).find(el => el.id == roomId)
                const user = users.get(socket.id);

                if (room) {
                    room.peers.push({ id: socket.id, username: user.username })
                }

                user.room = room.id;
                const obj = { id: socket.id, username: user.username }
                socket.broadcast.emit(language + '-user-join', roomId, obj)

                socket.on(roomId + '-message', message => {
                    io.emit(roomId + '-message', message)
                })

                socket.on(roomId + '-queue-add', () => {
                    io.emit(roomId + '-queue-add', { id: socket.id, username: users.get(socket.id).username })
                })

                socket.on(room.id + '-queue-shift', () => {
                    io.emit(room.id + '-queue-shift')
                })

                socket.on(room.id + '-guess-word', (word) => {
                    io.emit(room.id + '-guess-word', word)
                })

                socket.on(room.id + '-guess-letter', (letter) => {
                    io.emit(room.id + '-guess-letter', letter)
                })

                socket.on(room.id + '-game-over', (win) => {
                    io.emit(room.id + '-game-over', win)
                })
            })

            socket.on('leave-room', data => { //data = [language, roomId]
                console.log('a user has left a room')
                const language = data[0];
                const roomId = data[1];
                const room = languages.get(language).find(el => el.id == roomId)
                const userData = users.get(socket.id)

                if (room) {
                    if (room.peers.length == 1) {

                        const indx = languages.get(userData.language).indexOf(room)

                        if (indx != -1) {
                            languages.get(userData.language).splice(indx, 1)
                        }

                        io.emit(userData.language + '-room-closed', room)
                    }
                    else {
                        const indx = room.peers.findIndex(user => user.id == socket.id)

                        if (indx != -1) {
                            room.peers.splice(indx, 1)
                        }

                        if (socket.id == room.admin) {
                            room.admin = room.peers[0].id;
                            io.emit(userData.language + '-room-admin-change', room.peers[0].id, room.id)
                        }

                        const obj = { id: socket.id, username: users.get(socket.id).username }

                        io.emit(userData.language + "-user-leave", room.id, obj)
                    }
                }

                socket.removeAllListeners(roomId + '-message')
                socket.removeAllListeners(roomId + '-queue-add')
                socket.removeAllListeners(roomId + '-queue-shift')
                socket.removeAllListeners(roomId + '-guess-word')
                socket.removeAllListeners(roomId + '-guess-letter')
                socket.removeAllListeners(roomId + '-game-over')

                users.get(socket.id).room = 'none'
            })
        }
    }
    catch (error) {
        console.log(error)
        socket.emit('gaddamn-an-error')
    }
})

app.get('/api/checkUsername', (req, res) => {
    const username = req.query.username
    let isUnique = true;
    for (const [key, user] of users) {
        if (user.username === username) {
            isUnique = false;
            break;
        }
    }
    res.send(isUnique)
})

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

function countUsersByLanguage(language) {
    let count = 0;

    for (const [userId, userData] of users) {
        if (userData.language === language) {
            count++;
        }
    }

    return count;
}