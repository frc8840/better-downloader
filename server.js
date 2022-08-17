const express = require("express");
const fs = require('fs');
const path = require("path");
const getIp = require('./ip')
const colors = require('colors');
const {readDirAndGetList, hashFile, getFileInfo, zipDir} = require("./files")

const letters = "qwertyuiopasdfghjklzxcvbnm1234567890".split('');

function generateName() {
    let str = "";
    for (let i = 0; i < 10; i++) {
        str += letters[Math.floor(Math.random() * letters.length)];
    }

    return str;
}

async function createComparisonForTracker(directory) {
    const flist = await readDirAndGetList(directory, false);

    let finalList = [];

    for (let loc of flist) {
        const stats = fs.lstatSync(loc);
        const name = loc.includes("/") ? loc.split("/")[loc.split("/").length - 1] : loc.split("\\")[loc.split("\\").length - 1];
        const location = loc.includes("/") ? loc.replace(directory, directory.endsWith("/") ? "/" : "") : loc.replace(directory, directory.endsWith("\\") ? "\\" : "");
        const size = stats.size;
        const lastModified = stats.mtimeMs;
        const hash = hashFile(loc);

        finalList.push({
            name,
            location,
            fullLocation: path.join(directory, location),
            lastModified,
            size,
            hash
        });
    }

    return finalList;
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
    app.post('/filereq', async (req, res) => {
        const body = req.body;
        
        if (body == null) {
            res.status(400).json({success:false, msg:"bruh at least provide me with a body can't work con nada", data: {}}); 
            return;
        }

        if (!Object.keys(body).includes("recieverData")) {
            res.status(400).json({success: false, msg: "Must have 'recieverData' list included.", data: {}});
            return;
        }

        const listOfFiles = await createComparisonForTracker(serverLocation);
        const recieverData = body.recieverData;

        let listOfNonExistingFiles = [], listOfSameButChanges = [], listOfSameFiles = [];

        for (let localFile of listOfFiles) {
            if (localFile.location.endsWith(".8840reciever")) continue; //Just skip since it's the reciever data file.

            let match = null;

            for (let recieverFile of recieverData) {
                //If the path of file2 is equal to localFile, then say it matches.
                //LocalFile will be local to the directory, same with file2!
                if (recieverFile.location === localFile.location) {
                    match = localFile;
                }
            }

            //If there were no matches, just add the path of localFile to the nonExistingFiles.
            if (match == null) {
                listOfNonExistingFiles.push(localFile);
            } else {
                //Otherwise if there was a match, look at the files and check the information of the two

                const localStats = match;
                const otherStats = recieverData.find(e => e.location == match.location);

                if (localStats.size != otherStats.size || localStats.hash != otherStats.hash /*|| localStats.lastModified != otherStats.lastModified*/) {
                    //file is different
                    listOfSameButChanges.push(localFile);
                } else {
                    //file is the same
                    listOfSameFiles.push(localFile);
                }
            }
        }

        if (listOfSameButChanges.length + listOfNonExistingFiles.length == 0) {
            res.sendStatus(204);
            return;
        }

        let tmpDir;

        try {
            tmpDir = path.join(__dirname, "tmp_min");

            const exists = fs.existsSync(tmpDir);
            
            //If it already exists, just delete it and remake it.
            if (exists) {
                fs.rmSync(tmpDir, { recursive: true });
            }

            fs.mkdirSync(tmpDir);
            
            //Create another folder within it
            tmpDir = path.join(tmpDir, "tmp_min");

            fs.mkdirSync(tmpDir)

            let sendTracker = [];

            let usedNames = [];
            
            const filesToBePushed = [].concat(listOfSameButChanges, listOfNonExistingFiles);

            console.log("Packaging " + filesToBePushed.length + " files!");

            for (let changedFile of filesToBePushed) {
                let generatedName = generateName();

                while (usedNames.includes(generatedName)) generatedName = generateName();

                usedNames.push(generatedName);

                let fileInfo = getFileInfo(changedFile.fullLocation);

                const tempName = generatedName + "." + fileInfo.extension;

                fs.writeFileSync(path.join(tmpDir, tempName), fs.readFileSync(changedFile.fullLocation));

                sendTracker.push({
                    location: changedFile.location,
                    name: tempName,
                    realName: fileInfo.name + "." + fileInfo.extension,
                });
            }

            fs.writeFileSync(path.join(tmpDir, ".tmptracker"), JSON.stringify({
                info: sendTracker,
                nameList: usedNames
            }));

            const currentFiles = fs.readdirSync(__dirname);

            if (currentFiles.includes("files.zip")) {
                fs.rmSync(path.join(__dirname, "files.zip"), { recursive: true })
            }

            tmpDir = path.join(__dirname, "tmp_min"); //Reset it out

            await zipDir(tmpDir);
        } catch (e) {
            console.error(e);
        } finally {
            try {
                if (tmpDir) {
                    fs.rmSync(tmpDir, { recursive: true })
                }
            } catch (e) {
                console.error("Was not able to delete temporary directory.")
                return;
            }
        }

        res.sendFile(path.join(__dirname, "files.zip"))

        //fs.rmSync(path.join(__dirname, "files.zip")) //Want to try removing the files.zip but i have to wait till the request is done,,, idk ill just leave it there what harm will that do (clueless)
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
    startServer,
    createComparisonForTracker
}