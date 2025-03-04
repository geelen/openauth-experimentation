import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

// This value should be shared between the OpenAuth server Worker and other
// client Workers that you connect to it, so the types and schema validation are
// consistent.
const subjects = createSubjects({
  user: object({
    id: string(),
  }),
});

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    if (url.pathname === "/") {
      // Simple home page with login and logout links
      return new Response(
        generateHtml("Welcome to the OpenAuth demonstration. Use the links below to test the authentication flow."),
        {
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    } else if (url.pathname === "/login") {
      // Move the redirect logic that was previously on "/" to "/login"
      url.searchParams.set("redirect_uri", url.origin + "/callback");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize";
      return Response.redirect(url.toString());
    } else if (url.pathname === "/callback") {
      // Create a response with the same HTML as the home page but with a success message
      const response = new Response(
        generateHtml("Welcome to the OpenAuth demonstration. You have successfully logged in!"),
        {
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
      
      // Set cookies for refresh_token and access_token
      // Setting secure and httpOnly flags for security
      // Using placeholder values for now
      response.headers.append("Set-Cookie", "refresh_token=placeholder_refresh_token; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000");
      response.headers.append("Set-Cookie", "access_token=placeholder_access_token; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600");
      
      return response;
    }

    // The real OpenAuth server code starts here:
    return issuer({
      storage: CloudflareStorage({
        namespace: env.AUTH_STORAGE,
      }),
      subjects,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            // eslint-disable-next-line @typescript-eslint/require-await
            sendCode: async (email, code) => {
              // This is where you would email the verification code to the
              // user, e.g. using Resend:
              // https://resend.com/docs/send-with-cloudflare-workers
              console.log(`Sending code ${code} to ${email}`);
            },
            copy: {
              input_code: "Code (check Worker logs)",
            },
          }),
        ),
      },
      theme: {
        title: "myAuth",
        primary: "#0051c3",
        favicon: "https://workers.cloudflare.com//favicon.ico",
        logo: {
          dark: "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/db1e5c92-d3a6-4ea9-3e72-155844211f00/public",
          light:
            "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/fa5a3023-7da9-466b-98a7-4ce01ee6c700/public",
        },
      },
      success: async (ctx, value) => {
        return ctx.subject("user", {
          id: await getOrCreateUser(env, value.email),
        });
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const result = await env.AUTH_DB.prepare(
    `
		INSERT INTO user (email)
		VALUES (?)
		ON CONFLICT (email) DO UPDATE SET email = email
		RETURNING id;
		`,
  )
    .bind(email)
    .first<{ id: string }>();
  if (!result) {
    throw new Error(`Unable to process user: ${email}`);
  }
  console.log(`Found or created user ${result.id} with email ${email}`);
  return result.id;
}

/**
 * Generates HTML for the application pages with a customizable message
 */
function generateHtml(message: string): string {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenAuth Demo</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        line-height: 1.6;
      }
      h1 {
        color: #0051c3;
      }
      .btn {
        display: inline-block;
        background: #0051c3;
        color: white;
        padding: 0.5rem 1rem;
        text-decoration: none;
        border-radius: 4px;
        margin-right: 1rem;
      }
      .btn:hover {
        background: #003d97;
      }
    </style>
  </head>
  <body>
    <h1>OpenAuth Demo</h1>
    <p>${message}</p>
    
    <div>
      <a href="/login" class="btn">Log In</a>
      <a href="#" class="btn" onclick="logout(); return false;">Log Out</a>
    </div>

    <script>
      function logout() {
        // Clear cookies and refresh the page
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.trim().split('=');
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
        window.location.reload();
        alert('Logged out successfully!');
      }
    </script>
  </body>
  </html>`;
}
