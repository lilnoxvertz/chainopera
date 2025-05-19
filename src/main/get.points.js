const Proxy = require("../utils/proxy.utils")
const Wallet = require("../utils/wallet.utils")
const Workers = require("../worker/worker")

async function loadWallet() {
    let maxWorker = 5
    try {
        console.clear()

        const walletArr = await Wallet.load()
        const proxyArr = await Proxy.load()

        if (walletArr.length === 0) {
            console.log("no private key found!")
            process.exit(1)
        }

        if (proxyArr.length === 0) {
            console.log("no proxy found. using current ip")
            maxWorker = 2
        }

        const loginTask = []
        const authDataArr = []
        const checkInTask = []

        console.log("[STARTING LOGIN WORKERS]\n")
        for (let i = 0; i < walletArr.length; i++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[i % proxyArr.length]
            loginTask.push(() => Workers.authWorker(walletArr[i], proxy))
        }

        const data = await Workers.limitTasks(loginTask, maxWorker)

        walletArr.forEach((address, index) => {
            authDataArr.push({
                address: address,
                token: data[index].token
            })
        })

        console.log("\n[STARTING POINTS WORKERS]\n")
        for (let j = 0; j < authDataArr.length; j++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[j % proxyArr.length]
            checkInTask.push(() => Workers.pointWorker(authDataArr[j].address, authDataArr[j].token, proxy))
        }

        await Workers.limitTasks(checkInTask, maxWorker)
    } catch (error) {
        console.error(error)
    }
}

loadWallet()