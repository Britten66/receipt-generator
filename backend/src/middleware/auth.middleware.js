import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = auth.slice(7);

  try {
    /*
      supabase.auth.getUser() makes an outbound HTTP call to Supabase.
      Without try/catch, any network failure or malformed response throws
      an Error that propagates to Express's global error handler. That handler
      does `res.status(err.status ?? 500)` — and Supabase error objects often
      carry a status field (e.g. 400), which is what the client was seeing.
      Wrapping in try/catch ensures we always return a clean 401, never a 400/500
      that leaks internal Supabase error details.
    */
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("authenticate:", err.message);
    return res.status(401).json({ error: "Authentication failed" });
  }
};
