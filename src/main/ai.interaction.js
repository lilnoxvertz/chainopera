const Wallet = require("../utils/wallet.utils");
const Workers = require("../worker/worker");
const delay = require("../utils/delay");
const Proxy = require("../utils/proxy.utils");

let isRunning = true

async function loadWallet() {
    let cycle = 0

    const walletArr = await Wallet.load()
    const proxyArr = await Proxy.load()

    if (walletArr.length === 0) {
        console.log("no private key found")
        process.exit(1)
    }

    const loginTask = []
    const interactionTask = []
    const authDataArr = []

    try {
        while (isRunning) {
            console.clear()
            console.log(`[CYCLE ${cycle}]`)
            if (cycle === 10) {
                console.log("reached 10 cycles.. stopping bot..")
                process.exit(1)
            }

            for (let i = 0; i < walletArr.length; i++) {
                const proxy = proxyArr.length === 0 ? "" : proxyArr[i % proxyArr.length]
                loginTask.push(() => Workers.authWorker(walletArr[i], proxy))
            }

            console.log("[STARTING LOGIN TASK]\n")
            const data = await Workers.limitTasks(loginTask, 5)

            if (data.length === 0) {
                console.log("no data received from Workers")
            }

            walletArr.forEach((address, index) => {
                authDataArr.push({
                    address: address,
                    apiKey: data[index].apiKey,
                    id: data[index].id,
                    token: data[index].token
                })
            })

            for (let j = 0; j < loginTask.length; j++) {
                const proxy = proxyArr.length === 0 ? "" : proxyArr[j % proxyArr.length]
                const address = authDataArr[j].address
                const apiKey = authDataArr[j].apiKey
                const userId = authDataArr[j].id
                const token = authDataArr[j].token

                interactionTask.push(() => Workers.interactWorker(address, token, apiKey, userId, proxy))
            }

            console.log("\n[STARTING INTERACTION TASK]\n")
            await Workers.limitTasks(interactionTask, 5)
            cycle++

            console.log("\nWAITING BEFORE STARTING NEXT CYCLE")
            await delay(10000, 20000)
        }
    } catch (error) {
        console.error(error)
    }
}

loadWallet()