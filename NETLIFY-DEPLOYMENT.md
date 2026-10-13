# Netlify and Supabase deployment

This version uses Netlify for static pages and the username login function, and Supabase for shared authentication and data. Do not upload the PHP/XAMPP backend or a Supabase service-role key to the public site.

## 1. Create and configure Supabase

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase/schema.sql`](./supabase/schema.sql).
3. In Supabase Authentication settings, disable public sign-ups. Set the site URL to your Netlify site URL.
4. Create the owner in Authentication > Users using an email address you control and the desired password, and mark the email confirmed.
5. In SQL Editor, set the owner profile (replace the address with the owner’s Auth email):

   ```sql
   update public.profiles
   set username = 'lemsther', full_name = 'Lemsther Rivera', role = 'owner', active = true
   where email = 'OWNER_EMAIL';
   ```

6. Copy the Project URL and publishable/anon key from Project Settings > API into `js/supabase-config.js`. Those browser values are public; row-level security in the schema protects the data.
7. Sign in as the owner and open Menu once. The app will create the default menu if the shared products table is empty.

To add a cashier, create another confirmed Auth user with an email address whose part before `@` is unique (the profile trigger uses it as the initial username), then set a unique username in `public.profiles` and leave its role as `cashier`. The shop app has no public sign-up or password-reset route.

## 2. Configure Netlify

1. Push this project to a private Git repository and import it into Netlify. Netlify builds the allowlisted static site into `dist`; it excludes `.env`, PHP sources, and SQL.
2. Add these environment variables in Netlify site settings. Make them available to Functions:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret; never put this in `js/supabase-config.js` or source control)
3. Deploy. The build command is `npm run build`; `netlify.toml` configures the publish directory and login function.
4. In Supabase Auth URL settings, add the deployed Netlify URL to the allowed redirect/site URL list.

## 3. Import existing local data

1. Before switching devices, open `legacy-export.html` from the exact same app origin and browser/profile that currently contains the menu and sales. With XAMPP, use `http://localhost/syete-dos-cafe/legacy-export.html`; if the old app was opened as a `file://` page, open the exporter from that same file location instead. Download the JSON backup.
2. After Netlify is deployed, sign in as the owner and open **Import Old Data** on the Dashboard.
3. Select the downloaded backup and import it. Existing historical sales are keyed by their old IDs, so re-running the same import will not duplicate them.

The local exporter reads only that browser’s storage. Export every device/browser that contains old sales before retiring it. The deployed app’s records are shared centrally among signed-in shop devices; old local records do not synchronize until imported.

## Private shop access

The sign-in and application data require authentication, but a Netlify URL is reachable from the internet. Use strong individual passwords, disable public sign-up, keep the service-role key only in Netlify environment settings, and don’t publish the URL as a secrecy control. For a shop that must not be internet reachable, continue using the private XAMPP/Wi-Fi deployment instead.

## Existing XAMPP installation

When the Supabase URL/key are still placeholders, `http://localhost/syete-dos-cafe/` continues to use the PHP/MySQL login and the browser’s existing local menu and sales storage. Once the Supabase values are configured, localhost uses the shared Supabase backend too. Keep using the exact same localhost address and browser profile when exporting the existing local data.
