/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler deploy src/index.ts --name my-worker` to deploy your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	CLIENT_ID: string
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
}

export type UnsplashResponse<T> = {
	results: T
	total: number
	total_pages: number
}

interface SearchResult {
	id: string
	urls: {
		small: string
	}
	links: {
		html: string
	}
}

// Empty array allows everything '*'
const allowedOrigins: string[] = [
	//'https://serverless-api-viewer.pages.dev',
	//'http://localhost:3000',
]

const corsHeaders = (origin: string) => ({
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Allow-Methods': 'POST',
	'Access-Control-Allow-Origin': origin,
})

/**
 * Check the origin for this request
 * If it is included in our set of known and allowed origins, return it, otherwise
 * return a known, good origin. This effectively does not allow browsers to
 * continue requests if the origin they're requesting from doesn't match.
 * If allowedOrigins array is empty, return '*' and allow all origins instead
 */
const checkOrigin = (request: Request) => {
	const origin = request.headers.get('Origin')
	if (!origin || allowedOrigins.length === 0) return '*'

	const foundOrigin = allowedOrigins.find((allowedOrigin) =>
		allowedOrigin.includes(origin)
	)
	return foundOrigin ? foundOrigin : allowedOrigins[0]
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		if (request.method === 'OPTIONS') {
			const allowedOrigin = checkOrigin(request)
			return new Response('OK', {
				headers: corsHeaders(allowedOrigin),
			})
		}

		if (['POST'].includes(request.method)) {
			return getImages(request, env)
		}

		return new Response('Invalid method', {
			status: 405,
		})
	},
}

async function getImages(request: Request, env: Env) {
	const { query } = await request.json<{ query: string }>()
	const resp = await fetch(
		`https://api.unsplash.com/search/photos?query=${query}`,
		{
			headers: { Authorization: `Client-ID ${env.CLIENT_ID}` },
		}
	)
	const data = await resp.json<UnsplashResponse<SearchResult[]>>()
	const images = data.results.map((image) => ({
		id: image.id,
		image: image.urls.small,
		link: image.links.html,
	}))

	const allowedOrigin = checkOrigin(request)
	return new Response(JSON.stringify(images), {
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders(allowedOrigin),
		},
	})
}
