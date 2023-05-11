app.use(express.static('client_dist', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Invia l'index.html del frontend per tutte le richieste GET che non corrispondono a una delle altre route definite
app.get('*', (req, res) => {
    res.sendFile('client_dist/index.html', { root: '.' });
});

// route for handling requests from the Angular client
app.get('/api/message', (req, res) => {
    res.json({ message: 'Hello GEEKS FOR GEEKS Folks from the Express server!' });
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});