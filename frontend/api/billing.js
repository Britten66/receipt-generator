import Stripe from "stripe";
import { pool, authenticate } from "./_lib.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  // POST /api/billing?action=checkout  → create Stripe Checkout session
  // POST /api/billing?action=portal    → create customer portal session
  // GET  /api/billing                  → return current plan

  if (req.method === "GET") {
    const result = await pool.query("SELECT plan FROM profiles WHERE user_id = $1", [user.id]);
    return res.json({ plan: result.rows[0]?.plan ?? "free" });
  }

  const { action } = req.query;

  if (req.method === "POST" && action === "checkout") {
    // Get or create Stripe customer
    const profileRes = await pool.query(
      "SELECT stripe_customer_id, plan FROM profiles WHERE user_id = $1",
      [user.id]
    );
    let customerId = profileRes.rows[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      await pool.query(
        "UPDATE profiles SET stripe_customer_id = $1 WHERE user_id = $2",
        [customerId, user.id]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      subscription_data: { trial_period_days: 30 },
      success_url: `${process.env.APP_URL ?? req.headers.origin}?upgraded=1`,
      cancel_url: `${process.env.APP_URL ?? req.headers.origin}`,
    });
    return res.json({ url: session.url });
  }

  if (req.method === "POST" && action === "portal") {
    const profileRes = await pool.query(
      "SELECT stripe_customer_id FROM profiles WHERE user_id = $1",
      [user.id]
    );
    const customerId = profileRes.rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: "No billing account found" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL ?? req.headers.origin}`,
    });
    return res.json({ url: session.url });
  }

  res.status(405).json({ error: "Method not allowed" });
}
