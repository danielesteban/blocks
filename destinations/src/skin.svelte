<script>
  import { onDestroy, onMount } from 'svelte';
	import { getUserSkin } from './auth.js';
  
  export let user;
  export let width;
  export let height;
  let canvas;
  const texture = new Image();
	onMount(() => {
		const ctx = canvas.getContext('2d');
		ctx.imageSmoothingEnabled = false;
    texture.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(texture, 8, 8, 8, 8, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(texture, 40, 8, 8, 8, 0, 0, canvas.width, canvas.height);
    };
  });
  onDestroy(() => {
    texture.onload = null;
  });
  $: texture.src = getUserSkin(user);
</script>

<canvas
  bind:this={canvas}
  width={width}
  height={height}
/>

<style>
  canvas {
    vertical-align: middle;
  }
</style>