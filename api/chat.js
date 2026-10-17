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

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

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
    console.error("OPENAI_API_KEY is not configured.");
    return res.status(500).json({
      error: "The AI service is not configured yet."
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
        error: "Your message is too long. Please shorten it."
      });
    }

    const instructions = `
You are Quick Hands AI, the customer assistant for
Quick Hands Services & Marketplace in Abuja, Nigeria.

Help customers understand the marketplace, shopping,
errands, pickups, deliveries, and how to contact the team.

Business rules:
- Market and supermarket shopping service fee:
  ₦15,000 per request or trip, subject to confirmation
  of the applicable charge before work begins.
- Other errands are quoted according to the task,
  distance, quantity of items, and work required.
- Bulk and wholesale requests require a quotation.
- Delivery charges are separate and must be confirmed.
- Never invent product prices, availability, order status,
  payment status, delivery tracking, or seller details.
- If information is unavailable, explain that it needs
  confirmation from the Quick Hands team.
- Do not claim to have placed orders, processed payments,
  issued refunds, or contacted anyone.
- Be polite, clear, and concise.
- Direct customers to https://quickhandsservicesmarketplace.com/
  or WhatsApp https://wa.me/2349041797547 when appropriate.
`;

    const response = await fetch(
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

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenAI API error:",
        response.status,
        JSON.stringify(data)
      );

      return res.status(502).json({
        error: "The AI could not respond right now. Please try again."
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
      console.error("OpenAI returned no text response.");

      return res.status(502).json({
        error: "No response was received. Please try again."
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Quick Hands AI error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again shortly."
    });
  }
};
