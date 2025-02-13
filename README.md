# rsvp2go

A simple, self-hosted RSVP system built on Cloudflare Workers. Create events, share RSVP links, and collect responses—all running on the edge.

## Features

🎉 Create Events: Easily create events with a name, date, and description.
📨 RSVP Links: Get a unique link to share with attendees.
📝 Collect Responses: Store RSVPs securely using Cloudflare KV.
🌐 Embeddable: Embed the RSVP form on any website.

## Quick Start

1. Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Node.js](https://nodejs.org/en) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed

2. Clone the Repository

```
git clone <https://github.com/your-username/rsvp2go.git>
cd rsvp2go
```

3. Install Dependencies

```
npm install
```

4. Set Up KV Namespaces

Create the required KV namespaces:

```
wrangler kv:namespace create EVENTS
wrangler kv:namespace create RSVPS
```

5. Create wrangler.jsonc
Create `wrangler.jsonc` and copy the required template from `wrangler-example.jsonc`. Update wrangler.jsonc with the generated KV IDs.

6. Deploy the Worker

```sh
npm run deploy
```

## Usage 🚀

### Create an Event 🎉

1. Visit your Worker URL (e.g., `<https://rsvp2go.your-username.workers.dev>`).
2. Fill out the event creation form.
3. Copy the unique RSVP link.

---

### Share the RSVP Link 📨

```url
https://rsvp2go.your-username.workers.dev/?event=abc123
```

---

### Embed the RSVP Form 🌐

Use the following code to embed the RSVP form on your website:

```html
<iframe
  src="https://rsvp2go.your-username.workers.dev/?event=abc123"
  style="border:0; width:100%; height:500px; border-radius:12px;">
</iframe>
```

## Configuration ⚙️

Edit wrangler.jsonc to customize:

- KV Namespaces: Add your KV namespace IDs.

### License 📄

This project is licensed under the [MIT License](./LICENSE).

### Support 🛠️

For issues or questions, please open an issue on GitHub or email <shravan@ohmyscript.com>
