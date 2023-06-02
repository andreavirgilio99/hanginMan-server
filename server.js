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

io.on('connection', socket =>{
    //socket.emit = send to only one, io.emit = send to everyone, socket.broadcaset.emit = send to everyone but that one connection
    socket.emit('welcome', 'welcome to the circus')
    socket.broadcast.emit('user-join','some clown just joined lmao')

    socket.on('disconnect', () =>{
        io.emit('user-left', 'Good news fellas, some of you just fucked off hurray')
    })

    socket.on('message', message =>{
        io.emit('message', message)
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