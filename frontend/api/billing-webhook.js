import Stripe from "stripe";
import { pool } from "./_lib.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"];
  const raw = await getRawBody(req);
  let event;

  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const setPlan = async (customerId, plan) => {
    await pool.query("UPDATE profiles SET plan = $1 WHERE stripe_customer_id = $2", [plan, customerId]);
  };

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const plan = sub.status === "active" || sub.status === "trialing" ? "pro" : "free";
      await setPlan(sub.customer, plan);
      break;
    }
    case "customer.subscription.deleted": {
      await setPlan(event.data.object.customer, "free");
      break;
    }
  }

  res.json({ received: true });
}
