const ALLOWED_ORIGINS = [
  "https://quickhandsservicesmarketplace.com",
  "https://www.quickhandsservicesmarketplace.com",
  "https://quick-hands-marketplace-new.vercel.app",
  "https://quick-hands-website.vercel.app",
  "https://quick-hands-marketplace-dkb3fb4nt.vercel.app"
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
      error: "Method not allowed. Use POST."
    });
  }
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("PAYSTACK_SECRET_KEY is missing.");
    return res.status(500).json({
      error: "Payment setup is incomplete."
    });
  }
  if (!secretKey.startsWith("sk_test_")) {
    return res.status(403).json({
      error: "Test verification requires a Paystack test secret key."
    });
  }
  try {
    const reference =
      typeof req.body?.reference === "string"
        ? req.body.reference.trim()
        : "";
    if (
      !reference ||
      reference.length > 100 ||
      !/^[A-Za-z0-9._=-]+$/.test(reference)
    ) {
      return res.status(400).json({
        error: "A valid payment reference is required."
      });
    }
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    const result = await response.json();
    if (!response.ok || !result.status || !result.data) {
      return res.status(502).json({
        error: "Unable to verify this payment. Please try again."
      });
    }
    const transaction = result.data;
    if (transaction.status !== "success") {
      return res.status(200).json({
        verified: false,
        status: transaction.status || "pending",
        message: "Paystack has not confirmed a successful payment."
      });
    }
    return res.status(200).json({
      verified: true,
      status: "success",
      reference: transaction.reference,
      amount: transaction.amount,
      currency: transaction.currency,
      email: transaction.customer?.email || null,
      message: "Paystack confirmed the transaction succeeded."
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error?.message || "Unknown error"
    );
    return res.status(500).json({
      error: "Something went wrong while verifying payment."
    });
  }
};
