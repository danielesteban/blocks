<script>
	import Share from './share.svelte';
	import Skin from './skin.svelte';
	export let locations;
	let current = 0;
	let location = locations[current];

	const paginate = (inc) => ({ target }) => {
		if (target.classList.contains('enabled')) {
			current += inc;
			location = locations[current];
		}
	};
</script>

<destination>
	<photo>
		<a href={location.link} target="_blank">
			<img alt={location.name} src="{location.photo}"/>
		</a>
		<prev
			class={current > 0 ? 'enabled' : ''}
			on:click={paginate(-1)}
		>
			&lt;
		</prev>
		<next
			class={current < (locations.length - 1) ? 'enabled' : ''}
			on:click={paginate(1)}
		>
			&gt;
		</next>
	</photo>
	<info>
		<div>
			{location.name}
		</div>
		<div>
			<Share url={location.link} />
		</div>
		<div>
			<Skin
				user={location.user._id}
				width={32}
				height={32}
			/>
			<div>
				{location.user.name} - {location.date}
			</div>
		</div>
	</info>
</destination>

<style>
	destination {
		flex-grow: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
	}
	
	photo {
		flex-grow: 1;
	}

	photo > a > img {
		display: block;
		width: 100%;
		height: calc(100vh - 3rem);
		object-fit: contain;
	}

	prev, next {
		position: absolute;
		top: 0;
		height: 100vh;
		width: 8rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		opacity: 0.3;
	}

	prev.enabled:hover, next.enabled:hover {
		opacity: 0.7;
		cursor: pointer;
	}

	prev {
		left: 0;
	}

	next {
		right: 0;
	}

	info {
		background: #111;
		display: flex;
		padding: 0.5rem 1rem;
		align-items: center;
	}

	info > div {
		display: flex;
		align-items: center;
		width: calc(50% - 50px);
	}

	info > div:nth-child(2) {
		width: 100px;
		justify-content: center;
	}

	info > div:nth-child(3) {
		justify-content: flex-end;
	}

	info > div:nth-child(3) > div {
		margin-left: 0.75rem;
	}
</style>
