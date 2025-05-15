const delay = (min, max) => {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min
    const second = ms / 1000
    console.log(`waiting ${second} sec before gettin token again`)

    return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = delay