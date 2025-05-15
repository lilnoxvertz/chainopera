const Groq = require("groq-sdk")
require("dotenv").config()

const groq = new Groq({
    apiKey: process.env.groq_api_key
})

class GroqClient {
    static async getMessage() {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: 'system',
                    content: `act like a human and ask anything about crypto`
                },
                {
                    role: 'user',
                    content: 'give me some question or topic about crypto'
                }
            ],
            temperature: 0.7,
            max_tokens: 1024,
        })
        return response.choices[0].message.content
    }
}

module.exports = GroqClient