const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body)
});

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { message: "Method not allowed." });
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase login function is missing required environment variables.");
    return json(503, { message: "Login service is not configured yet." });
  }

  let credentials;
  try {
    credentials = JSON.parse(event.body || "");
  } catch {
    return json(400, { message: "Invalid login request." });
  }

  const username = String(credentials.username || "").trim().toLowerCase();
  const password = String(credentials.password || "");
  if (!/^[a-z0-9._-]{1,50}$/.test(username) || !password) {
    return json(400, { message: "Enter your username and password." });
  }

  try {
    const profileUrl = new URL("/rest/v1/profiles", SUPABASE_URL);
    profileUrl.searchParams.set("select", "email,active");
    profileUrl.searchParams.set("username", `eq.${username}`);
    profileUrl.searchParams.set("limit", "1");
    const profileResponse = await fetch(profileUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (!profileResponse.ok) {
      console.error("Supabase profile lookup failed with status", profileResponse.status);
      return json(503, { message: "Login service could not check the account." });
    }
    const profiles = await profileResponse.json();
    const profile = profiles[0];
    if (!profile?.active) {
      return json(401, { message: "Invalid username or password." });
    }

    const authResponse = await fetch(
      `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: profile.email, password })
      }
    );
    const session = await authResponse.json();
    if (!authResponse.ok || !session.access_token || !session.refresh_token) {
      return json(401, { message: "Invalid username or password." });
    }

    return json(200, {
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  } catch (error) {
    console.error("Supabase login request failed:", error);
    return json(503, { message: "Login service is temporarily unavailable." });
  }
}
