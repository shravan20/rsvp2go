export default {
	async fetch(request, env) {
		// Dark theme configuration
		const theme = {
			background: "#0f172a", // Dark navy
			card: "#1e293b",       // Dark slate
			text: "#f8fafc",       // Off-white
			accent: "#818cf8",     // Soft purple
			inputBg: "#334155"     // Dark input
		};

		// Base HTML template
		const renderPage = content => `
		<!DOCTYPE html>
		<html lang="en">
		<head>
		  <meta charset="UTF-8">
		  <meta name="viewport" content="width=device-width, initial-scale=1.0">
		  <title>rsvp2go</title>
		  <script src="https://cdn.tailwindcss.com"></script>
		  <style>
			body { background: ${theme.background}; color: ${theme.text}; font-family: sans-serif; }
			.card { background: ${theme.card}; }
			input, textarea { background: ${theme.inputBg} !important; border: 1px solid #475569 !important; }
			button, a.btn { background: ${theme.accent} !important; border: none; text-decoration: none; }
			table { border-spacing: 0; }
		  </style>
		</head>
		<body class="min-h-screen p-4">
		  <div class="max-w-md mx-auto">
			${content}
		  </div>
		</body>
		</html>
	  `;

		try {
			const url = new URL(request.url);
			const { pathname, searchParams } = url;

			// Landing Page at "/" (no query params)
			if (pathname === "/" && !searchParams.has("event")) {
				return new Response(
					renderPage(`
				<div class="card p-4 rounded text-center">
				  <h1 class="text-2xl font-bold mb-4">rsvp2go</h1>
				  <p>rsvp2go is a free to use event RSVP app. There are no signups required.</p>
				  <p class="mt-2">Manage your event in one place. Send your invite link via WhatsApp, SMS or email.</p>
				  <p class="mt-2">Free · No personal details · Calendar integration</p>
				  <div class="mt-6 flex flex-col gap-3">
					<a href="/create" class="btn block w-full p-2 rounded text-white font-medium">Create Event</a>
					<a href="/preview" class="btn block w-full p-2 rounded border border-gray-500 text-white font-medium">Preview RSVPs</a>
				  </div>
				</div>
			  `),
					{ headers: { "Content-Type": "text/html" } }
				);
			}

			// RSVP Page (when ?event=<id> is provided on the "/" path)
			if (pathname === "/" && searchParams.has("event")) {
				const eventId = searchParams.get("event");
				const event = await env.EVENTS.get(`event_${eventId}`, "json");

				if (!event) {
					return new Response(
						renderPage(`
					<div class="card p-4 rounded text-center">
					  <h2 class="text-xl font-bold mb-2">Event Not Found</h2>
					  <p>This event doesn't exist or has expired</p>
					  <div class="mt-4">
						<a href="/" class="text-sm text-gray-400">Back to Home</a>
					  </div>
					</div>
				  `),
						{ status: 404, headers: { "Content-Type": "text/html" } }
					);
				}

				return new Response(
					renderPage(`
				<div class="card p-4 rounded">
				  <div class="mb-4">
					<h1 class="text-xl font-bold">${event.name}</h1>
					<p class="text-sm" style="color: ${theme.accent}">📅 ${event.date}</p>
					${event.timezone ? `<p class="text-sm" style="color: ${theme.accent}">Timezone: ${event.timezone}</p>` : ""}
					<p class="mt-2 text-sm opacity-75">${event.description}</p>
				  </div>
				  <form id="rsvpForm" class="space-y-3">
					<input name="name" placeholder="Your Name" class="w-full p-2 rounded text-white" required>
					<input type="email" name="email" placeholder="Email" class="w-full p-2 rounded text-white" required>
					<input type="hidden" name="eventId" value="${eventId}">
					<button class="w-full p-2 rounded text-white font-medium">Submit RSVP</button>
				  </form>
				  <div class="mt-4 text-center">
					<a href="/" class="text-sm text-gray-400">Back to Home</a>
				  </div>
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

			// Create Event Page (GET /create)
			if (pathname === "/create" && request.method === "GET") {
				return new Response(
					renderPage(`
				<div class="card p-4 rounded">
				  <h1 class="text-2xl font-bold mb-4">Create Event</h1>
				  <form id="createForm" class="space-y-3">
					<input name="name" placeholder="What's the event?" class="w-full p-2 rounded text-white" required>
					<input type="date" name="date" class="w-full p-2 rounded text-white" required>
					<input name="timezone" placeholder="Time Zone (e.g. America/New_York)" class="w-full p-2 rounded text-white" required>
					<textarea name="description" placeholder="Description" class="w-full p-2 rounded text-white" rows="3"></textarea>
					<input type="email" name="creatorEmail" placeholder="Your Email (for preview)" class="w-full p-2 rounded text-white" required>
					<button class="w-full p-2 rounded text-white font-medium">Start Inviting &gt;</button>
				  </form>
				  <div class="mt-4 text-center">
					<a href="/" class="text-sm text-gray-400">Back to Home</a>
				  </div>
				</div>
				<script>
				  document.getElementById('createForm').addEventListener('submit', async (e) => {
					e.preventDefault();
					const formData = new FormData(e.target);
					const res = await fetch('/create', { method: 'POST', body: formData });
					const { eventId } = await res.json();
					// Instead of redirecting to the RSVP page,
					// we now redirect to the Share page to preview and copy the embed code.
					window.location = \`/share?event=\${eventId}\`;
				  });
				<\/script>
			  `),
					{ headers: { "Content-Type": "text/html" } }
				);
			}

			// Create Event API (POST /create)
			if (pathname === "/create" && request.method === "POST") {
				const formData = await request.formData();
				const eventId = crypto.randomUUID().split("-")[0];
				await env.EVENTS.put(
					`event_${eventId}`,
					JSON.stringify({
						name: formData.get("name"),
						date: formData.get("date"),
						timezone: formData.get("timezone"),
						description: formData.get("description"),
						creatorEmail: formData.get("creatorEmail")
					})
				);
				return Response.json({ eventId });
			}

			// Share Page (GET /share?event=...)
			if (pathname === "/share" && request.method === "GET" && searchParams.has("event")) {
				const eventId = searchParams.get("event");
				const event = await env.EVENTS.get(`event_${eventId}`, "json");
				if (!event) {
					return new Response(
						renderPage(`
					<div class="card p-4 rounded text-center">
					  <h2 class="text-xl font-bold mb-2">Event Not Found</h2>
					  <p>This event doesn't exist or has expired</p>
					  <div class="mt-4">
						<a href="/" class="text-sm text-gray-400">Back to Home</a>
					  </div>
					</div>
				  `),
						{ status: 404, headers: { "Content-Type": "text/html" } }
					);
				}
				// Build the embed code snippet.
				// Using request.url.origin to dynamically reference your domain.
				const embedCode = `<iframe src="${url.origin}/?event=${eventId}" width="600" height="400" frameborder="0"></iframe>`;
				return new Response(
					renderPage(`
				<div class="card p-4 rounded">
				  <h1 class="text-xl font-bold mb-4">Share Your RSVP Page</h1>
				  <p class="mb-4">Copy the embed code below and paste it into your website to display your event RSVP page.</p>
				  <textarea class="w-full p-2 rounded text-white" rows="4" readonly>${embedCode}</textarea>
				  <div class="mt-4">
					<h2 class="text-lg font-semibold mb-2">Preview:</h2>
					<iframe src="${url.origin}/?event=${eventId}" width="100%" height="400" frameborder="0"></iframe>
				  </div>
				  <div class="mt-4 text-center">
					<a href="/" class="text-sm text-gray-400">Back to Home</a>
				  </div>
				</div>
			  `),
					{ headers: { "Content-Type": "text/html" } }
				);
			}

			// Preview Page – Email Entry Form & Results (GET /preview)
			if (pathname === "/preview" && request.method === "GET") {
				// If no email is provided, show the form.
				if (!searchParams.has("email")) {
					return new Response(
						renderPage(`
					<div class="card p-4 rounded">
					  <h1 class="text-2xl font-bold mb-4">Preview Your Events</h1>
					  <form id="previewForm" class="space-y-3" method="GET" action="/preview">
						<input type="email" name="email" placeholder="Enter your email" class="w-full p-2 rounded text-white" required>
						<button class="w-full p-2 rounded text-white font-medium">Preview</button>
					  </form>
					  <div class="mt-4 text-center">
						<a href="/" class="text-sm text-gray-400">Back to Home</a>
					  </div>
					</div>
				  `),
						{ headers: { "Content-Type": "text/html" } }
					);
				} else {
					const creatorEmail = searchParams.get("email");
					// List all events with the "event_" prefix
					const list = await env.EVENTS.list({ prefix: "event_" });
					const events = await Promise.all(list.keys.map(async (key) => {
						const eventData = await env.EVENTS.get(key.name, "json");
						if (eventData) {
							return { key: key.name, ...eventData };
						}
						return null;
					}));
					const filteredEvents = events.filter(event => event && event.creatorEmail && event.creatorEmail.toLowerCase() === creatorEmail.toLowerCase());

					// For each event, retrieve its RSVPs
					for (const event of filteredEvents) {
						const eventId = event.key.replace("event_", "");
						const rsvpList = await env.RSVPS.list({ prefix: `rsvp_${eventId}_` });
						const rsvps = await Promise.all(rsvpList.keys.map(async (key) => {
							return await env.RSVPS.get(key.name, "json");
						}));
						event.rsvps = rsvps.filter(Boolean);
					}

					// Build a simple HTML table for events and RSVPs
					let tableHtml = `<table class="w-full border border-gray-600">
					<thead>
					  <tr>
						<th class="border border-gray-600 px-2 py-1 text-left">Event Name</th>
						<th class="border border-gray-600 px-2 py-1 text-left">Date</th>
						<th class="border border-gray-600 px-2 py-1 text-left">Description</th>
						<th class="border border-gray-600 px-2 py-1 text-left">RSVPs</th>
					  </tr>
					</thead>
					<tbody>`;
					if (filteredEvents.length === 0) {
						tableHtml += `<tr>
						<td colspan="4" class="border border-gray-600 px-2 py-1 text-center">No events found for ${creatorEmail}</td>
					  </tr>`;
					} else {
						for (const event of filteredEvents) {
							let rsvpHtml = '';
							if (event.rsvps && event.rsvps.length > 0) {
								rsvpHtml = `<table class="w-full">
								<thead>
								  <tr>
									<th class="border border-gray-600 px-1 py-1 text-left text-xs">Name</th>
									<th class="border border-gray-600 px-1 py-1 text-left text-xs">Email</th>
									<th class="border border-gray-600 px-1 py-1 text-left text-xs">Timestamp</th>
								  </tr>
								</thead>
								<tbody>`;
								for (const rsvp of event.rsvps) {
									const dateStr = new Date(rsvp.timestamp).toLocaleString();
									rsvpHtml += `<tr>
									<td class="border border-gray-600 px-1 py-1 text-xs">${rsvp.name}</td>
									<td class="border border-gray-600 px-1 py-1 text-xs">${rsvp.email}</td>
									<td class="border border-gray-600 px-1 py-1 text-xs">${dateStr}</td>
								  </tr>`;
								}
								rsvpHtml += `</tbody></table>`;
							} else {
								rsvpHtml = 'No RSVPs';
							}
							tableHtml += `<tr>
							<td class="border border-gray-600 px-2 py-1">${event.name}</td>
							<td class="border border-gray-600 px-2 py-1">${event.date}</td>
							<td class="border border-gray-600 px-2 py-1">${event.description}</td>
							<td class="border border-gray-600 px-2 py-1">${rsvpHtml}</td>
						  </tr>`;
						}
					}
					tableHtml += `</tbody></table>`;

					return new Response(
						renderPage(`
					<div class="card p-4 rounded">
					  <h1 class="text-2xl font-bold mb-4">Your Created Events and RSVPs</h1>
					  ${tableHtml}
					  <div class="mt-4 text-center">
						<a href="/" class="text-sm text-gray-400">Back to Home</a>
					  </div>
					</div>
				  `),
						{ headers: { "Content-Type": "text/html" } }
					);
				}
			}

			// RSVP submission (POST /rsvp)
			if (pathname === "/rsvp" && request.method === "POST") {
				const formData = await request.formData();
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

			return new Response("Not found", { status: 404 });
		} catch (err) {
			console.error(err);
			return new Response(
				renderPage(`
			<div class="card p-4 rounded text-center text-red-400">
			  <h2 class="text-2xl font-bold mb-2">Error</h2>
			  <p>${err.message}</p>
			</div>
		  `),
				{ status: 500 }
			);
		}
	}
};
