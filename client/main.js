import Renderer from './core/renderer.js';
import World from './scenes/world.js';

const renderer = new Renderer({
  dom: {
    chunk: document.getElementById('chunk'),
    enterVR: document.getElementById('enterVR'),
    fps: document.getElementById('fps'),
    players: document.getElementById('players'),
    renderer: document.getElementById('renderer'),
    seed: document.getElementById('seed'),
    session: document.getElementById('session'),
    support: document.getElementById('support'),
  },
  dialogs: {
    location: document.getElementById('location'),
    login: document.getElementById('login'),
    register: document.getElementById('register'),
  },
});

renderer.loadScene(World);
