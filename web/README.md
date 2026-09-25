# Keepsake web interface

React 19, TypeScript and Vite, with Tailwind CSS 4 and Radix-based components from shadcn/ui.

## Commands

```sh
npm install
npm run dev     # http://localhost:5173, proxies /api and /healthz to the Go server on :8080
npm run lint    # oxlint
npm run build   # type-check, then build into ../static for the Go server to serve
```

## Layout

| Path | What's there |
|---|---|
| `src/App.tsx` | Session handling and the library screen |
| `src/components/` | Sidebar, media tiles, viewer, upload tray, sign-in |
| `src/components/ui/` | shadcn/ui primitives; restyle through theme tokens rather than editing these |
| `src/lib/api.ts` | Typed API client, including resumable chunked uploads |
| `src/hooks/use-media-events.ts` | WebSocket connection for processing progress |
| `src/index.css` | Theme tokens: colours, fonts, radius |
| `public/keepsake-mark.svg` | Logo and favicon |

## Design notes

- Surfaces stay neutral so photos carry the colour. The logo's red-orange-amber ramp (`.bg-ember-ramp`) is for the mark and progress bars only.
- Headings use Bricolage Grotesque (`font-heading`); everything else uses Figtree.
- Every interactive element needs a visible focus ring. Motion that isn't a response to the user should respect `prefers-reduced-motion`.
