const axios = require('axios');

async function getRandomWord(lang){
    
    const config = {
        params: {
            lang: lang
        }
    }

    return axios.get('https://random-word-api.herokuapp.com/word', config);
}

function IDontWannaSleepPapa(){
    setInterval(() =>{
        axios.get('https://hangman-game-6m0a.onrender.com/')
    }, 1000 * 180)
}

module.exports = {getRandomWord, IDontWannaSleepPapa};