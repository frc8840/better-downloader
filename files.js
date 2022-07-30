const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const archiver = require("archiver");

async function readDirAndGetList(currentDir, removeCurrentDir=true, isBase=true) {
    currentDir = curateDirectory(currentDir)

    let list = [];
    let files = await fs.readdirSync(currentDir);

    for (let file of files) {
        const p = path.join(currentDir, file)
        if (fs.lstatSync(p).isDirectory()) {
            let secondaryList = await readDirAndGetList(p, false, false);
            list = list.concat(secondaryList);
        } else {
            list.push(p);
        }
    }

    if (isBase && removeCurrentDir) {
        list = list.map(f => f.replace(currentDir, ""))
    }

    return list;
}

function getFileInfo(path) {
    let splitPath = path.split("/");
    let file = splitPath[splitPath.length - 1];
    let dotSplit = lastOccuranceSplit(file, ".")
    
    return {
        full: file,
        name: dotSplit[0],
        extension: dotSplit[1],
        parentFolder: path.replace(file, "")
    }
}

/**
 * Splits a string by the last occurance of a token in a string.
 * @param {string} str The string to split
 * @param {string} token The token to split it by
 * @returns {Array}
 */
function lastOccuranceSplit(str, token) {
    const key = String(Math.random());
    //wow it acutally works. wtf.
    let split = str.split("").reverse().join("").replace(token, key).split("").reverse().join("").split(String(key).split("").reverse().join(""));
    return split;
}

function curateDirectory(dir) {
	if (dir.startsWith("~")) dir = dir.replace("~", `/Users/${os.userInfo().username}`)

	if (dir.startsWith("./")) return path.join(__dirname, dir.replace("./", "/"));
	
	return dir;
}

function hashFile(file) {
    const fileBuffer = fs.readFileSync(file);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);

    const hex = hashSum.digest('hex');

    return hex;
}

/**
 * Finds the differences/same files of two directories.
 * @param {String[]} fileList1 The list of files in the first directory.
 * @param {String[]} fileList2 The list of files in the second directory.
 * @param {String} addonDirectory1 The parent directory of fileList1
 * @param {String} addonDirectory2 The parent directory of fileList2
 * @returns 
 */
function findDifferences(fileList1, fileList2, addonDirectory1="", addonDirectory2="") {
    let listOfNonExistingFiles = listOfSameFiles = listOfSameButChanges = [];

    for (let file1 of fileList1) {
        let match = null;

        for (let file2 of fileList2) {
            //If the path of file2 is equal to file1, then say it matches.
            if (file2 === file1) {
                match = file1;
            }
        }

        if (match == null) {
            listOfNonExistingFiles.push(file1);
        } else {
            const stats = fs.lstatSync(addonDirectory2 + match);
        
            const size = stats.size;
            const hash = hashFile(addonDirectory2 + match);
            const modified = stats.mtimeMs;

            const otherStats = fs.lstatSync(addonDirectory1 + file1);

            const oSize = otherStats.size;
            const oHash = hashFile(addonDirectory1 + file1);
            const oModified = otherStats.mtimeMs;

            if (size != oSize || hash != oHash || modified != oModified) {
                //file is different
                listOfSameButChanges.push(file1);
            } else {
                listOfSameFiles.push(file1);
            }
        }
    }

    return {listOfNonExistingFiles, listOfSameFiles, listOfSameButChanges}

}

//snippet from easy-downloader - pretty much the only bit of same code lol
function zipDir(dir) {
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });
    
    const output = fs.createWriteStream(path.join(__dirname, 'files.zip'));
    
    return new Promise((res, rej) => {
        output.on('close', () => {
            res();
        })

        archive.on('warning', function(err) {
            if (err.code === 'ENOENT') {
                // log warning
                console.warn(err);
            } else {
                // throw error
                rej(err);
            }
        });
    
        archive.pipe(output);
        archive.directory(dir, false);
        archive.finalize();
    })
}

module.exports = {lastOccuranceSplit, getFileInfo, readDirAndGetList, curateDirectory, hashFile, findDifferences, zipDir}