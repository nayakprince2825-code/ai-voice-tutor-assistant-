
export default async function handler(req, res) {
  // Only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is not configured on the server."
    });
  }

  try {
    const { question, history = [] } = req.body || {};

    if (
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 4000
    ) {
      return res.status(400).json({
        error: "Please enter a valid question (maximum 4000 characters)."
      });
    }

    // Accept only safe conversation roles and text
    const safeHistory = Array.isArray(history)
      ? history.slice(-10).filter(item =>
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string"
        ).map(item => ({
          role: item.role,
          content: item.content.slice(0, 4000)
        }))
      : [];

    const messages = [
      {
        role: "system",
        content: `You are Nova AI, a friendly and intelligent educational tutor.

Your rules:
1. Answer in the same language as the user's question.
2. Support Hindi and English.
3. Explain concepts in simple words.
4. Give accurate and useful answers.
5. For educational questions, explain step by step when helpful.
6. Keep simple answers short and clear.
7. Use examples when they improve understanding.
8. Be polite and encouraging.
9. If you do not know something, say so honestly.
10. Do not pretend to have real-time information if you cannot verify it.`
      },
      ...safeHistory,
      {
        role: "user",
        content: question.trim()
      }
    ];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages,
          max_completion_tokens: 1200,
          temperature: 0.5
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(response.status).json({
        error: data.error?.message || "Groq API request failed."
      });
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        error: "AI returned an empty response."
      });
    }

    return res.status(200).json({
      answer: answer.trim()
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
