const { Worker } = require("worker_threads")
const path = require("path")

class Workers {
    static async authWorker(wallet, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./auth.worker.js"), {
                workerData: {
                    wallet: wallet,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve(message.data)
                }

                if (message.type === "error") {
                    console.error("worker error", message.data)
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error("worker stopped"))
                }
            })
        })
    }

    static async checkInWorker(walletAddress, token, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./checkIn.worker.js"), {
                workerData: {
                    address: walletAddress,
                    token: token,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "success") {
                    console.log(`[${message.data.address}]`)
                    console.log(`✅ ${message.data.checkIn}\n`)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error("worker stopped"))
                }
            })
        })
    }

    static async interactWorker(wallet, token, apiKey, userId, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./ai.worker.js"), {
                workerData: {
                    wallet: wallet,
                    apiKey: apiKey,
                    userId: userId,
                    token: token,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    console.log(message.data)
                    resolve()
                }

                if (message.type === "success") {
                    console.log(`✅ ${message.data.address} SUCCESSFULLY INTERACTING WITH AI`)
                    resolve()
                }

                if (message.type === "error") {
                    console.error("worker error:", message.data)
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error(`worker stopped`))
                }
            })
        })
    }

    static async pointWorker(wallet, token, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./point.worker.js"), {
                workerData: {
                    address: wallet,
                    token: token,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "success") {
                    console.log(`[${message.data.address}]`)
                    console.log(`🪙 Today Points : ${message.data.point.todayPoint}`)
                    console.log(`🪙 Total Points : ${message.data.point.totalPoint}\n`)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error("worker stopped"))
                }
            })
        })
    }

    static async limitTasks(tasks, limit) {
        const results = []
        let taskIndex = 0

        async function runner() {
            while (taskIndex < tasks.length) {
                const currentIndex = taskIndex++
                try {
                    const result = await tasks[currentIndex]()
                    results[currentIndex] = result
                } catch (error) {
                    results[currentIndex] = { error }
                }
            }
        }

        const workers = []
        for (let i = 0; i < Math.min(limit, tasks.length); i++) {
            workers.push(runner())
        }

        await Promise.all(workers)
        return results
    }
}

module.exports = Workers