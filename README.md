# better-downloader
An improvement of the easy-downloader (https://github.com/frc8840/easy-downloader) that changes it into a real-time updating command-line tool.

# Prerequisites

NodeJS Version >17.5 (For `fetch`)  
Git  
  
This program will need to be installed on both the recieving computer and the hosting computer.  

# Running

Open Terminal/CMD into a new folder, then run:  
`git clone https://github.com/frc8840/better-downloader.git`  
  
Once downloaded, open the new downloaded repository in Terminal/CMD.  

Then run:  
`npm install`  
to install all packages needed to run the program.  
  
Once the packages are downloaded, run the program with:  
`node app.js`  
  
If you don't want to use the menu via the command line and rather start it instantly, use this format to run it:  
**For Hosting:**  
`node app.js --default ~/path/to/host/dir` (Hosting using the default port, 12652.)  
`node app.js 3333 ~/path/to/host/dir` (Using custom port 3333.)  
  
**For Recieving:**  
`node app.js --c:d ~/path/to/recieving/dir --ip 127.0.0.1` (Recieving using the default port from ip 127.0.0.1.)  
`node app.js --c:3333 ~/path/to/recieving/dir --ip 123.456.78.9` (Recieving using port 3333 from ip 123.456.78.9.)  
  
  
If there is a directory with files already in them that you want to use for recieving, set it up with:
`node app.js --setup ~/path/to/directory`  
or select the "Setup pre-existing directory for recieving" option in the menu.
