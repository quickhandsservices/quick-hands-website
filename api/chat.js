const ALLOWED_ORIGINS = [
“https://quickhandsservicesmarketplace.com”,
“https://www.quickhandsservicesmarketplace.com”,
“https://quick-hands-marketplace-new.vercel.app”
];

module.exports = async function handler(req, res) {
const origin = req.headers.origin;

if (ALLOWED_ORIGINS.includes(origin)) {
res.setHeader(“Access-Control-Allow-Origin”, origin);
res.setHeader(“Vary”, “Origin”);
}

res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);
res.setHeader(“Cache-Control”, “no-store”);

if (req.method === “OPTIONS”) {
return res.status(204).end();
}

if (req.method !== “POST”) {
return res.status(405).json({ error: “Method not allowed.” });
}

if (!process.env.OPENAI_API_KEY) {
return res.status(500).json({
error: “AI setup is incomplete. Please try again later.”
});
}

try {
const message = req.body && req.body.message;

if (typeof message !== "string" || !message.trim()) {
  return res.status(400).json({
    error: "Please enter a message."
  });
}
if (message.length > 4000) {
  return res.status(400).json({
    error: "Please keep your message under 4,000 characters."
  });
}
const aiResponse = await fetch(
  "https://api.openai.com/v1/responses",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      instructions: "You are QuickHands AI, the customer assistant for Quick Hands Services & Marketplace in Abuja, Nigeria. Help customers with shopping, shops, products, errands, pickups, delivery and marketplace services. Be friendly, concise and honest. Do not claim to have checked live products, stock, orders, payments or deliveries because no live database lookup is connected yet. Market and supermarket shopping service fee is ₦15,000, separate from goods and delivery. Other errands vary by task and distance; confirm the quote before work starts. Bulk and wholesale orders vary. Delivery charges are confirmed separately before dispatch. For bookings or help with a real order, direct customers to https://wa.me/2349041797547. Never request passwords, API keys or bank PINs.",
      input: message,
      max_output_tokens: 400
    })
  }
);
const data = await aiResponse.json();
if (!aiResponse.ok) {
  console.error("OpenAI request failed:", data.error?.code || "unknown");
  return res.status(502).json({
    error: "The AI service could not answer just now. Please try again."
  });
}
const answer = (data.output || [])
  .flatMap(item => item.content || [])
  .filter(item => item.type === "output_text")
  .map(item => item.text)
  .join("\n")
  .trim();
return res.status(200).json({
  reply: answer || "Please try asking your question another way."
});

} catch (error) {
console.error(“QuickHands AI error:”, error.message);
return res.status(500).json({
error: “Something went wrong. Please try again.”
});
}
};