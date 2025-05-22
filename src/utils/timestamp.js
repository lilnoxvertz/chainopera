const chalk = require("chalk");
const moment = require("moment-timezone")

const timestamp = () => {
    return chalk.cyan(`[${moment().tz('Asia/Jakarta').format('HH:mm:ss')}]`)
}

module.exports = { timestamp }