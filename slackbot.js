//use the slackbot package
const SlackBot = require('slackbots');
const https = require('https');
const table = require('text-table');

const config = require('./config/config.js')

const token = config.TOKEN;
const botUserId = config.BOTID;
const name = 'rezabot';

const APIRESULT ={
    RESPONSE_RESULT_ERROR:'Error'
}
const MESSAGES={
    INVALID_CMD:'Invalid Command!'
}


const EVENTS = {
    START: 'start',
    MESSAGE: 'message',
    OPEN: 'open',
    CLOSE: 'close',
    ERROR: 'error'
};
const currencyOptions = {
    'JPY': 'Japanese Yen',
    'USD': 'US Dollars',
    'EUR': 'Euros',
    'CAD':'Canadian Dollars'
};

const MESSAGE_TYPES = {
    MESSAGE: 'message'
}

const CHANNELS = {
    GENERAL: 'general'
}

const bot = new SlackBot({
    token: token,
    name: name
});

const COMMANDS = {
    ABOUT: 'about',
    CRYPTO_PRICE: 'crypto',
    TOP_VOLUME_EXCHANGE: 'volume',
    CRYPTO_NEWS: 'newscrypto'
}

bot.on(EVENTS.START, () => {
    postMessageToChannel('Hello!');
});

bot.on(EVENTS.MESSAGE, (data) => {

    if (data.bot_id === botUserId) return;
    if (data.type != MESSAGE_TYPES.MESSAGE) return;

    const command = determineCommand(data.text);
    switch (command) {
        case COMMANDS.CRYPTO_PRICE:
            let splitArg = data.text.split(' ');
            let coin = splitArg[1];
            let currency = splitArg[2];
            if(coin!==undefined && currency!==undefined)getCryptoPrice(coin.toUpperCase(), currency.toUpperCase());
            break;
        case COMMANDS.TOP_VOLUME_EXCHANGE:
            let topVolArgs = data.text.split(' ');
            let topVolCoin = topVolArgs[1];
            let topVolCurrency = topVolArgs[2];
            if(topVolCoin!==undefined && topVolCurrency!==undefined) getTopVolumeExchange(topVolCoin,topVolCurrency);
            break;
        case COMMANDS.CRYPTO_NEWS:
            let cryptoNewsArgs = data.text.split(' ');
            let cryptoNewsCoin = cryptoNewsArgs[1];
            if(cryptoNewsCoin!==undefined)getNewsTag(cryptoNewsCoin);
            break;
        case COMMANDS.ABOUT:
            callAbout();
            break;
    }
});

const postMessageToChannel = (message) => {
    return bot.postMessageToChannel(CHANNELS.GENERAL, message,null,null);
}

const determineCommand = (message) => {
    if (message.toLowerCase() === COMMANDS.ABOUT) {
        return COMMANDS.ABOUT;
    }
    if (message.substr(0,6).toLowerCase() === COMMANDS.CRYPTO_PRICE) {
        return COMMANDS.CRYPTO_PRICE;
    }
    if(message.substr(0,6).toLowerCase()=== COMMANDS.TOP_VOLUME_EXCHANGE){
        return COMMANDS.TOP_VOLUME_EXCHANGE;
    }
    if(message.substr(0,10).toLowerCase()=== COMMANDS.CRYPTO_NEWS){
        return COMMANDS.CRYPTO_NEWS;
    }

}


callAbout = () => {
    bot.postMessageToChannel('general', `
    I can Help You With 5 Commands\n
    1.) About\n
        Example: 'about'\n
    2.) Crypto Price\n
        Example: 'crypto BTC USD'\n
        Example: 'crypto ETH JPY'\n
        Example: 'crypto TRX EUR'\n
        Example: 'crypto NEO CAD'\n
    3.) Top exchanges for volume for a currency pair.\n
        Headers: | Exchange | Symbol | Currency | 24h Volume | 24h Trading Volume\n
        Example: 'volume BTC USD'\n 
        Example: 'volume ETH JPY'\n
        Example: 'volume TRX EUR'\n
        Example: 'volume NEO CAD'\n
    4.) Crypto Related News.\n
        Example: cryptonews bitcoin
    `
    );
}

const numFixPrice = (num) =>{
    return num.toLocaleString();
}


getCryptoPrice = (coin, currency) => {
    console.log('inside here with currency: ' + currency);
    const options = {
        hostname: 'min-api.cryptocompare.com',
        path: `/data/price?fsym=${coin}&tsyms=${currency}`,
        method: 'GET',
    };
    https.request(options, (res) => {
        res.setEncoding('utf8');
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            if (res.statusCode == 200) { // Check the status code returned in the response
                let jsondata = JSON.parse(data);
                if (jsondata.Response!==APIRESULT.RESPONSE_RESULT_ERROR) {
                    postMessageToChannel(
                        (currencyOptions[currency]) ? jsondata[currency] + ' ' + currencyOptions[currency] : ' ');
                }else{
                    postMessageToChannel(MESSAGES.INVALID_CMD);
                }
            }
        });
        res.on('error', (e) => {
            console.log(`problem with request: ${e.message}`);
        });
    }).end();
};


getTopVolumeExchange = (volCoin, volCurrency)=>{
    const options={
        hostname:'min-api.cryptocompare.com',
        path:`/data/top/exchanges?fsym=${volCoin.toUpperCase()}&tsym=${volCurrency.toUpperCase()}`,
        method:'GET'
    };
    https.request(options,(res)=>{
        res.setEncoding('utf8');
        let data = '';
        res.on('data',(chunk)=>{
            data +=chunk;
        });
        console.log(data);
        res.on('end',()=>{
            if(res.statusCode==200) {
                let jsondata = JSON.parse(data);
                console.log(jsondata.Response);
                if (jsondata.Response !== APIRESULT.RESPONSE_RESULT_ERROR) {

                    let result = ['Exchange|Coin|Currency|Vol 24h|Vol24hTo\n'];
                    for (let i = 0; i < jsondata.Data.length; i++) {
                        let newRow = [];
                        newRow.push(
                            jsondata.Data[i].exchange,
                            jsondata.Data[i].fromSymbol,
                            jsondata.Data[i].toSymbol,
                            numFixPrice(parseInt(jsondata.Data[i].volume24h).toFixed(2)),
                            numFixPrice(parseInt(jsondata.Data[i].volume24hTo).toFixed(2)));
                        result.push(`${i + 1}: ${newRow}\n`);
                    }
                    let t = table([result], {align: ['l']});
                    postMessageToChannel(t);
                }else{
                    postMessageToChannel(MESSAGES.INVALID_CMD);
                }
            }
       });
        res.on('error',(e)=>{
            console.log(`problem with request: ${e.message}`);
        });
    }).end();
};


getNewsTag = (tag) =>{
    const options={
        hostname:'min-api.cryptocompare.com',
        path:`https://min-api.cryptocompare.com/data/v2/news/?lang=EN`,
        method:'GET'
    };

    https.request(options,(res)=>{
        res.setEncoding('utf8');
        let data = '';
        res.on('data',(chunk)=>{
            data +=chunk;
        });
        console.log(data);
        res.on('end', () => {
            if (res.statusCode == 200) { // Check the status code returned in the response
                    let jsondata = JSON.parse(data);
                    if(jsondata.response!== APIRESULT.RESPONSE_RESULT_ERROR){
                        for(let i = 0; i < jsondata.Data.length; i++){
                            if(jsondata.Data[i].body.match(new RegExp(tag,"g"))){
                                postMessageToChannel(jsondata.Data[i].body + "\n" + "Link: " + jsondata.Data[i].url);
                            }
                        }
                    }
            }
        });
        res.on('error', (e) => {
            console.log(`problem with request: ${e.message}`);
        });
    }).end();
}

