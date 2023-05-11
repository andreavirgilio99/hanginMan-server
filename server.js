const express = require('express');
const app = express();
const path = require('path');

// handling CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Serve i file statici della build di Angular
app.use(express.static(path.join(__dirname, 'client_dist')));

// Gestisci tutte le altre richieste inviando la pagina HTML del frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client_dist', 'index.html'));
});

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

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});