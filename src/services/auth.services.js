const { ethers } = require("ethers")
const { headers } = require("../config/config")
const { parentPort, workerData } = require("worker_threads")
const { HttpsProxyAgent } = require("https-proxy-agent")

class Auth {
    static async generateCookie() {
        const sessionStart = Date.now() - Math.floor(Math.random() * 10000 + 5000)
        const sessionNow = Date.now()

        const cookie = {
            distinct_id: crypto.randomUUID(),
            $sesid: [
                sessionStart,
                crypto.randomUUID(),
                sessionNow
            ],
            $epp: true,
            $initial_person_info: {
                r: "$direct",
                u: "https://chat.chainopera.ai/"
            }
        }

        const parsed = JSON.stringify(cookie)
        const encodedCookie = encodeURIComponent(parsed)
        const finalCookie = `ph_phc_57Xtbo1FiTRjTSMmPI4WjLZTG4wn3r7cURSPaD7HwuF_posthog=${encodedCookie}`
        return finalCookie
    }

    static async getMessage(walletAddress, cookie, agent) {
        const url = "https://chat.chainopera.ai/userCenter/api/v1/wallet/getSIWEMessage-v1"
        const payload = {
            address: walletAddress
        }

        const header = {
            ...headers,
            "Cookie": cookie
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: header,
                agent,
                body: JSON.stringify(payload)
            })

            const result = await response.json()

            const messageData = result.data

            return {
                siweMessage: messageData
            }
        } catch (error) {
            console.error(error)
        }
    }

    static async login() {
        let status = "FAILURE"

        const { wallet, proxy } = workerData
        const agent = new HttpsProxyAgent(proxy)

        const signer = new ethers.Wallet(wallet)
        const cookie = await this.generateCookie()

        while (status === "FAILURE") {
            let success = false
            try {
                console.log("PROCESSING", signer.address, proxy)
                const messageData = await this.getMessage(signer.address, cookie, agent)
                const signature = await signer.signMessage(messageData.siweMessage)

                const url = "https://chat.chainopera.ai/userCenter/api/v1/client/user/login"

                const payload = {
                    address: signer.address,
                    loginChannel: 4,
                    siweMessage: messageData.siweMessage
                }

                const header = {
                    ...headers,
                    "Cookie": cookie,
                    "Sign": signature
                }

                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    agent,
                    body: JSON.stringify(payload)
                })

                const result = await response.json()

                if (result?.code === "SUCCESS" && result?.data?.token) {
                    status = "SUCCESS"
                    success = true

                    parentPort.postMessage({
                        type: "done",
                        data: {
                            signature: signature,
                            code: result?.code,
                            token: result?.data?.token,
                            id: result?.data?.id,
                            apiKey: result?.data?.apiKey,
                            wallet: signer.privateKey,
                            address: signer.address
                        }
                    })
                }
            } catch (error) {
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
                console.error(error)
            }

            if (!success) {
                console.log(`\n❌ FAILED RETRIEVEING TOKEN FOR ${signer.address}. RETRYING`)
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }
    }
}

module.exports = Auth