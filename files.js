const path = require("path");

async function readDirAndGetList(currentDir) {
    let list = [];
    let files = await fs.readdirSync(currentDir);

    for (let file of files) {
        const p = path.join(currentDir, file)
        if (fs.lstatSync(p).isDirectory()) {
            let secondaryList = await readDirAndGetList(p);
            list = list.concat(secondaryList);
        } else {
            list.push(p);
        }
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
	if (dir.startsWith("~")) return dir;

	if (dir.startsWith("./")) return path.join(__dirname, dir.replace("./", "/"));
	
	return dir;
}


module.exports = {lastOccuranceSplit, getFileInfo, readDirAndGetList, curateDirectory}