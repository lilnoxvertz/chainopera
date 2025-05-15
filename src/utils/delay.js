const delay = (min, max) => {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min
    return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = delay