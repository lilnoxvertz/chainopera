const { chatHeaders, interactionMaxCycle } = require("../config/config")
const { parentPort, workerData } = require("worker_threads")
const { HttpsProxyAgent } = require("https-proxy-agent")
const GroqClient = require("../config/groq")
const { ethers } = require("ethers")
const Helper = require("./helper/helper")
const delay = require("../utils/delay")
const chalk = require("chalk")
const { timestamp } = require("../utils/timestamp")
require("dotenv").config()

class OperaClient {
    static async sendChat() {
        const { wallet, apiKey, userId, token, proxy } = workerData
        const groqApiKey = process.env.groq_api_key

        const prompts = [
            "What is the difference between a coin and a token in cryptocurrency?",
            "How does blockchain ensure the security and immutability of data?",
            "What are smart contracts and how do they work?",
            "Why is decentralization important in blockchain technology?",
            "How does proof-of-work differ from proof-of-stake?",
            "What is a blockchain node and what does it do?",
            "How can cryptocurrencies be used in real-world applications?",
            "What are gas fees and why do they fluctuate?",
            "What is a crypto wallet and how does it work?",
            "How do NFTs (non-fungible tokens) function on the blockchain?",
            "What risks are associated with investing in cryptocurrencies?",
            "How does a decentralized exchange (DEX) work comparedBright to a centralized one?",
            "What is blockchain scalability and why is it a concern?",
            "How are new cryptocurrencies created and launched?",
            "What is a 51% attack and how can it impact a blockchain network?"
        ]

        const url = `https://chat.chainopera.ai/api/agentopera`
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const user = new ethers.Wallet(wallet)

        let cycle = 0
        let maxCycle = interactionMaxCycle

        while (cycle <= maxCycle) {
            const chatId = await Helper.generateRandomId()
            const randomIndex = Math.floor(Math.random() * prompts.length)
            const message = groqApiKey ? await GroqClient.getMessage() : prompts[randomIndex]
            const powChallengeData = await this.getPowChallengeId(user.address, apiKey, token, userId, chatId)

            const header = {
                ...chatHeaders,
                "Cookie": `auth_token=${token}`,
                "X-Llm-Api-Key": `sk-${apiKey}`,
                "X-Pow-Challenge-Id": powChallengeData.id,
                "X-Pow-Difficulty": powChallengeData.diff,
                "X-Pow-Nonce": powChallengeData.nonce
            }

            const payload = {
                agentName: "Auto",
                group: "web",
                id: chatId,
                messages: [
                    {
                        role: "user",
                        content: message,
                        parts: [
                            {
                                type: "text",
                                text: message
                            }
                        ]
                    }
                ],
                model: "chainopera-default",
                userId: userId
            }
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    agent,
                    body: JSON.stringify(payload)
                })

                const result = await response.text()
                const message = await Helper.extractText(result)

                if (!response.ok || message === "") {
                    console.log(`${timestamp()} ${chalk.redBright(`${user.address} FAILED INTERACTING WITH AI. RETRYING`)}`)
                    await new Promise(resolve => setTimeout(resolve, 30000))
                    continue
                }

                parentPort.postMessage({
                    type: "success",
                    data: {
                        address: user.address
                    }
                })

                await delay(20000, 30000)
            } catch (error) {
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }
            cycle++
            console.log(`${timestamp()} ${chalk.yellowBright(`${user.address} FINISHED ${cycle} CYCLE`)}`)
        }

        parentPort.postMessage({
            type: "done",
            data: `${chalk.greenBright(`${user.address} SUCCESSFULLY COMPLETED ${cycle} CYCLE`)}`
        })
    }

    static async getPowChallengeId(address, apiKey, token, userId, chatId) {
        let success = false
        let attempt = 0
        let maxAttempt = 10
        while (!success && attempt < maxAttempt) {
            try {
                const response = await fetch(`https://chat.chainopera.ai/chat/${chatId}`, {
                    method: "POST",
                    headers: {
                        'Accept': '*/*',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Content-Type': 'application/json',
                        'Origin': 'https://chat.chainopera.ai',
                        'Referer': `https://chat.chainopera.ai/chat/${chatId}`,
                        'Sec-Ch-Ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
                        'Sec-Ch-Ua-Mobile': '?0',
                        'Sec-Ch-Ua-Platform': '"Windows"',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'same-origin',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
                        'x-terminal-source': '2',
                        "Cookie": `${token}`,
                        "Next-Action": "7069bc002836000e52e923ba75102f320554b6e93e"
                    },
                    body: JSON.stringify([
                        "hi",
                        `sk-${apiKey}`,
                        `${userId}`
                    ])
                })

                if (!response.ok) {
                    console.log(`${timestamp()} ${chalk.redBright(`${address} FAILED GETTING POW CHALLENGE DATA`)}`)
                    await new Promise(resolve => setTimeout(resolve, 10000))
                    continue
                }

                const result = await response.text()

                const parsedResult = await Helper.parseResponse(result)
                const prompt = parsedResult.prompt
                const salt = parsedResult.salt
                const timestamps = parsedResult.timestamp

                const id = parsedResult.challenge_id
                const diff = parsedResult.difficulty
                const nonce = await Helper.getNonce(prompt, salt, timestamps, diff)

                success = true
                return {
                    id: id,
                    diff: diff,
                    nonce: nonce
                }
            } catch (error) {
                console.error(error)
            }
            attempt++
        }
    }

    static async checkIn() {
        const { token, address, proxy } = workerData
        const url = "https://chat.chainopera.ai/api/agent/ai-terminal-check-in"

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const user = new ethers.Wallet(address)

        const header = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Origin': 'https://chat.chainopera.ai',
            'Referer': 'https://chat.chainopera.ai/chat',
            'Sec-Ch-Ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            'Cookie': `auth_token=${token}`,
            'Authorization': token
        }

        let success = false
        let attempt = 0
        let maxAttempt = 10

        while (success === false && attempt < maxAttempt) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    agent
                })

                const result = await response.json()

                if (!response.ok) {
                    console.log(`${timestamp()} ${chalk.redBright(`${user.address} FAILED DOING CHECKIN! RETRYING`)}`)
                    await new Promise(resolve => setTimeout(resolve, 40000))
                    continue
                }

                success = true
                if (!result.checkIn) {
                    parentPort.postMessage({
                        type: "success",
                        data: {
                            checkIn: `${chalk.greenBright(`${user.address} ALREADY CHECKING IN TODAY`)}`
                        }
                    })
                    return
                }

                parentPort.postMessage({
                    type: "success",
                    data: {
                        checkIn: `${chalk.greenBright(`${user.address} SUCCESSFULLY CHECKING IN`)}`
                    }
                })
            } catch (error) {
                parentPort.postMessage({
                    type: "error",
                    data: `${chalk.redBright(error)}`
                })
            }
        }
    }

    static async getPoints() {
        const { address, token, proxy } = workerData
        const url = "https://chat.chainopera.ai/userCenter/api/v1/ai/terminal/getPoints"

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        const user = new ethers.Wallet(address)

        const header = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Referer': 'https://chat.chainopera.ai/',
            'Sec-Ch-Ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            'Cookie': `auth_token=${token}`,
            'Authorization': token
        }

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: header,
                agent
            })

            if (!response.ok) {
                parentPort.postMessage({
                    type: "failed",
                    data: response.message
                })
            }

            const result = await response.json()
            const todayPoint = result?.data.todayPoints
            const totalPoint = result?.data.totalPoints

            parentPort.postMessage({
                type: "success",
                data: {
                    address: user.address,
                    point: {
                        todayPoint: todayPoint,
                        totalPoint: totalPoint
                    }
                }
            })
        } catch (error) {
            parentPort.postMessage({
                type: "error",
                data: error.message
            })
            console.error(error)
        }
    }
}

module.exports = OperaClient
