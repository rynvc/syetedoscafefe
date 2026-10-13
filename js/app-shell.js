(() => {
  const pages = [
    { file: "dashboard.html", label: "Dashboard" },
    { file: "pos.html", label: "POS Checkout" },
    { file: "catalog.html", label: "Menu" },
    { file: "analytics.html", label: "Sales Revenue" }
  ];
  const currentFile = window.location.pathname.split("/").pop() || "dashboard.html";
  const activePage = pages.find(page => page.file === currentFile) || pages[0];
  const sidebar = document.querySelector(".sidebar") || document.createElement("aside");

  sidebar.className = "sidebar";
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <span class="brand-mark" aria-hidden="true">SD</span>
      <span class="brand-name">Syete Dos<small>Cafe</small></span>
    </div>
    <nav class="sidebar-nav" aria-label="Main navigation">
      ${pages.map(page => `
        <a href="${page.file}"${page.file === activePage.file ? ' class="active" aria-current="page"' : ""}>${page.label}</a>
      `).join("")}
    </nav>
    <div class="sidebar-user">
      <span class="user-mark" aria-hidden="true">LR</span>
      <span>Lemsther Rivera<small>Admin</small></span>
    </div>
  `;

  if (!sidebar.isConnected) document.body.prepend(sidebar);

  let main = document.querySelector(".main-content");
  if (!main) {
    const dashboardContent = document.querySelector(".dashboard-content");
    if (!dashboardContent) return;
    main = document.createElement("main");
    main.className = "main-content";
    dashboardContent.before(main);
    main.append(dashboardContent);
  }

  document.body.classList.add("app-screen");
  const content = document.createElement("div");
  content.className = "page-content";
  [...main.childNodes].forEach(node => {
    if (!node.classList?.contains("app-topbar")) content.append(node);
  });

  const topbar = document.createElement("header");
  topbar.className = "app-topbar";
  topbar.innerHTML = `
    <span>${activePage.label}</span>
    <div class="topbar-meta">
      <span class="topbar-status">● Online</span>
      <span class="topbar-user">Admin</span>
      <span>${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      <a class="topbar-logout" href="index.html">Logout</a>
    </div>
  `;
  main.replaceChildren(topbar, content);

  async function requireSignedInOwner() {
    if (window.cafeLocalMode) return;
    if (window.cafeSupabaseConfigError || !window.cafeSupabase) {
      const message = window.cafeSupabaseConfigError || "Supabase client is unavailable.";
      console.error(message);
      main.prepend(Object.assign(document.createElement("p"), {
        className: "alert alert-danger",
        textContent: message
      }));
      return;
    }
    const client = window.cafeSupabase;
    const { data: sessionResult, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionResult.session) {
      window.location.replace("index.html");
      return;
    }
    const { data: profile, error } = await client.from("profiles")
      .select("username, full_name, role, active")
      .eq("user_id", sessionResult.session.user.id)
      .single();
    if (error) throw error;
    if (!profile.active) {
      await client.auth.signOut();
      window.location.replace("index.html");
      return;
    }
    subscribeToCafeChanges();
    const name = profile.full_name || profile.username;
    const importLink = document.getElementById("importOldData");
    if (importLink) importLink.hidden = profile.role !== "owner";
    document.querySelector(".sidebar-user > span:last-child").innerHTML =
      `${escapeShellText(name)}<small>${escapeShellText(profile.role)}</small>`;
    document.querySelector(".topbar-user").textContent = name;
    document.querySelector(".topbar-logout").addEventListener("click", async event => {
      event.preventDefault();
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) {
        console.error("Could not sign out:", signOutError);
        return;
      }
      window.location.href = "index.html";
    });
  }

  function escapeShellText(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  requireSignedInOwner().catch(error => {
    console.error("Could not verify sign-in:", error);
    window.location.replace("index.html");
  });
})();
