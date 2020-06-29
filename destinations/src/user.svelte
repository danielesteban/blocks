<script>
	import { fetchUser } from './auth.js';
	import Skin from './skin.svelte';
	export let id;
</script>

{#await fetchUser(id) then user}
	<Skin
		user={user._id}
		width={272}
		height={272}
	/>
	<h3>
		{user.name}
	</h3>
{:catch error}
	<div>{error.message}</div>
{/await}

<style>
	h3, div {
		padding: 0 1rem 1rem;
	}

	h3 {
		margin: 1rem 0 0;
	}
</style>
