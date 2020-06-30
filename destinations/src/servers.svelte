<script>
	import { fetchServers } from './auth.js';
</script>

{#await fetchServers() then servers}
	{#each servers as server}
		<a href={`#/server:${server._id}`}>
			{server.name}
		</a>
	{/each}
{:catch error}
	<div>{error.message}</div>
{/await}

<style>
	a {
		display: block;
		padding: 0.75rem 1rem;
		text-decoration: none;
		background: #444;
	}
	
	a:nth-child(odd) {
		background: #333;
	}
</style>
