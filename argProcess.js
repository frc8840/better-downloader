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
            if (key && key.ctrl && key.name == 'c') {
                process.stdin.pause();
                c.lear();
                res("exit")
                return;
            }
            
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
                }
            }

            if (operator.typing.is) {
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
            on() {}
        },
        {
            txt: "Search for server",
            on() {}
        },
        {
            txt: "Setup pre-existing directory for recieving",
            on() {
                prompt("Enter directory location:", (response) => {
                    console.log(response);
                    process.exit();
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