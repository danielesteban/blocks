import Renderer from './core/renderer.js';
import World from './scenes/world.js';

const renderer = new Renderer({
  debug: {
    chunk: document.getElementById('chunk'),
    enterVR: document.getElementById('enterVR'),
    fps: document.getElementById('fps'),
    players: document.getElementById('players'),
    seed: document.getElementById('seed'),
    support: document.getElementById('support'),
  },
  mount: document.getElementById('mount'),
});

renderer.loadScene(World);
