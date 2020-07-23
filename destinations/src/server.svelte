<script>
	import { fetchServer } from './auth.js';
	import Share from './share.svelte';
	export let id;

	const fetchServerStatus = ({ url }) => (
		fetch(`${url}status`)
			.then((res) => res.json())
	);
</script>

{#await fetchServer(id) then server}
	<a href={server.link}>
		<img alt={server.name} src={server.map} />
	</a>
	<h3>
		<a href={server.link}>
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
	h3, div, social {
		padding: 0 1rem 1rem;
	}

  h3 {
		margin: 1rem 0 0;
	}

	img {
		display: block;
		width: 100%;
		width: 272px;
		height: 272px;
	}

	social {
		display: flex;
		align-items: center;
	}
</style>
