# Supawatch

Movie and TV discovery built with Next.js 16 and TMDB.

## Local development

Install dependencies with `npm ci`. Set these values in `.env.local`:

```dotenv
TMDB_READ_ACCESS_TOKEN=your_tmdb_api_read_access_token
NEXT_PUBLIC_BASE_URL=https://your-production-domain.example
```

Use `http://localhost:3000` as the base URL for local development. `TMDB_API_KEY` also accepts a v3 API key (sent as `api_key`) or read access token (sent as a Bearer header). The legacy `NEXT_PUBLIC_TMDB_API_KEY` is supported for existing deployments; migrate it to the server-only name above. Never put credentials in client fetch URLs.

Run `npm run dev`, or `npm run build && npm start` to check production behavior. Configure the canonical production URL in the hosting environment before building.

## TMDB requests and caching

All server requests go through `src/lib/tmdb.ts`. It canonicalizes query strings, shares concurrent identical requests, limits concurrency to eight per process, and caps pending requests at 100. Next's persistent fetch cache handles reuse between requests and deployments where supported by the host. In-memory concurrency limits are per process, not a distributed account-wide rate limiter.

Requests have a five-second timeout and at most one retry for connection failures, 429, or selected 5xx responses. Retry-After delays above two seconds fail promptly instead of retrying sooner than TMDB requested. Invalid input and missing titles are not retried. Upstream authentication failures become service errors, not visitor authentication errors.

Detail pages and preview APIs share one `append_to_response=videos,credits,images` request, cached for one hour. An absent logo gets one unfiltered image lookup; absent English trailers for a non-English title get one original-language lookup. Those fallback resources and watch providers are cached for a day. Metadata and page rendering share a React request cache. Movie, TV, and person pages are generated on first visit and revalidate hourly, so repeat views can reuse the rendered page. Recommendations are optional and cannot turn a valid title into a 404.

Successful API responses use shared HTTP caching. Failed and partially failed discovery responses use `no-store`; the browser cache also respects it. The browser cache holds up to 200 URLs, deduplicates query parameter order, and removes failed requests. Region stays in provider/discovery request URLs so availability cannot leak between countries.

## Playback and routing

Only valid YouTube trailers and teasers are selected, with official videos and preferred languages ranked first. Detail dialogs load the YouTube IFrame API on demand, try the next candidate on video-specific errors, retain manual playback controls when autoplay is blocked, and offer an external YouTube link. TMDB metadata cannot guarantee a video is embeddable in every region.

Background trailers load only in the active desktop/mobile layout and pause by unmounting when the document is hidden or reduced motion is requested. The backdrop remains the fallback. Embeds send the site origin and use `strict-origin-when-cross-origin`.

Movie, TV, and person routes reserve not-found behavior for invalid IDs and confirmed TMDB 404s. Temporary failures reach the retryable error boundary, allowing Next to retain a previously successful page during failed revalidation. Next can return HTTP 200 when a not-found or error boundary is discovered after streaming has begun; check rendered error/noindex behavior as well as HTTP status.

The sitemap revalidates daily, excludes search/private-library pages, and omits invented modification timestamps. Search pages use `noindex,follow`. Detail pages have individual canonical URLs, social metadata, and structured data.

## Validation

```sh
npm run test:tmdb
npm run test:core
npm run test:discovery
npm run test:browse
npm run test:episodes
npm run test:history
npx tsc --noEmit
npm run lint
npm run build
```

TMDB regression tests use mocked upstream responses to cover retries, rate limits, request deduplication, authentication, language fallbacks, partial failure, and cache eviction without spending API requests.

Implementation references: [TMDB authentication](https://developer.themoviedb.org/docs/authentication-application), [append to response](https://developer.themoviedb.org/docs/append-to-response), [rate limits](https://developer.themoviedb.org/docs/rate-limiting), [Next fetch caching](https://nextjs.org/docs/app/api-reference/functions/fetch), and [YouTube player API](https://developers.google.com/youtube/iframe_api_reference).
