// Three.js 3D Stadium Visualization
const stadium3D = {
  scenes: {},
  renderers: {},
  cameras: {},
  controls: { rotate: true },

  init(canvasId, isMini = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);

    // Fog for stadium lights atmosphere
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 45, 80);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x223344, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(20, 60, 20);
    scene.add(mainLight);

    // Stadium Lights (4 floodlights at corners)
    const positions = [
      [-40, 30, -40], [40, 30, -40],
      [-40, 30, 40], [40, 30, 40]
    ];
    positions.forEach(pos => {
      const light = new THREE.SpotLight(0x00ffff, 2, 120, Math.PI/4, 0.5, 1);
      light.position.set(pos[0], pos[1], pos[2]);
      light.target.position.set(0, 0, 0);
      scene.add(light);
      scene.add(light.target);

      // Tower mesh helper
      const towerGeo = new THREE.CylinderGeometry(1, 1.5, 30, 8);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x2d3748 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(pos[0], 15, pos[2]);
      scene.add(tower);
    });

    // Cricket Pitch (Turf)
    const fieldGeo = new THREE.CylinderGeometry(35, 35, 1, 32);
    const fieldMat = new THREE.MeshStandardMaterial({ color: 0x14532d }); // dark green turf
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.position.y = -0.5;
    scene.add(field);

    // Center pitch strip
    const pitchGeo = new THREE.BoxGeometry(4, 0.1, 18);
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0xc2a679 }); // dust color pitch
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.position.set(0, 0.05, 0);
    scene.add(pitch);

    // Wickets
    const wicketMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const wicketGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.8, 8);
    
    // Bowlers end wickets
    for(let i=-1; i<=1; i++) {
      const wicket = new THREE.Mesh(wicketGeo, wicketMat);
      wicket.position.set(i*0.4, 0.9, -8);
      scene.add(wicket);
    }
    // Batsmans end wickets
    for(let i=-1; i<=1; i++) {
      const wicket = new THREE.Mesh(wicketGeo, wicketMat);
      wicket.position.set(i*0.4, 0.9, 8);
      scene.add(wicket);
    }

    // Boundary rope representation
    const ropeGeo = new THREE.TorusGeometry(32, 0.4, 8, 48);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.rotation.x = Math.PI / 2;
    rope.position.y = 0.1;
    scene.add(rope);

    // Stadium Stands Ring
    const standGeo = new THREE.CylinderGeometry(40, 48, 12, 32, 1, true);
    const standMat = new THREE.MeshStandardMaterial({ 
      color: 0x1b2541, 
      side: THREE.DoubleSide,
      wireframe: false 
    });
    const stands = new THREE.Mesh(standGeo, standMat);
    stands.position.y = 5.5;
    scene.add(stands);

    // Store references
    this.scenes[canvasId] = scene;
    this.renderers[canvasId] = renderer;
    this.cameras[canvasId] = camera;

    // Animation Loop
    let angle = 0;
    const animate = () => {
      requestAnimationFrame(animate);

      if (this.controls.rotate) {
        angle += 0.003;
        camera.position.x = Math.sin(angle) * 75;
        camera.position.z = Math.cos(angle) * 75;
        camera.lookAt(0, 5, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      const newWidth = canvas.clientWidth;
      const newHeight = canvas.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    });
  },

  toggleRotation() {
    this.controls.rotate = !this.controls.rotate;
    const btn = document.getElementById('toggle-rotate-btn');
    if (btn) {
      btn.style.color = this.controls.rotate ? 'var(--accent-secondary)' : 'var(--text-muted)';
    }
  },

  resetCamera() {
    for (const key in this.cameras) {
      this.cameras[key].position.set(0, 45, 80);
      this.cameras[key].lookAt(0, 5, 0);
    }
  }
};
