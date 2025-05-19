const crypto = require("crypto")

class Helper {
    static async extractText(data) {
        const regex = /^0:"((?:[^"\\]|\\.)*)"/gm
        const matches = []
        let match
        while ((match = regex.exec(data)) !== null) {
            const unescapedText = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
            matches.push(unescapedText)
        }
        return matches.join('')
    }

    static async generateRandomId() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        let id = ""
        for (let i = 0; i < 16; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return id
    }

    static async parseResponse(data) {
        const obj = data.split('\n').reduce((acc, line) => {
            const colonIndex = line.indexOf(':')

            if (colonIndex === -1) return acc

            const key = line.slice(0, colonIndex)
            const jsonString = line.slice(colonIndex + 1).trim();

            try {
                acc[key] = JSON.parse(jsonString)
            } catch (err) {
                console.warn(`Failed to parse line: ${line}`)
            }

            return acc
        }, {})

        return obj["1"];
    }

    static async getNonce(prompt, salt, timestamp, difficulty) {
        const targetPrefix = '0'.repeat(difficulty)
        let nonce = 0

        while (true) {
            const input = `${prompt}${salt}${timestamp}${nonce}`

            const hash = crypto.createHash('sha256')
                .update(input, 'utf8')
                .digest('hex')

            if (hash.startsWith(targetPrefix)) {
                return nonce
            }

            nonce++

            if (nonce % 10000 === 0) {
                await new Promise(resolve => setImmediate(resolve))
            }
        }
    }
}

module.exports = Helper