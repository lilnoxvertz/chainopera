const Proxy = require("../utils/proxy.utils")
const Wallet = require("../utils/wallet.utils")
const Workers = require("../worker/worker")

async function loadWallet() {
    try {
        console.clear()

        const walletArr = await Wallet.load()
        const proxyArr = await Proxy.load()

        if (walletArr.length === 0) {
            console.log("no private key found!")
            process.exit(1)
        }

        const loginTask = []
        const authDataArr = []
        const checkInTask = []

        console.log("[STARTING LOGIN WORKERS]\n")
        for (let i = 0; i < walletArr.length; i++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[i % proxyArr.length]
            loginTask.push(() => Workers.authWorker(walletArr[i], proxy))
        }

        const data = await Workers.limitTasks(loginTask, 5)

        walletArr.forEach((address, index) => {
            authDataArr.push({
                address: address,
                token: data[index].token
            })
        })

        console.log("\n[STARTING CHECKIN WORKERS]\n")
        for (let j = 0; j < authDataArr.length; j++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[j % proxyArr.length]
            checkInTask.push(() => Workers.checkInWorker(authDataArr[j].address, authDataArr[j].token, proxy))
        }

        await Workers.limitTasks(checkInTask, 5)
    } catch (error) {
        console.error(error)
    }
}

loadWallet()