const express = require('express');
const app = express();
const path = require('path');

// handling CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://hanging-man.vercel.app");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    if(req.method == "OPTIONS"){
        res.status(200)
    }

    next();
});

// Serve i file statici della build di Angular
app.use(express.static(path.join(__dirname, 'client_dist')));

// Gestisci tutte le altre richieste inviando la pagina HTML del frontend
/*app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client_dist', 'index.html'));
});*/
app.get('/polyfills.6b2666eec982e7c4.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'client_dist', 'polyfills.6b2666eec982e7c4.js'));
});

app.get('/runtime.7ae29a296d479790.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'client_dist', 'runtime.7ae29a296d479790.js'));
});

app.get('/main.65388943960c602d.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'client_dist', 'main.65388943960c602d.js'));
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