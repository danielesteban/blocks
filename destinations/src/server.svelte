<script>
	import { fetchServer } from './auth.js';
	import Share from './share.svelte';
	export let id;

	const fetchServerStatus = ({ url }) => (
		fetch(`${url}status`)
			.then((res) => res.json())
	);
</script>

<actions>
	<a href="#/">&lt; Servers</a>
</actions>
{#await fetchServer(id) then server}
	<a href={server.link} target="_blank">
		<img alt={server.name} src={`${server.url}map`} />
	</a>
	<h3>
		<a href={server.link} target="_blank">
			{server.name}
		</a>
	</h3>
	{#await fetchServerStatus(server)}
		<div>Fetching status...</div>
	{:then status}
		<div>Players: {status.players}</div>
	{:catch error}
		<div>{error.message}</div>
	{/await}
	<social>
		<Share url={server.link} />
	</social>
{:catch error}
	<div>{error.message}</div>
{/await}

<style>
	actions {
		display: block;
		background: #222;
		border-bottom: 1px solid #111;
	}

	actions > a {
		display: inline-block;
		padding: 0.5rem 1rem;
		text-align: center;
		text-transform: uppercase;
		text-decoration: none;
		color: #fff;
		background: #333;
	}

	h3, div, social {
		margin: 0;
		padding: 0 1rem 1rem;
	}

	h3 > a {
		color: #fff;
	}

	img {
		display: block;
		width: 100%;
		margin-bottom: 1rem;
		width: 272px;
		height: 272px;
	}

	social {
		display: flex;
		align-items: center;
	}
</style>
