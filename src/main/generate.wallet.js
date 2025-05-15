const Wallet = require("../utils/wallet.utils");

async function generate(amount) {
    await Wallet.generate(amount)
}

generate(5) // change 5 with any amount that you want