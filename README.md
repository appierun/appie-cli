# @appierun/cli

Command-line client for [Appie.run](https://appie.run), the AI marketing stack: website chatbots, an article writer that writes in your brand voice, trackable short links, and Reddit and LinkedIn growth tools.

**Free plan, no credit card needed** — [sign up at appie.run](https://appie.run).

Full API reference: <https://appie.run/docs/api>

## Install

Requires Node.js 18 or newer. No dependencies.

```bash
npm i -g @appierun/cli
```

## Get an API key

Sign in to Appie, open your project, then go to **API** in the sidebar. A project admin can generate an `esk_` key. The same key works for the HTTP API, the MCP server and Event Store.

```bash
export APPIE_API_KEY=esk_YOUR_KEY          # macOS / Linux
$env:APPIE_API_KEY="esk_YOUR_KEY"          # Windows PowerShell
```

| Variable | Description |
| --- | --- |
| `APPIE_API_KEY` | Required. Sent as `Authorization: Bearer <key>`. |
| `APPIE_API_BASE` | Optional. Defaults to `https://appie.run`. |

Responses are printed as JSON. On a non-2xx response the error body is printed to stderr and the command exits 1. Run `appie` with no arguments to list every command and flag.

## Examples

### Short links
```bash
appie links create --long-url https://example.com/pricing --code spring
appie links stats --id 42
appie links stats --code spring
```

### Authors and articles
```bash
appie authors list
appie authors create --name "Ada" --bio "Fifty or more characters about how this author writes."
appie authors add-sample --id 3 --content "At least one hundred characters of writing..."
appie articles create --topic "How to brew tea" --type light
appie articles status --id 10
```

### Brain
```bash
appie brain get
appie brain update --json '{"about_website":"We sell tea.","category":"ecommerce"}'
```

### Chatbots
```bash
appie chatbots list
appie chatbots create --name "Help" --prompt "Answer in one paragraph."
appie chatbots add-content --id 4 --type text --title "FAQ" --content "We ship tea worldwide."
appie chatbots status --id 4
appie chatbots ask --id 4 --message "Where do you ship?"
```

### Reddit
```bash
appie reddit settings
appie reddit update --json '{"keywords":["green tea"]}'
appie reddit mentions --limit 20
appie reddit reply --id 88
```

### LinkedIn
```bash
appie linkedin profiles
appie linkedin set-profile --url https://www.linkedin.com/in/example
appie linkedin leads --limit 20
```

### Event Store
```bash
appie events create --name signup --user-key user_123 --metadata '{"plan":"starter"}'
```

## License

MIT © 2026 Appie.run
