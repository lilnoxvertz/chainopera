const ethers = require("ethers")
const fs = require("fs")

class Wallet {
    static async generate(amount) {
        console.log(`generating ${amount} wallet    `)
        for (let i = 0; i < amount; i++) {
            const wallet = ethers.Wallet.createRandom()
            fs.appendFileSync("wallet.txt", `${wallet.privateKey},${wallet.address}\n`)
        }
        console.log(`done!`)
    }

    static async load() {
        return fs.readFileSync("wallet.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.split(",")[0])
    }
}

module.exports = Wallet