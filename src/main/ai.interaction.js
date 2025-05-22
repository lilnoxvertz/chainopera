const Wallet = require("../utils/wallet.utils");
const Workers = require("../worker/worker");
const Proxy = require("../utils/proxy.utils");

async function loadWallet() {
    let maxWorker = 10

    const walletArr = await Wallet.load()
    const proxyArr = await Proxy.load()

    if (walletArr.length === 0) {
        console.log("no private key found")
        process.exit(1)
    }

    if (proxyArr.length === 0) {
        console.log("no proxy found. using current ip")
        maxWorker = 2
    }

    const loginTask = []
    const interactionTask = []
    const authDataArr = []

    try {
        console.clear()

        for (let i = 0; i < walletArr.length; i++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[i % proxyArr.length]
            loginTask.push(() => Workers.authWorker(walletArr[i], proxy))
        }

        console.log("[STARTING LOGIN TASK]")
        const data = await Workers.limitTasks(loginTask, maxWorker)

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

        console.log("\n[STARTING INTERACTION TASK]")
        const a = await Workers.limitTasks(interactionTask, maxWorker)
        console.log(a)
    } catch (error) {
        console.error(error)
    }
}

loadWallet()
