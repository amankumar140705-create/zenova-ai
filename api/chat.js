module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.status(503).json({
            error: "AI service is not configured"
        });
    }

    try {
        const { messages } = req.body || {};

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: "Please provide a message"
            });
        }

        if (messages.length > 30) {
            return res.status(400).json({
                error: "Conversation is too long"
            });
        }

        const conversation = messages
            .filter(m =>
                m &&
                ["user", "assistant"].includes(m.role) &&
                typeof m.content === "string"
            )
            .map(m => ({
                role: m.role,
                content: m.content.slice(0, 4000)
            }));

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "openai/gpt-oss-20b",
                    messages: [
                        {
                            role: "system",
                            content: `You are ZENOVA AI, an intelligent,
friendly and helpful general-purpose AI assistant.

Help users with science, mathematics, technology,
education, writing, creativity and everyday questions.

Explain difficult concepts clearly.
Show mathematical solutions step by step.
Use conversation history to understand follow-up questions.
Give accurate and useful answers.
Be honest when you are uncertain.
Never invent facts.
Be friendly, respectful and professional.`
                        },
                        ...conversation
                    ],
                    temperature: 0.7,
                    max_completion_tokens: 1500
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: "AI service request failed"
            });
        }

        return res.status(200).json({
            reply: data.choices?.[0]?.message?.content || 
                   "I couldn't generate a response."
        });

    } catch (error) {
        return res.status(500).json({
            error: "Something went wrong"
        });
    }
};
