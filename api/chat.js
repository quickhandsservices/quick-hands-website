const ALLOWED_ORIGINS = [
  "https://quickhandsservicesmarketplace.com",
  "https://www.quickhandsservicesmarketplace.com",
  "https://quick-hands-marketplace-new.vercel.app",
  "https://quick-hands-website.vercel.app"
];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Please send a POST request."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Quick Hands AI: OPENAI_API_KEY is missing.");
    return res.status(500).json({
      error: "AI setup is incomplete. Please contact the administrator."
    });
  }

  try {
    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        error: "Please shorten your message and try again."
      });
    }

    const instructions = `
You are Quick Hands AI, the customer assistant for
Quick Hands Services & Marketplace in Abuja, Nigeria.

Help customers with market shopping, supermarkets, personal
shopping, general errands, bill payments, pickups, deliveries,
bulk and wholesale requests, and marketplace navigation.

Business rules:
- Market and supermarket shopping service fee: ₦15,000
  per request or trip, subject to confirmation before work begins.
- Other errands are quoted according to task, distance,
  quantity of items, and work required.
- Bulk and wholesale requests require a quotation.
- Delivery charges are separate and must be confirmed.
- Never invent product prices, stock, order status, payment
  status, delivery tracking, or seller details.
- Never claim to have placed an order, processed a payment,
  issued a refund, or contacted anyone.
- If information is unavailable, say it needs confirmation.
- Be polite, clear, and concise.
- Website: https://quickhandsservicesmarketplace.com/
- WhatsApp: https://wa.me/2349041797547
`;

    const upstream = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          instructions,
          input: message,
          max_output_tokens: 700
        })
      }
    );

    const data = await upstream.json();

       if (!upstream.ok) {
      const errorType = data?.error?.type || "unknown";
      const errorCode = data?.error?.code || "unknown";

      console.error(
        "Quick Hands AI: OpenAI request failed.",
        "HTTP status:",
        upstream.status,
        "Error type:",
        errorType,
        "Error code:",
        errorCode
      );

      if (
        errorCode === "credit_balance_exhausted" ||
        errorType === "insufficient_quota"
      ) {
        return res.status(503).json({
          error: "Quick Hands AI is temporarily unavailable. Please try again later.",
          code: "AI_CREDITS_UNAVAILABLE"
        });
      }

      return res.status(502).json({
        error: "The AI service is temporarily unavailable. Please try again.",
        code: "AI_SERVICE_ERROR"
      });
    } 
    
    const reply = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();

    if (!reply) {
      console.error("Quick Hands AI: OpenAI returned no text.");
      return res.status(502).json({
        error: "The AI returned an empty response. Please try again."
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(
      "Quick Hands AI internal error:",
      error?.message || "Unknown error"
    );

    return res.status(500).json({
      error: "Something went wrong. Please try again shortly."
    });
  }
};
