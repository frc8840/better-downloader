var keypress = require('keypress');
var colors = require("colors");

function isArrow(k) {
    const key = k.name;
    return key == "left" || key == "right" || key == "up" || key == "down";
}

function findArgs() {
    // make `process.stdin` begin emitting "keypress" events
    keypress(process.stdin);

    printMenu();

    return new Promise((res, rej) => {

        // listen for the "keypress" event
        process.stdin.on('keypress', function (ch, key) {
            let addThisToNextKey = true;

            if (key && key.ctrl && key.name == 'c') {
                process.stdin.pause();
                c.lear();
                if (!!global["menuFinished"]) process.exit();
                res("exit")
                return;
            }

            if (!!global["menuFinished"]) return;
            
            if (key) {
                if (isArrow(key) && !operator.typing.is) {
                    if (key.name == "down") {
                        operator.menuItem++;
                        if (operator.menuItem >= menus[operator.onMenu].length) operator.menuItem--;
                    } else if (key.name == "up") {
                        operator.menuItem--;
                        if (operator.menuItem < 0) operator.menuItem++;
                    }
                }

                if (key.name == "return") {
                    if (operator.typing.is) {
                        operator.typing.is = false;
                        operator.typing.callback(operator.typing.contents)
                    } else {
                        menus[operator.onMenu][operator.menuItem].on();
                    }

                    addThisToNextKey = false;
                }
            }

            if (operator.typing.is && addThisToNextKey) {
                if (key) {
                    if (key.name == "backspace") {
                        let str = operator.typing.contents.split('');
                        str.pop();
                        operator.typing.contents = str.join('');
                    } else {
                        operator.typing.contents += ch;
                    }
                } else {
                    if (ch != null) operator.typing.contents += ch;
                }
            }

            printMenu();

            if (!!global["menuFinished"]) {
                let finalArgs = ["",""];
                finalArgs = finalArgs.concat(global.margs)
                c.lear();
                intro();
                res(finalArgs)
            }
        });

        process.stdin.setRawMode(true);
        process.stdin.resume();
    });
}

const c = {
    lear() {
        console.clear()
    },
    l(n=1) {
        if (typeof n != 'number') throw "Typeof N is not number";
        if (n < 1) throw "too little lines to be made.";
        for (let i = 0; i < n; i++) {console.log("")};
    },
    line(n=1) {
        this.l(n);
    },
    log(...o) {
        console.log(...o)
    }
}

let operator = {
    menuItem: 0,
    onMenu: "home",
    typing: {
        is: false,
        contents: "",
        prompt: "",
        callback: (r) => {}
    }
}

function prompt(prompt, callback=(r)=>{}) {
    operator.typing.is = true;
    operator.typing.contents = "";
    operator.typing.prompt = prompt;
    operator.typing.callback = callback;
}

const menus = {
    "home": [
        {
            txt: "Host server",
            on() {
                const promptForAction = (extraMsg="") => {
                    prompt(extraMsg + "Enter port number to host on (enter 'default' if hosting on default port)", (response) => {
                        let port = parseInt(response);

                        if (response == "default") port = 12652;

                        if (isNaN(port) || port == null) promptForAction("Must enter a number or 'default'.\n");

                        global.margs = [
                            String(port),
                        ]

                        prompt("Enter directory location for host: ", (response) => {
                            global.margs.push(response),

                            global.menuFinished = true;
                        })
                    })
                }

                promptForAction();
            }
        },
        {
            txt: "Connect to server",
            on() {
                const promptForAction = (extraMsg="") => {
                    prompt(extraMsg + "Enter port number to connect to (enter 'default' if connecting to default port)", (response) => {
                        let port = parseInt(response);

                        if (response == "default") port = "d";

                        if (isNaN(port) || port == null) promptForAction("Must enter a number or 'default'.\n");

                        global.margs = [
                            "--c:" + String(port),
                        ]

                        prompt("Enter directory location for recieving files: ", (response) => {
                            global.margs.push(response);

                            prompt("computer ip address?", (response) => {
                                global.margs.push("--ip");
                                global.margs.push(response);
                                
                                global.menuFinished = true;
                            });

                        })
                    })
                }

                promptForAction();
            }
        },
        {
            txt: "Setup pre-existing directory for recieving",
            on() {
                prompt("Enter directory location:", (response) => {
                    global.margs = [
                        "--setup",
                        response
                    ]
                    
                    global.menuFinished = true;
                });
            }
        },
        {
            txt: "Exit (or Control + C)",
            on() {
                process.stdin.pause();
                c.lear();
                process.exit();
            }
        }
    ]
};

function printMenu() {
    c.lear();
    c.l()
    intro();
    c.l()
    c.log(`${"Use".green} ${"ARROW".bgGreen.white} ${"keys and".green} ${"ENTER".bgGreen.white} ${"to operate this menu.".green}`);
    c.l();
    
    const currentMenu = menus[operator.onMenu];
    
    for (let item in currentMenu) {
        if (item == operator.menuItem) {
            console.log(currentMenu[item].txt.bgBlue.white)
        } else {
            console.log(currentMenu[item].txt.blue)
        }
    }

    c.l();
    
    if (operator.typing.is) {
        console.log(operator.typing.prompt.yellow);
        console.log(operator.typing.contents.reset);
    }
}

function intro() {
    console.log([
        "      BETTER DOWNLOADER      ".bold.bgBlue.white,
        "",
        "by frc team #".italic.bgBlue.white + "".reset,
        "@----------------------------@".blue,
        "|   ###   #  #  #  #   ###   |".blue,
        "|  #   #  #  #  #  #  #   #  |".blue,
        "|   ###   ####  ####  #   #  |".blue,
        "|  #   #     #     #  #   #  |".blue,
        "|   ###      #     #   ###   |".blue,
        "@----------------------------@".blue,
        "".reset,
        ``
    ].join("\n"))
}

module.exports = {findArgs, intro};