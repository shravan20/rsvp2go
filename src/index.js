export default {
	async fetch(request, env) {

		const renderPage = content => `
		<!DOCTYPE html>
		<html lang="en">
		<head>
		  <meta charset="UTF-8" />
		  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
		  <title>RSVPnGo</title>
		  <script src="https://cdn.tailwindcss.com"></script>
		</head>
		<body class="bg-black text-gray-300 font-sans">
		  <div class="container mx-auto p-4 max-w-4xl">
			${content}
		  </div>
		</body>
		</html>
	  `;

		try {
			const url = new URL(request.url);
			const { pathname, searchParams } = url;

			// Homepage (hero section)
			if (pathname === "/" && !searchParams.has("event")) {
				return new Response(
					renderPage(`
						<div class="bg-gray-900 rounded-lg p-6 text-center shadow-lg">
				  <h1 class="text-3xl font-bold mb-4">RSVPnGo</h1>
				  <p>RSVPnGo is a free event RSVP app with no signups required.</p>
				  <p class="mt-2">Manage your event in one place. Share via WhatsApp, SMS, or email.</p>
				  <p class="mt-2">Free · No personal details · Calendar integration</p>
				  <div class="mt-6 space-y-3">
					<a href="/create" class="block bg-purple-600 hover:bg-purple-700 rounded px-4 py-2 font-medium">Create Event</a>
					<a href="/preview" class="block border border-gray-700 hover:border-gray-600 rounded px-4 py-2 font-medium">Preview RSVPs</a>
				  </div>
				</div>
					`),
					{ headers: { "Content-Type": "text/html" } }
				);
			}

			// RSVP Page for Iframe Preview (when ?event=<id> is provided)
			if (pathname === "/" && searchParams.has("event")) {
				const eventId = searchParams.get("event");
				const event = await env.EVENTS.get(`event_${eventId}`, "json");

				if (!event) {
					return new Response(
						renderPage(`
							<div class="bg-gray-900 rounded-lg p-6 text-center shadow-lg">
							  <h2 class="text-xl font-bold mb-2">Event Not Found</h2>
							  <p>This event doesn't exist or has expired.</p>
							  <div class="mt-4">
								<a href="/" class="text-sm text-gray-500 hover:underline">Back to Home</a>
							  </div>
							</div>
						`),
						{ status: 404, headers: { "Content-Type": "text/html" } }
					);
				}


				// RSVP form
				return new Response(
					renderPage(`
						<div class="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
						  <div class="px-6 py-8">
							<h1 class="text-3xl font-bold text-white">Event Name: ${event.name}</h1>
							<p class="mt-2 text-xl text-purple-400">📅 ${event.date}</p>
							${event.timezone ? `<p class="text-xl text-purple-400">🌐 Timezone: ${event.timezone}</p>` : ""}
							<p class="mt-2 text-xl text-purple-400"> ✏️ Description: ${event.description}</p>
						  </div>
						  <div class="bg-gray-700 px-6 py-4">
							<form id="rsvpForm" class="space-y-3">
							  <input name="name" placeholder="Your Name" class="w-full p-2 rounded bg-gray-600 border border-gray-500" required>
							  <input type="email" name="email" placeholder="Email" class="w-full p-2 rounded bg-gray-600 border border-gray-500" required>
							  <input type="hidden" name="eventId" value="${eventId}">
							  <button class="w-full bg-purple-600 hover:bg-purple-700 p-2 rounded font-medium">Submit RSVP</button>
							</form>
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
						<div class="bg-gray-900 rounded-lg p-6 shadow-lg">
						  <h1 class="text-2xl font-bold mb-4">Create Event</h1>
						  <form id="createForm" class="space-y-3">
							<input name="name" placeholder="What's the event?" class="w-full p-2 rounded bg-gray-800 border border-gray-700" required>
							<input type="date" name="date" class="w-full p-2 rounded bg-gray-800 border border-gray-700" required>
							<input name="timezone" placeholder="Time Zone (e.g. America/New_York)" class="w-full p-2 rounded bg-gray-800 border border-gray-700" required>
							<textarea name="description" placeholder="Description" class="w-full p-2 rounded bg-gray-800 border border-gray-700" rows="3"></textarea>
							<input type="email" name="creatorEmail" placeholder="Your Email (for preview)" class="w-full p-2 rounded bg-gray-800 border border-gray-700" required>
							<button class="w-full bg-purple-600 hover:bg-purple-700 p-2 rounded font-medium">Start Inviting &gt;</button>
						  </form>
						  <div class="mt-4 text-center">
							<a href="/" class="text-sm text-gray-500 hover:underline">Back to Home</a>
						  </div>
						</div>
						<script>
						  document.getElementById('createForm').addEventListener('submit', async (e) => {
							e.preventDefault();
							const formData = new FormData(e.target);
							const res = await fetch('/create', { method: 'POST', body: formData });
							const { eventId } = await res.json();
							// Redirect to the Share page so host can copy embed code.
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
							<div class="bg-gray-900 rounded-lg p-6 text-center shadow-lg">
							  <h2 class="text-xl font-bold mb-2">Event Not Found</h2>
							  <p>This event doesn't exist or has expired.</p>
							  <div class="mt-4">
								<a href="/" class="text-sm text-gray-500 hover:underline">Back to Home</a>
							  </div>
							</div>
						`),
						{ status: 404, headers: { "Content-Type": "text/html" } }
					);
				}

				// Embed code snippet and the RSVP URL using the current origin.
				const embedCode = `<iframe src="${url.origin}/?event=${eventId}" width="600" height="400" frameborder="0"></iframe>`;
				const rsvpUrl = `${url.origin}/?event=${eventId}`;
				return new Response(
					renderPage(`
						<div class="bg-gray-900 rounded-lg p-6 shadow-lg">
						  <h1 class="text-xl font-bold mb-4">Share Your RSVP Page</h1>
						  <div class="mb-6">
							<p class="mb-2">Embed Code:</p>
							<textarea id="embedCode" class="w-full p-2 rounded bg-gray-800 border border-gray-700" rows="4" readonly>${embedCode}</textarea>
							<button id="copyEmbedButton" class="mt-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-medium">Copy Embed Code</button>
						  </div>
						  <div class="mb-6">
							<p class="mb-2">RSVP URL:</p>
							<input id="rsvpUrl" class="w-full p-2 rounded bg-gray-800 border border-gray-700" value="${rsvpUrl}" readonly />
							<button id="copyUrlButton" class="mt-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-medium">Copy URL</button>
						  </div>
						  <div class="mt-4">
							<h2 class="text-lg font-semibold mb-2">Preview:</h2>
							<iframe src="${url.origin}/?event=${eventId}" class="w-full" height="400" frameborder="0"></iframe>
						  </div>
						  <div class="mt-4 text-center">
							<a href="/" class="text-sm text-gray-500 hover:underline">Back to Home</a>
						  </div>
						</div>
						<script>
						  document.getElementById('copyEmbedButton').addEventListener('click', function() {
							const embedTextarea = document.getElementById('embedCode');
							embedTextarea.select();
							embedTextarea.setSelectionRange(0, 99999);
							navigator.clipboard.writeText(embedTextarea.value)
							  .then(() => { alert('Embed code copied to clipboard!'); })
							  .catch(err => { alert('Failed to copy embed code.'); });
						  });
						  document.getElementById('copyUrlButton').addEventListener('click', function() {
							const rsvpUrlInput = document.getElementById('rsvpUrl');
							rsvpUrlInput.select();
							rsvpUrlInput.setSelectionRange(0, 99999);
							navigator.clipboard.writeText(rsvpUrlInput.value)
							  .then(() => { alert('RSVP URL copied to clipboard!'); })
							  .catch(err => { alert('Failed to copy RSVP URL.'); });
						  });
						<\/script>
					`),
					{ headers: { "Content-Type": "text/html" } }
				);
			}

			// Preview Page – Email Entry Form & Results with Modal (GET /preview)
			if (pathname === "/preview" && request.method === "GET") {
				// If no email is provided, show the form.
				if (!searchParams.has("email")) {
					return new Response(
						renderPage(`
							<div class="bg-gray-900 rounded-lg p-6 shadow-lg">
							  <h1 class="text-2xl font-bold mb-4">Preview Your Events</h1>
							  <form id="previewForm" class="space-y-3" method="GET" action="/preview">
								<input type="email" name="email" placeholder="Enter your email" class="w-full p-2 rounded bg-gray-800 border border-gray-700" required>
								<button class="w-full bg-purple-600 hover:bg-purple-700 p-2 rounded font-medium">Preview</button>
							  </form>
							  <div class="mt-4 text-center">
								<a href="/" class="text-sm text-gray-500 hover:underline">Back to Home</a>
							  </div>
							</div>
						`),
						{ headers: { "Content-Type": "text/html" } }
					);
				} else {
					const creatorEmail = searchParams.get("email");
					// List all events with the "event_" prefix.
					const list = await env.EVENTS.list({ prefix: "event_" });
					const events = await Promise.all(list.keys.map(async (key) => {
						const eventData = await env.EVENTS.get(key.name, "json");
						if (eventData) {
							return { key: key.name, ...eventData };
						}
						return null;
					}));
					const filteredEvents = events.filter(
						event =>
							event &&
							event.creatorEmail &&
							event.creatorEmail.toLowerCase() === creatorEmail.toLowerCase()
					);

					// For each event, get RSVPs.
					for (const event of filteredEvents) {
						const eventId = event.key.replace("event_", "");
						const rsvpList = await env.RSVPS.list({ prefix: `rsvp_${eventId}_` });
						const rsvps = await Promise.all(rsvpList.keys.map(async (key) => {
							return await env.RSVPS.get(key.name, "json");
						}));
						event.rsvps = rsvps.filter(Boolean);
					}

					// Event cards.
					let cardsHtml = "";
					if (filteredEvents.length === 0) {
						cardsHtml = `<p class="text-center">No events found for ${creatorEmail}</p>`;
					} else {
						for (const event of filteredEvents) {
							let rsvpHtml = "";
							if (event.rsvps && event.rsvps.length > 0) {
								rsvpHtml = `<table class="w-full text-sm">
								  <thead>
									<tr>
									  <th class="border px-2 py-1">Name</th>
									  <th class="border px-2 py-1">Email</th>
									  <th class="border px-2 py-1">Timestamp</th>
									</tr>
								  </thead>
								  <tbody>`;
								for (const rsvp of event.rsvps) {
									const dateStr = new Date(rsvp.timestamp).toLocaleString();
									rsvpHtml += `<tr>
									  <td class="border px-2 py-1">${rsvp.name}</td>
									  <td class="border px-2 py-1">${rsvp.email}</td>
									  <td class="border px-2 py-1">${dateStr}</td>
									</tr>`;
								}
								rsvpHtml += `</tbody></table>`;
							} else {
								rsvpHtml = `<p class="text-gray-500">No RSVPs yet.</p>`;
							}

							cardsHtml += `
							<div class="bg-gray-900 rounded-md shadow-md p-3 mb-4 cursor-pointer event-card"
							     data-event-name="${event.name}"
							     data-event-date="Date: ${event.date}${event.timezone ? " | Timezone: " + event.timezone : ""}"
							     data-rsvp='${JSON.stringify(rsvpHtml)}'>
							  <h2 class="text-xl font-bold">${event.name}</h2>
							  <p class="text-sm text-gray-500 mt-1">Date: ${event.date}${event.timezone ? " | " + event.timezone : ""}</p>
							  <p class="mt-1 text-sm">${event.description}</p>
							  <span class="mt-2 inline-block bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-semibold">
							    View RSVPs
							  </span>
							</div>`;
						}
					}

					return new Response(
						renderPage(`
							<div class="bg-gray-900 rounded-md p-6 shadow-md">
							  <h1 class="text-2xl font-bold mb-4">Your Created Events</h1>
							  <div id="eventCards">
							    ${cardsHtml}
							  </div>
							  <div class="mt-4 text-center">
								<a href="/" class="text-sm text-gray-500 hover:underline">Back to Home</a>
							  </div>
							</div>
							<!-- Modal using Tailwind classes -->
							<div id="modalOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden">
							  <div class="bg-gray-900 p-6 rounded-md relative w-11/12 max-w-lg shadow-lg">
								<button id="modalClose" class="absolute top-2 right-2 text-gray-300">X</button>
								<div id="modalContent" class="text-gray-300"></div>
							  </div>
							</div>
							<script>
							  document.querySelectorAll('.event-card').forEach(card => {
								card.addEventListener('click', function() {
								  const eventName = card.getAttribute('data-event-name');
								  const eventDate = card.getAttribute('data-event-date');
								  const rsvpHtml = JSON.parse(card.getAttribute('data-rsvp'));
								  const modalContent = document.getElementById('modalContent');
								  modalContent.innerHTML = '<h2 class="text-2xl font-bold mb-2">' + eventName + '</h2>' +
								                             '<p class="text-sm mb-4">' + eventDate + '</p>' +
								                             rsvpHtml;
								  document.getElementById('modalOverlay').classList.remove('hidden');
								});
							  });
							  document.getElementById('modalClose').addEventListener('click', function() {
								document.getElementById('modalOverlay').classList.add('hidden');
							  });
							<\/script>
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
					<div class="bg-gray-900 rounded-lg p-6 text-center text-red-500">
					  <h2 class="text-2xl font-bold mb-2">Error</h2>
					  <p>${err.message}</p>
					</div>
				`),
				{ status: 500 }
			);
		}
	}
};
