<script>
	import { fetchLocations } from './auth.js';
	import Locations from './locations.svelte';
	import Server from './server.svelte';
	import Servers from './servers.svelte';

	let server;

	const onLocationChange = () => {
		const params = document.location.hash.substr(2).split('/').reduce((keys, param) => {
      const [key, value] = param.split(':');
      keys[key] = decodeURIComponent(value);
      return keys;
		}, {});
		server = params.server;
	};
	window.addEventListener('hashchange', onLocationChange);
	onLocationChange();
</script>

<app>
	<nav>
		<h2>blocks - DESTINATIONS</h2>
		{#if server}
			<Server id={server} />
		{:else}
			<Servers />
		{/if}
	</nav>
	{#await fetchLocations(server) then locations}
		<Locations locations={locations} />
	{:catch error}
		<div>{error.message}</div>
	{/await}
</app>

<style>
	app {
		display: flex;
		width: 100vw;
		height: 100vh;
	}

	nav {
		box-sizing: border-box;
		flex-grow: 0;
		flex-shrink: 0;
		width: 272px;
		background: #222;
	}

	nav > h2 {
		margin: 0;
		padding: 0.5rem 0;
		text-align: center;
		font-weight: 400;
		background: #111;
	}
</style>
