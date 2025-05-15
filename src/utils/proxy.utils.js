const fs = require("fs")

class Proxy {
    static async load() {
        return fs.readFileSync("proxy.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => {
                const parts = line.trim().split(":")

                if (parts.length === 4) {
                    const [ip, port, username, password] = parts
                    return `https://${username}:${password}@${ip}:${port}`
                } else if (parts.length === 2) {
                    const [ip, port] = parts
                    return `https://${ip}:${port}`
                } else {
                    console.log("invalid proxy format:", parts)
                }
            })
    }
}

module.exports = Proxy