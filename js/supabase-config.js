(() => {
  const projectUrl = "https://vmvbkbupykoesxxgarrb.supabase.co";
  const anonKey = "sb_publishable_Vboh9e8SrH6Ev8XHrMIkMQ_IhuwtiZr";
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const isUnconfigured = projectUrl.includes("YOUR_PROJECT") || anonKey.includes("YOUR_SUPABASE");
  window.cafeLocalMode = isLocalHost && isUnconfigured;

  if (!window.supabase?.createClient) {
    if (window.cafeLocalMode) return;
    window.cafeSupabaseConfigError = "Supabase client did not load. Check the internet connection and reload.";
    return;
  }
  if (isUnconfigured) {
    window.cafeSupabaseConfigError = "Configure the Supabase project URL and anon key in js/supabase-config.js.";
    return;
  }

  window.cafeSupabase = window.supabase.createClient(projectUrl, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();
