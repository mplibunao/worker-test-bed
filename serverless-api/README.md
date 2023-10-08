# Setup

## Get API key from unsplash

- Create an app in [unsplash oauth applications](https://unsplash.com/oauth/applications)
- Run `cp .dev.vars.example .dev.vars`
- Copy the `Access Key` for unsplash to the `CLIENT_ID`

# Querying

## Query from CLI

```sh
curl -H "Content-Type: application" -d '{"query": "guitar"}' http://127.0.0.1:8787 | jq
```

## Query from browser

- For testing cors without needing to create a react app
- Open dev tools in browser then paste

> **Note**: Replace the url when testing in production

```js
// Replace url for production
//const url = "https://serverless-api.markpaololibunao.workers.dev"
 const url = "http://127.0.0.1:8787"

const getImages = async query => {
  // The base URL for our API
  const resp = await fetch(url, {
    // Send a POST request
    method: "POST",
    // With a JSON-stringified body containing the query from our input
    body: JSON.stringify({ query }),
    // Set the `Content-type` header so our API knows that the request
    // is sending JSON
    headers: { 'Content-type': 'application/json' }
  })
  return resp.json()
}

const imgages = await getImages('guitar')
console.info(imgages, "imgages")
```

