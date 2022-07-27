const express = require("express");
const fs = require('fs');
const getIp = require('./ip')
const colors = require('colors');
const {readDirAndGetList} = require("./files")

function createComparisonForTracker(directory) {
    const flist = readDirAndGetList(directory);

    for (let loc of flist) {
        
    }

}

function startServer(port=global.dp, serverLocation) {
    const app = express();

    app.use(express.json())

    app.get('/', (req, res) => {
        res.json({
            ready: true,
            credits: {
                name: "Jaiden Grimminck",
                team: 8840,
                note: "The coolest team ever 😎😎😎😎",
                websites: [
                    "https://github.com/jaidenagrimminck"
                ]
            }
        })
    })

    /* **Body Format**
    {
        recieverData: {..secretFileData}, //(Not so secret lol, just a tracker so it's fine)
        //maybe add more things in the future? idk
    }
     */
    app.post('/filereq', (req, res) => {
        const body = req.body;
        
        if (body == null) {res.json({success:false, msg:"bruh at least provide me with a body can't work con nada", data: {}}); return;}
    })

    app.get('/filereq', (req, res) => {
        res.json({success: false, msg: "nahhhh try posting don't u *get* it (lol)", data: {}})
    })

    app.listen(port, async () => {
        const ip = await getIp();
        console.log(`Started listening on port ${port}.`.yellow);
        console.log(`If you're connected to the same WIFI network, connect to the server using this program with the command:`.yellow);
        console.log(`node app.js --c:${port == global.dp ? 'd' : port} <dir_location> --ip ${ip}`.green)
        console.log('\nClose the server with Control + C at anytime.')
    })


}

module.exports = {
    startServer
}