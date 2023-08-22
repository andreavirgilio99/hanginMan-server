const axios = require('axios');

async function getRandomWord(lang){
    
    const config = {
        params: {
            lang: lang
        }
    }

    return axios.get('https://random-word-api.herokuapp.com/word', config);
}

module.exports = {getRandomWord};