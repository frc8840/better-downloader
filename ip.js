async function getIp() {
    return new Promise((res, rej) => {
        require('dns').lookup(require('os').hostname(), function (err, add, fam) {
            res(add);
        })
    })
}

module.exports = getIp;