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

const corsHeaders = {
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Allow-Methods': 'POST',
	'Access-Control-Allow-Origin': '*',
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response('OK', {
				headers: corsHeaders,
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
	return new Response(JSON.stringify(images), {
		headers: { 'Content-Type': 'application/json', ...corsHeaders },
	})
}
