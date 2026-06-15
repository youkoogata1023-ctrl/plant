/**
 * 旬献立 - 3Dキャラクタージェネレーター (Three.js)
 * プロシージャルモデリングを使用して、ひまり(管理栄養士)とたくみ(シェフ)の3Dアバターを描画します。
 */

class Character3D {
  constructor(containerId, type) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.type = type; // 'himari' or 'takumi'
    this.width = this.container.clientWidth || 80;
    this.height = this.container.clientHeight || 80;

    // 初期化
    this.initScene();
    this.buildCharacter();
    this.addLights();
    this.animate();

    // リサイズハンドリング
    window.addEventListener('resize', () => {
      this.width = this.container.clientWidth || 80;
      this.height = this.container.clientHeight || 80;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    });
  }

  initScene() {
    this.scene = new THREE.Scene();
    // 背景を透明にする
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 1.5, 5);
  }

  addLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-5, -5, -5);
    this.scene.add(backLight);
  }

  createCheckerboardTexture(color1, color2, repeatX = 4, repeatY = 4) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = color2;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
  }

  buildCharacter() {
    this.characterGroup = new THREE.Group();

    // マテリアル定義
    const skinMaterial = new THREE.MeshPhongMaterial({ color: 0xffe0bd, flatShading: true });
    const darkMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 }); // 黒髪・目用
    const pinkMaterial = new THREE.MeshPhongMaterial({ color: 0xffb6c1, flatShading: true }); // ピンク（禰豆子用）
    const redMaterial = new THREE.MeshPhongMaterial({ color: 0x8b0000 }); // 痣用
    const greenMaterial = new THREE.MeshPhongMaterial({ color: 0x4caf50 }); // 竹筒用
    
    // 炭治郎の市松模様（緑と黒）
    const tanjiroTex = this.createCheckerboardTexture('#006400', '#111111', 4, 4);
    const tanjiroMaterial = new THREE.MeshPhongMaterial({ map: tanjiroTex, flatShading: true });
    
    // 禰豆子の帯の市松模様（赤と白）
    const obiTex = this.createCheckerboardTexture('#cc0000', '#ffffff', 6, 2);
    const obiMaterial = new THREE.MeshPhongMaterial({ map: obiTex });

    // ---- 頭部 ----
    const headGeo = new THREE.BoxGeometry(1.2, 1.1, 1.1);
    const head = new THREE.Mesh(headGeo, skinMaterial);
    head.position.y = 1.6;
    this.characterGroup.add(head);

    // 目
    const eyeGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, darkMaterial);
    leftEye.position.set(-0.3, 1.7, 0.55);
    const rightEye = new THREE.Mesh(eyeGeo, darkMaterial);
    rightEye.position.set(0.3, 1.7, 0.55);
    this.characterGroup.add(leftEye);
    this.characterGroup.add(rightEye);

    // ---- キャラクター固有の装飾 ----
    if (this.type === 'himari') {
      // ===== ひまり -> 禰豆子風 =====
      // 髪の毛（トップ）
      const topHairGeo = new THREE.BoxGeometry(1.3, 0.3, 1.2);
      const topHair = new THREE.Mesh(topHairGeo, darkMaterial);
      topHair.position.set(0, 2.2, 0);
      this.characterGroup.add(topHair);

      // 髪の毛（前髪）
      const bangsGeo = new THREE.BoxGeometry(1.3, 0.4, 0.2);
      const bangs = new THREE.Mesh(bangsGeo, darkMaterial);
      bangs.position.set(0, 2.0, 0.55);
      this.characterGroup.add(bangs);

      // 髪の毛（後ろ髪）
      const backHairGeo = new THREE.BoxGeometry(1.3, 1.2, 0.4);
      const backHair = new THREE.Mesh(backHairGeo, darkMaterial);
      backHair.position.set(0, 1.4, -0.4);
      this.characterGroup.add(backHair);

      // 髪の毛（横髪）
      const sideHairGeo = new THREE.BoxGeometry(0.3, 1.0, 0.4);
      const leftSideHair = new THREE.Mesh(sideHairGeo, darkMaterial);
      leftSideHair.position.set(-0.6, 1.5, 0.2);
      const rightSideHair = new THREE.Mesh(sideHairGeo, darkMaterial);
      rightSideHair.position.set(0.6, 1.5, 0.2);
      this.characterGroup.add(leftSideHair);
      this.characterGroup.add(rightSideHair);
      
      // 毛先（オレンジ）
      const orangeMaterial = new THREE.MeshPhongMaterial({ color: 0xd2691e });
      
      const backTipsGeo = new THREE.BoxGeometry(1.3, 0.4, 0.4);
      const backTips = new THREE.Mesh(backTipsGeo, orangeMaterial);
      backTips.position.set(0, 0.6, -0.4);
      this.characterGroup.add(backTips);

      const sideTipsGeo = new THREE.BoxGeometry(0.3, 0.4, 0.4);
      const leftSideTips = new THREE.Mesh(sideTipsGeo, orangeMaterial);
      leftSideTips.position.set(-0.6, 0.8, 0.2);
      const rightSideTips = new THREE.Mesh(sideTipsGeo, orangeMaterial);
      rightSideTips.position.set(0.6, 0.8, 0.2);
      this.characterGroup.add(leftSideTips);
      this.characterGroup.add(rightSideTips);

      // ピンクリボン（左頭頂部）
      const ribbonGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
      const ribbonMat = new THREE.MeshPhongMaterial({ color: 0xff69b4 });
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbon.position.set(-0.5, 2.3, 0.5);
      ribbon.rotation.z = Math.PI / 6;
      this.characterGroup.add(ribbon);

      // 竹筒
      const bambooGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16);
      const bamboo = new THREE.Mesh(bambooGeo, greenMaterial);
      bamboo.rotation.z = Math.PI / 2;
      bamboo.position.set(0, 1.4, 0.6);
      this.characterGroup.add(bamboo);

      // ピンクの着物（胴体）
      const bodyGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.2, 16);
      const body = new THREE.Mesh(bodyGeo, pinkMaterial);
      body.position.y = 0.5;
      this.characterGroup.add(body);

      // 帯（赤白市松）
      const obiGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 16);
      const obi = new THREE.Mesh(obiGeo, obiMaterial);
      obi.position.y = 0.6;
      this.characterGroup.add(obi);

    } else if (this.type === 'takumi') {
      // ===== たくみ -> 炭治郎風 =====
      // 髪の毛（ツンツン赤黒）
      const hairGeo = new THREE.BoxGeometry(1.3, 0.4, 1.2);
      const hairMaterial = new THREE.MeshPhongMaterial({ color: 0x4a0e0e });
      const hair = new THREE.Mesh(hairGeo, hairMaterial);
      hair.position.set(0, 2.2, 0);
      this.characterGroup.add(hair);

      // 額の痣（左上）
      const scarGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
      const scar = new THREE.Mesh(scarGeo, redMaterial);
      scar.position.set(-0.35, 2.0, 0.55);
      scar.rotation.z = Math.PI / 4;
      this.characterGroup.add(scar);

      // 花札風の耳飾り
      const earringGeo = new THREE.PlaneGeometry(0.15, 0.4);
      const earringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const leftEarring = new THREE.Mesh(earringGeo, earringMat);
      leftEarring.position.set(-0.65, 1.3, 0.2);
      const rightEarring = new THREE.Mesh(earringGeo, earringMat);
      rightEarring.position.set(0.65, 1.3, 0.2);
      this.characterGroup.add(leftEarring);
      this.characterGroup.add(rightEarring);

      // 羽織（緑黒市松）
      const bodyGeo = new THREE.CylinderGeometry(0.55, 0.75, 1.2, 16);
      const body = new THREE.Mesh(bodyGeo, tanjiroMaterial);
      body.position.y = 0.5;
      this.characterGroup.add(body);

      // 日輪刀（黒い刀）
      const swordBladeGeo = new THREE.BoxGeometry(0.05, 1.2, 0.15);
      const swordBlade = new THREE.Mesh(swordBladeGeo, new THREE.MeshPhongMaterial({ color: 0x111111 }));
      swordBlade.position.set(0.8, 0.8, 0.5);
      swordBlade.rotation.z = -Math.PI / 6;
      swordBlade.rotation.x = Math.PI / 8;
      
      const tsubaGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
      const tsuba = new THREE.Mesh(tsubaGeo, new THREE.MeshPhongMaterial({ color: 0x555555 }));
      tsuba.position.set(0.65, 0.35, 0.5);
      tsuba.rotation.x = Math.PI / 2;
      tsuba.rotation.y = -Math.PI / 6;
      
      this.characterGroup.add(swordBlade);
      this.characterGroup.add(tsuba);
    }

    // 全体の位置調整
    this.characterGroup.position.y = -1;
    this.scene.add(this.characterGroup);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.002;
    
    // フワフワ上下に浮遊
    this.characterGroup.position.y = -1 + Math.sin(time) * 0.1;
    
    // ゆっくり回転
    this.characterGroup.rotation.y = Math.sin(time * 0.5) * 0.2;

    this.renderer.render(this.scene, this.camera);
  }
}

// ページ読み込み時にキャラクターを初期化
document.addEventListener('DOMContentLoaded', () => {
  // THREE.js がロードされているか確認
  if (typeof THREE !== 'undefined') {
    setTimeout(() => {
      new Character3D('himari-3d-container', 'himari');
      new Character3D('himari-shopping-3d-container', 'himari');
      new Character3D('takumi-3d-container', 'takumi');
    }, 100);
  }
});
