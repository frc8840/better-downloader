const fs = require("fs");
const path = require("path");
const { findArgs, intro } = require("./argProcess");
const {curateDirectory} = require("./files")

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
	if (args.length < 2) throw "Not enough args.";
	
	args.forEach((e, i) => {
		if (e.startsWith("--")) {
			processOption(e, i < args.length - 1 ? args[i + 1] : "");	
		}
	})

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

	if (!dirstat.isDirectory()) throw "File "

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

				const recieverData = JSON.parse(await fs.readFileSync(path.join(directory, ".8840reciever")));
				const locFiles = await readDirAndGetList(directory);
				
				let listOfNonExistingFiles = listOfSameFiles = listOfSameButChanges = [];

				for (let file of recieverData.fileData) {
					let opath = file.location;

					let match = null;

					for (let lfile of locFiles) {
						const localPath = lfile.replace(directory, "/");
						if (!file.startsWith("/")) file = "/" + file;

						if (localPath == file) {
							match = lfile;
						}
					}

					if (match == null) {
						listOfNonExistingFiles.push(file);
					} else {
						const stats = fs.lstatSync(match);
						
					}
				}

				const request = await fetch(`http://${argStorage["ip"]}:${connectingPort}/filereq`, {
					method: "POST",
					headers: {
						'Content-Type': 'application/json'
					},
					body: {
						recieverData: []
					}
				});

			}
		} else {
			console.error("\nThe IP provided is not hosting anything - you might have not typed the right IP in or the right port.".red);
			process.exit();
		}

	} else {
		
		server.startServer(useCustomHost ? hosting : default_port);
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

