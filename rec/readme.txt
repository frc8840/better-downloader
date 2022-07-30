Notice: If you're in the 'rec' directory right now, this is supposed to be meant to be read from the 'host' directory.

This directory and the 'rec' directory can be used for testing this program out!

Open two Terminal/CMD windows, and open them both up to the better-downloader directory.

On one, first run:
node app.js --default ./host

and on the second run:
node app.js --c:d ./rec --ip localhost

Make changes in this directory (the host directory) and you'll see them occasionally update in the rec (recieving) folder!