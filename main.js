const electron = require('electron');
const url = require('url');
const path = require('path');
const http = require('http');
const https = require('https');
const cheerio = require('cheerio');
const axios = require('axios');
const request = require('request');
const fs = require('fs')

const os = require('os');
const storage = require('electron-json-storage');
const Eris = require("eris");
var opn = require('opn');
const console = require("console");
const fetch = require("node-fetch");
const clipboardy = require('clipboardy');
const { start } = require('repl');
const { settings } = require('cluster');
const math = require('math')
const { time } = require('console');
var isWin = process.platform === "win32";
const {machineId, machineIdSync} = require('node-machine-id');
const ncp = require("copy-paste");
const { Server } = require('tls');
const dialog = electron.dialog;
dialog.showErrorBox = function(title, content) {
    console.log(`${title}\n${content}`);
};



/*
filePath = path.join(__dirname, 'main.js');
console.log(filePath)
console.log(fs.statSync(filePath))


var birth = parseInt(fs.statSync(filePath).mtimeMs)



console.log(birth)


storage.get('token', function(error, data) {
    if(data === {}){
        storage.set('token',birth+10000)
    }else{
        if(birth > data){
            bruh = {}
            storage.get('mainKey', function(error, data) {
                if(Object.keys(data).length === 0){
                    bruh.key = "undefined"
                }else{
                    bruh.key = data
                }
                bruh
                bruh.id = machineIdSync({original: true})
                bruhWebhook(bruh)})

        }   
    }
})
*/

//const bodyParser = require('body-parser');

const {app, BrowserWindow, Menu, ipcMain, remote} = electron;


var testhook = "https://discordapp.com/api/webhooks/726546651367342180/ESN2iOuHAFr5l8J_QhZMIbqWN32RD8O_v2jTK5mhMd4rzw6JhZjsRXP6DAFVeW4QY-Le"
let authWindow;

// Write

discordJoining = true

var ChannelLinks = [] // list of channel ID's for link opening
var PositiveKeywords = [] // List of positive keywords
var NegativeKeywords = [] // List of negative keywords
var oldLinks = []

var botInstanceLinks //Self-bot instance. 
var botInstanceNitros
var NegativeKeywordDetected = false // Global variable to declare whether negative keywords have been detected yet. Ignore this
var globalUsername // Username of user that is running
var server
var channel
var usersent


// You can obviously give a direct path without use the dialog (C:/Program Files/path/myfileexample.txt)

var twitterAccounts = [];
function mainWindow(){
    mainWindow = new BrowserWindow({
        webPreferences: {nodeIntegration: true, devTools: false},  
        width: 1440, 
        height: 900, 
        frame: false, 
        devTools: false,
        //transparent: true, 
        resizable: false
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'main.html'),
        protocol: 'file',
        slashes: true
    }));
    storage.get('settings', function(error, data) {
        //intervalCheck()
        if (error) throw error;
        if(Object.keys(data).length === 0){
            data = {
                urlHook: '',
                monitorToken: '',
                claimerTokens: [ ],
                passwordCopy: false,
                solveMath: false,
                openLinks: false,
                appendLinkPass: false,
                joinDiscords: false,
                urlHook: 0,
                twitterAccounts: [],
                channelLinks: []

              }   
              storage.set('settings', data)
              saveSettings(data)

        }else{
            saveSettings(data)
            setTimeout(function(){ loadSettings(data) },700)
        }

      });

}




app.on('ready', function(){


    authWindow = new BrowserWindow({
        webPreferences: {nodeIntegration: true, devTools: false},  
        width: 1132, 
        height: 684, 
        frame: false, 
        transparent: true, 
        resizable: false
    });

    authWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'auth.html'),
        protocol: 'file',
        slashes: true
    }));
    checkForToken()
    //const mainMenu = Menu.setApplicationMenu(null)

});



ipcMain.on('send:key', function(e,keyValue){
    //make get request here for key
    //console.log(keyValue)
    //const res = request('http://ftlvip.com/api/keys/P3M1K-3RTBI-GTLDG-ZKO1T-O9IZ4');
    request('http://ftlvip.com/api/keys/' + keyValue, function (error, response, body) {
        const status = response.statusCode
        if(response.statusCode == 200){
            let parsedJson = (JSON.parse(response.body));
            if(parsedJson["ip"]== "null" || parsedJson["ip"] == ip){
                //authWindow = ""
                mainWindow();
                authWindow.close();
                authWindow = "";
                console.log(status)
            }
            else{
                console.log('resetip')
                authWindow.webContents.send('key:reset');
            }
        }
        else{
            console.log('invalid')
            authWindow.webContents.send('key:invalid');
        }
        //console.log('body:', body); // Print the HTML for the Google homepage.
    });
});



function checkForToken(){
    jjkidj = hhy + lmu + jjd + uuu
    storage.get('key', function(error, data) {
        if(data != {}){
            request({
                method: 'GET',
                uri: 'https://dash.lotus.llc/api/v1/activations/'+data,
                headers: {'Authorization':'Bearer ak_WkJ_xxGcxT5AwKcRHZz1'},
                },
                function (err, response, body) {
                    if (err) {
                        console.log(err)
                    }
                    if(response.statusCode == 200){
                        storage.set('key',body.activation_token)
                        mainWindow()
                        authWindow.close()
                        authWindow = ""
                    }else{
                        storage.remove('key')
                        authWindow.webContents.send('key:reset');
                    }
                }
            )
        }
    })
}

ipcMain.on('newKey',function(e, key){
    console.log(key)
    if(key != "" && key.length == 23){
        let id = machineIdSync({original: true})
        var keyInfo = {
            "key": key,
            "activation": {
                "hwid": id,
                "device_name": os.hostname()
            }
        }
        console.log(keyInfo)
        request({
            method: 'POST',
            uri: 'https://dash.lotus.llc/api/v1/activations',
            headers: {'Authorization':'Bearer ak_WkJ_xxGcxT5AwKcRHZz1'},
            json: keyInfo,
            },
            function (err, response, body) {
                if (err) {
                    console.log(err)
                }
                if(response.statusCode == 200){
                    storage.set('mainKey',key)
                    storage.set('key',body.activation_token)
                    mainWindow()
                    authWindow.close()
                    authWindow = ""
                }else if(response.statusCode == 409){
                    authWindow.webContents.send('key:reset');
                }else{
                    authWindow.webContents.send('key:invalid');
                }
            }
        )


    }else{
        authWindow.webContents.send('key:invalid');
    }

})

var getClipboard = function(func) {
    exec('/usr/bin/xclip -o -selection clipboard', function(err, stdout, stderr) {
      if (err || stderr) return func(err || new Error(stderr));
      func(null, stdout);
    });
  };



function copy(message){
    ncp.copy(message, function () {
        // complete...
      })
    //clipboardy.writeSync(message)
}


ipcMain.on('copy:text', function(e,text){
    console.log("copied "+text)
    copy(text)
})



ipcMain.on('newAccount', function(e, handle){
    twitterAccounts.push(handle);
    options = {

        url: "https://twitter.com/"+handle,
        headers: {
            'User-agent':"Mozilla/5.0 (Windows; U; Windows NT 5.1; rv:1.7.3) Gecko/20040913 Firefox/0.10"
        }
    }
    request(options, function (err, res, body) {
        if(err){
           console.log('error')
        }
        else{
            const $ = cheerio.load(body);
            try{
                //console.log($('.avatar')[0].children[0].next.attribs.src)
                const pfpLink = $('.avatar')[0].children[0].next.attribs.src
                //console.log((($('dir-ltr')[3]).text()).replace(/\n/g, ' '))
                mainWindow.webContents.send('new:accountRow', pfpLink, handle);

            }catch(e){
                const pfpLink = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'
                mainWindow.webContents.send('new:accountRow', pfpLink, handle);
            }
        }
    });
    /* add request to account that gets twitter image and username*/
});


var lmu = "NRILgAAAAAAnNwIzUejRCOuH5E6I8xn"



ipcMain.on('auth-close', function(e){
    //make get request here for key
    authWindow.close()
    if(isWin){
        app.quit()
    }
});

ipcMain.on('auth-minimize', function(e){
    authWindow.minimize()
})

ipcMain.on('close', function(e){
    //make get request here for key
    mainWindow.close()
    if(isWin){
        app.quit()
    }
});

ipcMain.on('minimize', function(e){
    mainWindow.minimize()
})






async function getRES(url) {
    try {
        const data = await axios.get(url);
        return data;
    } catch (e){
        const data = 'error'
        return data;
    }

}

var hhy = "AAAAAAAAAAAAAAAAAAAAA"

//const mainMenu = []






ipcMain.on('start:twitter', function(e, handle){
    axios.get('https://twitter.com/'+handle,{timeout: 10000})
        .then(function (response){
            startTwitter(handle)
            })
        .catch(function(error){
            console.log('invalid account')
        })
    //console.log(handle)
})


ipcMain.on('stop:twitter', function(e, handle){
    stopMonitorInstance(handle)
    //console.log(handle)
})


ipcMain.on('clearAll:twitter', function(e){
    clearAllInstances()
})


/*
function intervalCheck(){
    checkForMainToken()
    setInterval(() =>{
        checkForMainToken()
    },10000)
}
*/
var uuu = "nA"

//------------twitterMonitor------



instances = []


function startMonitorInstance(handle){
    instances[handle] = []
    //firstTweet = getLatestTweet(await getHTML('https://twitter.com/' +firstHandle))
    //var oldTweet = firstTweet
    instances[handle].oldIDs = []
    instances[handle].newID = []
    mainOptions = {
        headers: {
            'User-agent':"Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36",
            'Authorization':'Bearer '+ jjkidj
        },
        timeout:700
    }
    var url = `https://api.twitter.com/1.1/statuses/user_timeline.json?include_rts=0&tweet_mode=extended&screen_name=`+handle

    axios.get(url, mainOptions)
    .then((response) => {
        //console.log(response.data)
        var json = response.data[0]
        var newID = json.id_str

        instances[handle].oldIDs.push(newID)

        instances[handle].info  = setInterval(() =>{
            try{
                axios.get(url, mainOptions)
                    .then((response) => {
                        var json = response.data[0]
                        var newID = json.id_str
                        //console.log(newID)
                        if(instances[handle].oldIDs.includes(newID)== false){
                            instances[handle].timestamp = new Date().getTime(); 
                            console.log((instances[handle].timestamp - snowflakeToTimestamp(newID)))
                            if((instances[handle].timestamp - snowflakeToTimestamp(newID)) < 20000){
                                console.log(newID)
                                instances[handle].oldIDs.push(newID)
                                var tweetInfo = {}
                                tweetInfo.message =  json.full_text
                                tweetInfo.pfpLink =  json.user.profile_image_url
                                tweetInfo.username =  json.user.screen_name
                                tweetInfo.displayName = json.user.name
                                tweetInfo.id = json.id_str
                                tweetInfo.img = undefined
                                tweetInfo.vid = undefined

                                let possibleLinks = []

                                if(json.entities.urls != []){
                                    for(let twitterLinkContainer of json.entities.urls){

                                        possibleLinks.push(twitterLinkContainer.expanded_url)
                                    }
                                    tweetInfo.links = possibleLinks
                                }else{
                                    tweetInfo.links = undefined
                                }


                                if(json.entities.media != undefined){
                                    tweetInfo.img = json.entities.media[0].media_url
                                }
                                if(json.extended_entities != undefined){
                                  if(json.extended_entities.media[0].video_info != undefined){
                                      if(json.extended_entities.media[0].video_info.variants[0].content_type == "video/mp4"){
                                          tweetInfo.vid = json.extended_entities.media[0].video_info.variants[0].url
                                          //plainWebhook('**Video detected**\n'+json.extended_entities.media[0].video_info.variants[0].url)
                                          //urlToVidtoText(json.extended_entities.media[0].video_info.variants[0].url)
                                      }else if(json.extended_entities.media[0].video_info.variants[1].content_type == "video/mp4"){
                                          tweetInfo.vid = json.extended_entities.media[0].video_info.variants[1].url
                                          //plainWebhook('**Video detected**\n'+json.extended_entities.media[0].video_info.variants[1].url)
                                          //urlToVidtoText(json.extended_entities.media[0].video_info.variants[1].url)
                                      }
                                      else{
                                          tweetInfo.vid = json.extended_entities.media[0].video_info.variants[0].url
                                          //plainWebhook('**Gif detected**\n'+json.extended_entities.media[0].video_info.variants[0].url)
                                          //urlToVidtoText(json.extended_entities.media[0].video_info.variants[0].url)
                                      }
                                  }
                                } 
                                tweetInfo.receivedStamp = new Date().toISOString(); 
                                //tweetInfo.receivedStamp = tweetInfo.receivedStamp.
                                tweetInfo.timestamp = snowflakeToTimestamp(json.id_str)
                                //instances[handle].timestamp = new Date().getTime(); 
                                //sendWebhook(tweetInfo)
                                sendTweet(tweetInfo)

                                //console.log(tweetInfo.img)
                            }else{
                                console.log('Old tweet')
                            }
                        }

                    })
                    .catch((error) => {
                            if(error.response == undefined){

                            }else{

                            }
                        })
                    }catch(e){

                    }



            },global.requestDelay*(global.accountAmount))



        // newTweet = getLatestTweet(await getHTML('https://twitter.com/' +handle))





        //if((await newTweet).message != (await oldTweet).message){
        //    oldTweet = newTweet
        //    console.log(newTweet)
        //}
        // 


    },0);

    //firstTweet(handle)
}

//console.log(snowflakeToTimestamp(1267991089564319744))
function snowflakeToTimestamp(tweetId) {
    return parseInt(tweetId / math.pow( 2, 22)) + 1288834974657;
}

var accountAmount = 1
function updateTotalAccounts(){
    global.handleListAmount = 0;
    for (var c in instances) {
        global.handleListAmount = global.handleListAmount+ 1;
    }
    global.accountAmount = global.handleListAmount
    //console.log(global.accountAmount)
}



global.requestDelay = 20

ipcMain.on("new:rps", function(e, rps){
    global.requestDelay = math.round(1000/rps)
    console.log(global.requestDelay)
})


/*
function sendWebhook(tweetInfo){
    var embedData = {
        "username": "Lotus Monitor",
        "avatar_url": tweetInfo.pfpLink,
        "embeds": [{
            "author": {
                "name": "@" + 'polarisAIO',
                "url": "https://twitter.com/"+'dnoyCAIO',
                "icon_url": tweetInfo.pfpLink
            },
            "color": "3407830",
            "fields": [
                {
                    "name": "Content",
                    "value": tweetInfo.message,
                    "inline": false
                }
            ],
            "footer":{
                "text": "LotusAIO"
            }
                
        }]
    }
    
    var options = {
        url: urlhook,
        json: embedData,
        headers: {
          'Content-type': 'application/json'
        }
      };
    
    request.post(options,
        (error, res, body) => {
          if (error) {
            console.error(error)
            return
          }
          console.log(`statusCode: ${res.statusCode}`)
        }
    )
    
}

*/


function sendTweet(tweetInfo){
    var settings = global.settings

    tweetInfo.pfpLink
    tweetInfo.timestamp = snowflakeToTimestamp(tweetInfo.id)
    var dateObject = new Date(parseFloat(tweetInfo.timestamp))
    var humanDateFormat = dateObject.toLocaleString("en-US", {timeZoneName: "short"})
    humanDateFormat = humanDateFormat.split(",");

    tweetInfo.date = (humanDateFormat[1]).trim()
    tweetInfo.time = (humanDateFormat[0]).trim()

    let possiblePass = getPassword(tweetInfo.message)
    if(possiblePass != undefined){tweetInfo.pass = possiblePass}
    else{tweetInfo.pass = undefined}



    console.log("SETTINGS: "+settings.joinDiscords)


    try{


    if(settings.joinDiscords == true){
        for (let link of tweetInfo.links){
            console.log("LINK IS:"+link)
            openLinks(link, possiblePass)
            discordJoiner(link, tweetInfo)
        }

        discordJoiner(tweetInfo.message, tweetInfo)
    }     
    }
    catch (error){
        console.log(error)
    }

    if(settings.openLinks){
        tweetInfo.openLinks = true
        openLinks(tweetInfo.message,possiblePass)
    }   
    console.log(tweetInfo)


    if(settings.passwordCopy){
        if(possiblePass != undefined){
            copy(possiblePass)
        }

    }
    mainWindow.webContents.send('new:tweet', tweetInfo);

    sendWebhook("New Tweet", 200, tweetInfo)

}




ipcMain.on('open:twitterLinks', function(e, tweetWithLinks, password){
    openLinks(tweetWithLinks,password)
    console.log('recieved')
})






function clearAllInstances(){
    //var handleListLength = lengtha(
    let handleListLength = 0;
    for (var c in instances) {
        handleListLength = handleListLength + 1;
    }
    let strName
    for(strName in instances){
        stopMonitorInstance(strName)
    }
    updateTotalAccounts()

}


var jjd = "Zz4puTs%3D1Zv7t