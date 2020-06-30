<script>
	import { fetchLocations } from './auth.js';
	import Locations from './locations.svelte';
	import Server from './server.svelte';
	import Servers from './servers.svelte';
	import User from './user.svelte';

	let server;
	let user;

	const onLocationChange = () => {
		const params = document.location.hash.substr(2).split('/').reduce((keys, param) => {
      const [key, value] = param.split(':');
      keys[key] = decodeURIComponent(value);
      return keys;
		}, {});
		server = params.server;
		user = !params.server && params.user;
	};
	window.addEventListener('hashchange', onLocationChange);
	onLocationChange();
</script>

<app>
	<nav>
		<h2>blocks - DESTINATIONS</h2>
		{#if server || user}
			<actions>
				<a href="#/">&lt; Servers</a>
			</actions>
		{/if}
		{#if server}
			<Server id={server} />
		{:else if user}
			<User id={user} />
		{:else}
			<Servers />
		{/if}
	</nav>
	{#await fetchLocations({ server, user }) then locations}
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
		display: block;
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
		background: #333;
	}
</style>
