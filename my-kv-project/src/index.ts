/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler deploy src/index.ts --name my-worker` to deploy your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Redis } from '@upstash/redis/cloudflare'

export interface Env {
	MY_FIRST_KV: KVNamespace
	UPSTASH_REDIS_REST_URL: string
	UPSTASH_REDIS_REST_TOKEN: string
}

function html(todos: string) {
	return `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width,initial-scale=1">
				<title>Todos</title>
				<script src="https://cdn.tailwindcss.com"></script>
			</head>

			<body class='bg-blue-100'>
				<div class="w-full h-full flex content-conter justify-center mt-8">
					<div class="bg-white shadow-md rounded px-8 pt-6 py-8 mb-4">
						<h1 class='block text-grey-800 text-md font-bold mb-2'>Todos</h1>

						<div class='flex'>
							<input class='shadow appearance-none border rounded w-full py-2 px-3 text-grey-800 leading-tight focus:outline-none focus:shadow-outline' type='text' name='name' placeholder='A new todo'></input>
							<button class='bg-blue-500 hover:bg-blue-800 text-white font-bold ml-2 py-2 px-4 rounded focus:outline-none focus:shadow-outline' id='create' type='submit'>Create</button>
						</div>

						<div class='mt-4' id='todos'></div>
					</div>
				</div>
			</body>

			<script>
				window.todos = ${todos}

				function updateTodos() {
					fetch('/', { method: 'PUT', body: JSON.stringify({ todos: window.todos }) })
					populateTodos()
				}

				function completeTodo(evt) {
					const checkbox = evt.target
					const todoElement = checkbox.parentNode
					const newTodoSet = [...window.todos]
					const todo = newTodoSet.find(todo => todo.id === parseInt(todoElement.dataset.todo))
					todo.completed = !todo.completed
					window.todos = newTodoSet
					updateTodos()
				}

				function populateTodos() {
					const todoContainer = document.querySelector('#todos')
					todoContainer.innerHTML = null

					window.todos.forEach(todo => {
						const el = document.createElement('div')
						el.className = 'border-t py-4'
						el.dataset.todo = todo.id

						const name = document.createElement('span')
						name.className = todo.completed ? 'line-through' : ''
						name.textContent = todo.name

						const checkbox = document.createElement('input')
						checkbox.className = 'mx-4'
						checkbox.type = 'checkbox'
						checkbox.checked = todo.completed ? 1 : 0
						checkbox.addEventListener('click', completeTodo)

						el.appendChild(checkbox)
						el.appendChild(name)
						todoContainer.appendChild(el)
					})
				}

				function createTodo() {
					const input = document.querySelector('input[name=name]')
					if (input.value.length) {
						window.todos = [...todos, {
							id: window.todos.length + 1,
							name: input.value,
							completed: false
						}]

						input.value = ""
						updateTodos()
					}
				}

				populateTodos()
				document.querySelector('#create').addEventListener('click', createTodo)

			</script>
		</html>
	`
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		//const key = 'data-202.90.152.69'
		const key = 'mp'
		//const redis = Redis.fromEnv(env)
		const { searchParams } = new URL(request.url)
		const bust = searchParams.get('bust')
		const cacheTtl = bust ? 60 : 29030400

		//const beforeRedis = performance.now()
		//const redisResponse = await redis.get(key)
		//const redisLatency = performance.now() - beforeRedis

		const beforeKV = performance.now()
		const data = await getCache(env, key, cacheTtl)
		const kvLatency = performance.now() - beforeKV

		if (bust && data) {
			await setCache(env, key, String(parseInt(data) + 1))
			await getCache(env, key, 29030400)
		}
		//await setCache(env, key, data as string)

		return new Response(
			JSON.stringify({
				kvLatency,
				//redisLatency,
				kvData: data,
				//redisData: redisResponse,
				bust: bust ? true : false,
				cacheTtl,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			}
		)

		//if (request.method === 'PUT') {
		//return updateTodos(env, request)
		//} else {
		//return getTodos(env, request)
		//}
	},
}

interface Todo {
	completed: boolean
	name: string
	id: number
}
interface Data {
	todos: Todo[]
}
const defaultData: Data = { todos: [] }

const getCache = (env: Env, cacheKey: string, cacheTtl?: number) =>
	env.MY_FIRST_KV.get(cacheKey, { cacheTtl })
const setCache = (env: Env, cacheKey: string, data: string) =>
	env.MY_FIRST_KV.put(cacheKey, data)

async function getTodos(env: Env, request: Request) {
	const ip = request.headers.get('CF-Connecting-IP')
	const cacheKey = `data-${ip}`
	let data: Data

	const cache = await getCache(env, cacheKey)
	if (!cache) {
		await setCache(env, cacheKey, JSON.stringify(defaultData))
		data = defaultData
	} else {
		data = JSON.parse(cache)
	}

	const body = html(JSON.stringify(data.todos))
	return new Response(body, { headers: { 'Content-Type': 'text/html' } })
}

async function updateTodos(env: Env, request: Request) {
	const body = await request.text()
	const ip = request.headers.get('CF-Connecting-IP')
	const cacheKey = `data-${ip}`
	try {
		// validate the body
		JSON.parse(body)
		await setCache(env, cacheKey, body)
		return new Response(body, { status: 200 })
	} catch (err) {
		return new Response(
			err instanceof Error ? err.message : 'Todos recieved is invalid json',
			{ status: 400 }
		)
	}
}
