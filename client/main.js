import Renderer from './core/renderer.js';
import World from './scenes/world.js';

const renderer = new Renderer({
  debug: {
    fps: document.getElementById('fps'),
    support: document.getElementById('support'),
  },
  mount: document.getElementById('mount'),
});

renderer.loadScene(World);
