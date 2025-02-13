export default {
	async fetch(request, env) {
		// Dark theme configuration
		const theme = {
			background: "#0f172a", // Dark navy
			card: "#1e293b", // Dark slate
			text: "#f8fafc", // Off-white
			accent: "#818cf8", // Soft purple
			inputBg: "#334155" // Dark input
		};

		// Base HTML template
		const renderPage = content => `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>RSVP2GO</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { background: ${theme.background}; color: ${theme.text} }
            .card { background: ${theme.card}; }
            input, textarea { background: ${theme.inputBg} !important; border-color: #475569 !important; }
            button { background: ${theme.accent} !important; }
          </style>
        </head>
        <body class="min-h-screen p-4">
          <div class="max-w-2xl mx-auto space-y-6">
            ${content}
          </div>
        </body>
        </html>
      `;

		try {
			const url = new URL(request.url);
			const { pathname, searchParams } = url;

			// Create Event Form
			if (pathname === "/" && !searchParams.has("event")) {
				return new Response(
					renderPage(`
          <div class="card p-6 rounded-xl shadow-2xl">
            <h1 class="text-3xl font-bold mb-6">Create Event</h1>
            <form id="createForm" class="space-y-4">
              <input name="name" placeholder="Event Name"
                class="w-full p-3 rounded-lg text-white" required>
              <input type="date" name="date"
                class="w-full p-3 rounded-lg text-white" required>
              <textarea name="description" placeholder="Description"
                class="w-full p-3 rounded-lg text-white" rows="3"></textarea>
              <button class="w-full p-3 rounded-lg text-white font-bold">
                Create Event
              </button>
            </form>
          </div>
          <script>
            document.getElementById('createForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const res = await fetch('/create', { method: 'POST', body: formData });
              const { eventId } = await res.json();
              window.location = \`/?event=\${eventId}\`;
            });
          </script>
        `),
					{ headers: { "Content-Type": "text/html" } }
				);
			}

			// RSVP Page
			if (searchParams.has("event")) {
				const eventId = searchParams.get("event");
				const event = await env.EVENTS.get(eventId, "json");

				if (!event) {
					return new Response(
						renderPage(`
            <div class="card p-6 text-center">
              <h2 class="text-2xl font-bold mb-4">Event Not Found</h2>
              <p>This event doesn't exist or has expired</p>
            </div>
          `),
						{ status: 404, headers: { "Content-Type": "text/html" } }
					);
				}

				return new Response(
					renderPage(`
          <div class="card p-6 rounded-xl shadow-2xl">
            <div class="mb-8">
              <h1 class="text-3xl font-bold mb-2">${event.name}</h1>
              <p class="text-${theme.accent}">📅 ${event.date}</p>
              <p class="mt-4 opacity-75">${event.description}</p>
            </div>

            <form id="rsvpForm" class="space-y-4">
              <input name="name" placeholder="Your Name"
                class="w-full p-3 rounded-lg text-white" required>
              <input type="email" name="email" placeholder="Email"
                class="w-full p-3 rounded-lg text-white" required>
              <input type="hidden" name="eventId" value="${eventId}">
              <button class="w-full p-3 rounded-lg text-white font-bold">
                Submit RSVP
              </button>
            </form>
          </div>
          <script>
            document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              await fetch('/rsvp', { method: 'POST', body: formData });
              alert('Thank you for RSVPing!');
              e.target.reset();
            });
          <\/script>
        `),
					{ headers: { "Content-Type": "text/html" } }
				);
			}

			// API Endpoints
			if (request.method === "POST") {
				const formData = await request.formData();

				// Create Event
				if (pathname === "/create") {
					const eventId = crypto.randomUUID().split("-")[0];
					await env.EVENTS.put(
						eventId,
						JSON.stringify({
							name: formData.get("name"),
							date: formData.get("date"),
							description: formData.get("description")
						})
					);
					return Response.json({ eventId });
				}

				// Submit RSVP
				if (pathname === "/rsvp") {
					const rsvpId = `rsvp_${formData.get("eventId")}_${Date.now()}`;
					await env.RSVPS.put(
						rsvpId,
						JSON.stringify({
							eventId: formData.get("eventId"),
							name: formData.get("name"),
							email: formData.get("email"),
							timestamp: Date.now()
						})
					);
					return new Response("RSVP recorded");
				}
			}

			return new Response("Not found", { status: 404 });
		} catch (err) {
			console.error(err);
			return new Response(
				renderPage(`
        <div class="card p-6 text-center text-red-400">
          <h2 class="text-2xl font-bold mb-4">Error</h2>
          <p>${err.message}</p>
        </div>
      `),
				{ status: 500 }
			);
		}
	}
};
