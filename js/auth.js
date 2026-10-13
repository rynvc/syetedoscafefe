document.addEventListener("DOMContentLoaded", () => {
    if (window.location.protocol === "file:") {
        window.location.replace("http://localhost/syete-dos-cafe/index.html");
        return;
    }

    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");

    if (passwordInput && togglePassword) {
        const passwordIcon = togglePassword.querySelector("i");
        togglePassword.addEventListener("click", () => {
            const isVisible = passwordInput.type === "text";
            passwordInput.type = isVisible ? "password" : "text";
            togglePassword.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
            togglePassword.setAttribute("aria-pressed", String(!isVisible));
            passwordIcon?.classList.toggle("fa-eye", isVisible);
            passwordIcon?.classList.toggle("fa-eye-slash", !isVisible);
        });
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;
            const errorMessage = document.getElementById("errorMsg");

            try {
                if (window.cafeLocalMode) {
                    const response = await fetch("php/login.php", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username, password })
                    });
                    const result = await response.json();
                    if (!response.ok || result.status !== "success") {
                        throw new Error(result.message || "Invalid username or password.");
                    }
                    window.location.href = "dashboard.html";
                    return;
                }
                if (window.cafeSupabaseConfigError || !window.cafeSupabase) {
                    throw new Error(window.cafeSupabaseConfigError || "Supabase is unavailable.");
                }
                const response = await fetch("/.netlify/functions/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });
                const result = await response.json();

                if (!response.ok) throw new Error(result.message || "Sign in failed.");
                const { error } = await window.cafeSupabase.auth.setSession({
                    access_token: result.access_token,
                    refresh_token: result.refresh_token
                });
                if (error) throw error;
                window.location.href = "dashboard.html";
            } catch (err) {
                console.error("Login error:", err);
                errorMessage.innerText = err.message || "Could not reach the login service. Try again.";
                errorMessage.style.display = "block";
            }
        });
    }
});
