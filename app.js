const fs = require("fs");
const path = require("path");
const { findArgs, intro } = require("./argProcess");
const {curateDirectory, hashFile, findDifferences} = require("./files")
const extract = require("extract-zip")

var colors = require("colors");

const default_port = 12652;
global.dp = default_port;

const server = require("./server")
const { readDirAndGetList } = require("./files");

const baseSecretFileData = {
	previousConnections: [],
	fileData: [
		/*
		{
			location: <String>,
			fullLocation: <String>
			name: <String>,
			size: <String>,
			lastModified: <Date>,
			hash: <String>
		}
		*/
	]
}

let args = process.argv;

let argStorage = {};

function processOption(opt1="--", opt2="") {
	opt2 = String(opt2);

	if (opt1.startsWith("--c:")) {
		argStorage["connectHost"] = opt1.replace("--c:", "");
		return;
	}

	switch (opt1) {
		case "--setup":
			const fileExists = fs.existsSync(opt2);
			if (opt2 == "") throw "Not valid directory.";
			if (!fileExists) throw "Does not exist.";
			opt2 = curateDirectory(opt2);
			
			const isDir = fs.lstatSync(opt2).isDirectory();
			if (!isDir) throw "Not valid directory";

			fs.writeFileSync(path.join(opt2, ".8840reciever"), JSON.stringify(baseSecretFileData));
		case "--default":
			break;
		default:
			argStorage[opt1.replace("--", "")] = opt2;
	}
}

async function main() {
	//console.log(args)
	//remove the first two args.
	args.shift();
	args.shift();
	//worst solution ever. but it works.
	for (let i = 0; i < args.length; i++) {
		if (args.includes("%%space%%")) args[i] = args[i].replaceAll("%%space%%", " ");
	}
	if (args.length < 2) throw "Not enough args.";
	
	args.forEach((e, i) => {
		if (e.startsWith("--")) {
			processOption(e, i < args.length - 1 ? args[i + 1] : "");	
		}
	})

	if (args[0] == "--setup") { console.log(`Setup complete of folder: ${curateDirectory(args[1])}\n`.green); return; };

	const hosting = parseInt(String(args[0])); //First args will be the port the server will be hosted on. If not hosting, set it to 0.
	
	let isHosting = hosting != 0 && !String(args[0]).startsWith("--");
	if (args[0] == "--default") isHosting = true; //just incase it starts with --default
	if (args[0].startsWith("--c:")) isHosting = false;

	console.log(isHosting ? "Starting server..." : "Detected non hosting server.")
	const useCustomHost = args[0] != "--default" && hosting > 0;
	if (hosting < 0) throw "Port isn't valid.";
	
	const directory = curateDirectory(String(args[1]));

	let dirstat;

	try {
		dirstat = fs.lstatSync(directory);
	} catch (e) {
		throw "Directory doesn't exist."
	}

	if (!dirstat.isDirectory()) throw "File is not a directory."

	const connectingPort = isHosting ? null : (argStorage["connectHost"] == "d" ? default_port : parseInt(args["connectHost"]));

	//Examples:
	//.. --default ~/path/to/host/dir/                     Starts hosting a server on the default port using the directory.
	//.. 3333 ~/path/to/host/dir/                          Starts hosting a server on port 3333 using the directory.
	//.. --c:d ~/path/to/recipient/dir/ --ip 123.451.234   Starts listening for changes from a server hosted on the default port on computer on the same network with IP of 123.451.234
	//.. --c:3333 ~/path/to/recipient/dir --ip localhost   Starts listening for changes from a server hosted on port 3333 on localhost.

	if (!isHosting) {
		const files = fs.readdirSync(directory);
		let createdAlready = true;
		if (files.length > 0 && !files.includes(".8840reciever")) {
			throw "Error: Trying to use non-empty directory as a reciever does not work. Either use --setup <directory> to setup a non-empty directory as a recipient or create a new directory.";
		} else if (!files.includes(".8840reciever")) {
			createdAlready = false;
			console.log("Created tracking file in directory.".bgMagenta.white)
			fs.writeFileSync(path.join(directory, ".8840reciever"), JSON.stringify(baseSecretFileData));
		}

		if (!argStorage["ip"]) argStorage["ip"] = "localhost";

		if (connectingPort == null) throw "Connecting port is undefined, error!";

		let request, successful = true;
		try {
			request = await fetch(`http://${argStorage["ip"]}:${connectingPort}`);
		} catch (e) {
			successful = false;
			request = {status: 404};
		}
		
		if (request.status == 200) {
			const json = await request.json();

			if (json.ready) {
				console.log("Connected with host! Currently figuring out what needs to be updated.".green);

				const storedFileData = JSON.parse(await fs.readFileSync(path.join(directory, ".8840reciever")));
				const previousConnections = storedFileData.previousConnections;

				//Going to be a list of fileData objects
				const recieverData = storedFileData.fileData;
				//Will just be paths
				const locFiles = await readDirAndGetList(directory);
				
				let listOfNonExistingFiles = [], listOfSameFiles = [], listOfSameButChanges = [];

				for (let file1 of locFiles) {
					if (file1.endsWith(".8840reciever")) continue; //Just skip since it's the reciever data file.

					let match = null;

					for (let file2 of recieverData) {
						//If the path of file2 is equal to file1, then say it matches.
						//File1 will be local to the directory, same with file2!
						if (file2.location === file1) {
							match = file1;
						}
					}

					//If there were no matches, just add the path of file1 to the nonExistingFiles.
					if (match == null) {
						listOfNonExistingFiles.push(file1);
					} else {
						//Otherwise if there was a match, look at the files and check the information of the two
						const stats = fs.lstatSync(path.join(directory, match));
					
						const size = stats.size;
						const hash = hashFile(path.join(directory, match));
						const modified = stats.mtimeMs;

						const otherStats = fs.lstatSync(path.join(directory, file1));

						const oSize = otherStats.size;
						const oHash = hashFile(path.join(directory, file1));
						const oModified = otherStats.mtimeMs;

						//Last modified has been phased out since when moving files around and other things it will be come different - it's better just to rely off of other info.
						if (size != oSize || hash != oHash /*|| modified != oModified*/) {
							//file is different
							listOfSameButChanges.push(file1);
						} else {
							//file is the same
							listOfSameFiles.push(file1);
						}
					}
				}

				console.log(`Since the last time you've ran this program, there were a total of ${listOfSameButChanges.length + listOfNonExistingFiles.length} changes.`.magenta);
				console.log(`New/moved files: ${listOfNonExistingFiles.length}\nFiles with changes: ${listOfSameButChanges.length}\nFiles with no changes: ${listOfSameFiles.length}`.magenta);

				let waitTime = 1;
				if (listOfSameButChanges.length > 0) {
					console.log("--NOTICE--".bgRed.white + "".reset);
					console.log("I've noticed that there were a few changes to some files. This program will AUTOMATICALLY OVERWRITE these changes in 5 SECONDS.".red);
					console.log("If you DON'T want the changes to be OVERWRITTEN, PRESS Control + C NOW.".red);
					waitTime = 5000;
				}

				setTimeout(async () => {
					let finalList = [];
					finalList = finalList.concat(listOfNonExistingFiles, listOfSameButChanges, listOfSameFiles)

					finalList = finalList.map(e => {
						const fullLocation = path.join(directory, e);
						const stats = fs.lstatSync(fullLocation);
						const hash = hashFile(fullLocation);
						const size = stats.size;
						const lastModified = stats.mtimeMs;
						//solution for windows computers.
						const MacOS_ified_path = (e + "").replaceAll("\\", "/")
						const name = MacOS_ified_path.split("/")[e.split("/").length - 1];

						return {
							location: e,
							fullLocation,
							name,
							hash,
							size,
							lastModified,
						}
					})

					console.log("Sending file info to the host...".green);

					const request = await fetch(`http://${argStorage["ip"]}:${connectingPort}/filereq`, {
						method: "POST",
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							recieverData: finalList
						})
					});

					const continueAndRepeat = () => {
						console.log("-------------------------------------".bgWhite.white)

						//repeat
						setTimeout(() => {
							//Since it shifts two at the start, just add like two more args to there.
							args = ["empty", "arg"].concat(args);

							continueToMain();
						}, 10000)
					}

					if (request.status == 204) {
						console.log("There have been no changes since you've last updated these files!".green)
						continueAndRepeat();
					} else if (request.status == 200) {
						const dirFiles = fs.readdirSync(__dirname);
						const tpath = path.join(__dirname, "tmp_exp")

						//Check if it exists + is directory - if it is, remove it.
						if (dirFiles.includes("tmp_exp")) {
							const stats = fs.lstatSync(tpath);
							if (stats.isDirectory()) {
								fs.rmSync(tpath, { recursive: true });
							}
						}

						//Create a new directory in this folder.
						fs.mkdirSync(tpath);

						const fileStream = fs.createWriteStream(path.join(tpath, "_files.zip"));

						try {
							const arrayBuffer = await request.arrayBuffer();

							const writeToPath = () => { //Changing the method to be async so it flows better with the code (i don't want to reformat it after changing this bit lol)
								return new Promise((res, rej) => {
									fileStream.write(Buffer.from(arrayBuffer), (e) => {
										if (e) rej(e);
										else res();
									});
								})
							}

							await writeToPath();
						} catch (e) {
							console.error("There was an error downloading the file.", e)
							fileStream.close();
							return;
						}

						//I don't think i have to wait till it finishes since i already created the "writeToPath" async method so ill just close it here (shrug)
						fileStream.close();
						
						try {
							await extract(path.join(tpath, "_files.zip"), {
								dir: tpath
							})
						} catch (e) {
							console.error("There was an error looking at the files downloaded.")
							return;
						}

						const expandedPath = path.join(tpath, "tmp_min");

						const trackerInfo = JSON.parse(fs.readFileSync(path.join(expandedPath, ".tmptracker")))
						
						for (let infoPiece of trackerInfo.info) {
							let { location, name, realName } = infoPiece;

							const fileData = fs.readFileSync(path.join(expandedPath, name));

							if (location.startsWith("/")) location = location.replace("/", "");

							let splitPath = location.includes("/") ? location.split("/") : location.split("\\");

							splitPath.pop();

							let addedPath = directory;

							for (let i = 0; i < splitPath.length; i++) {
								addedPath = path.join(addedPath, splitPath[i]);

								const dirExists = fs.existsSync(addedPath);

								if (!dirExists) {
									fs.mkdirSync(addedPath);
								}
							}

							fs.writeFileSync(path.join(addedPath, realName), fileData);
						}

						console.log("Finished downloaded and updating data!".green)

						fs.rmSync(tpath, { recursive: true })

						//write the new and updated info to the file
						const updatedListOfFiles = await server.createComparisonForTracker(directory);

						const connectionWas = argStorage["ip"] + ":" + connectingPort

						fs.writeFileSync(path.join(directory, ".8840reciever"), JSON.stringify({
							previousConnections: [].concat(previousConnections, (previousConnections.includes(connectionWas) ? [] : [connectionWas])),
							fileData: updatedListOfFiles
						}))

						console.log("Updated logs for next time.".cyan)

						//repeat
						continueAndRepeat();

						//finally finished this messy *** code, lmfao this is so bad to look at and i DO NOT want to make any more changes after this...
						
					} else {
						console.error((await request.json()).msg);
					}
				}, waitTime);
			}
		} else {
			console.error("\nThe IP provided is not hosting anything - you might have not typed the right IP in or the right port.".red);
			process.exit();
		}

	} else {
		
		server.startServer(useCustomHost ? hosting : default_port, directory);
	}
	
}


//new line
console.log(); 

//intro
intro();

if (args.length < 3) {
	findArgs().then((res) => {
		args = res;

		if (typeof res === 'string' && String(res) === "exit") {
			process.exit();
		}

		continueToMain();
	}).catch((err) => {
		throw err;
	})
} else {
	continueToMain();
}


function continueToMain() {
	try {
		main();
	} catch (e) {
		console.error(e);
		process.exit();
	}
}

