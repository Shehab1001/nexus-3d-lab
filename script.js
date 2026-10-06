import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js'
import gsap from 'https://esm.sh/gsap@3.13.0'
import { ScrollTrigger } from 'https://esm.sh/gsap@3.13.0/ScrollTrigger'
import Lenis from 'https://esm.sh/lenis@1.3.11'

gsap.registerPlugin(ScrollTrigger)

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const coarsePointer = matchMedia('(pointer: coarse)').matches
const canvas = document.querySelector('#webgl')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scene = new THREE.Scene()
scene.background = new THREE.Color('#050607')
scene.fog = new THREE.FogExp2('#050607', 0.07)
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 0, 8)
scene.add(camera)

const root = new THREE.Group()
scene.add(root)

const ambient = new THREE.AmbientLight('#9fb0ba', 0.65)
const key = new THREE.DirectionalLight('#eff8ff', 4.2)
key.position.set(4, 5, 6)
const acidLight = new THREE.PointLight('#dfff43', 8, 14, 2)
acidLight.position.set(-3, 0, 3)
const rim = new THREE.PointLight('#75cfff', 4, 12, 2)
rim.position.set(4, -2, -1)
scene.add(ambient, key, acidLight, rim)

const pointer = new THREE.Vector2()
const pointerTarget = new THREE.Vector2()
const pointerVelocity = new THREE.Vector2()
let previousPointer = new THREE.Vector2()
let lastPointerTime = performance.now()

window.addEventListener('pointermove', (event) => {
  pointerTarget.x = (event.clientX / innerWidth) * 2 - 1
  pointerTarget.y = -(event.clientY / innerHeight) * 2 + 1
  const now = performance.now()
  const dt = Math.max(16, now - lastPointerTime)
  pointerVelocity.set((event.clientX - previousPointer.x) / dt, (event.clientY - previousPointer.y) / dt)
  previousPointer.set(event.clientX, event.clientY)
  lastPointerTime = now
}, { passive: true })

const shaderUniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2() },
  uIntensity: { value: 0.34 },
  uColorA: { value: new THREE.Color('#dfff43') },
  uColorB: { value: new THREE.Color('#26b8ff') },
  uFresnel: { value: 2.4 },
}

const vertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vWave;
  void main(){
    vec3 p = position;
    float w1 = sin(p.y * 5.0 + uTime * 1.4 + uMouse.x * 2.0);
    float w2 = cos(p.x * 4.0 - uTime * 1.1 + uMouse.y * 2.0);
    float w3 = sin((p.x + p.z) * 3.5 + uTime * 0.7);
    float wave = (w1 + w2 + w3) / 3.0;
    p += normal * wave * uIntensity * 0.18;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(normalMatrix * normal);
    vWave = wave;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`
const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uFresnel;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vWave;
  void main(){
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), uFresnel);
    float scan = 0.5 + 0.5 * sin(vWorld.y * 17.0 - uTime * 3.0);
    vec3 base = mix(uColorA, uColorB, fres + vWave * 0.16);
    base += scan * 0.055;
    float glow = 0.6 + fres * 1.6;
    gl_FragColor = vec4(base * glow, 1.0);
  }
`

const coreGroup = new THREE.Group()
root.add(coreGroup)
const coreMat = new THREE.ShaderMaterial({ uniforms: shaderUniforms, vertexShader, fragmentShader })
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.13, 7), coreMat)
coreGroup.add(core)

const innerCore = new THREE.Mesh(
  new THREE.SphereGeometry(0.52, 48, 48),
  new THREE.MeshBasicMaterial({ color: '#f4ffb5', transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending })
)
coreGroup.add(innerCore)

const rings = []
;[
  [1.78, 0.028, [Math.PI / 2, 0, 0], '#dfff43'],
  [2.13, 0.018, [0.5, Math.PI / 2, 0.2], '#eff8ff'],
  [2.52, 0.012, [1.1, 0.3, 0.8], '#74cfff'],
].forEach(([radius, tube, rotation, color], index) => {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 12, 180),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: index === 0 ? 0.9 : 0.42 })
  )
  ring.rotation.set(...rotation)
  ring.userData.speed = (index % 2 ? -1 : 1) * (0.12 + index * 0.04)
  coreGroup.add(ring)
  rings.push(ring)
})

const shellPieces = []
const shellGeo = new THREE.IcosahedronGeometry(0.62, 1)
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2
  const material = new THREE.MeshPhysicalMaterial({
    color: i % 3 === 0 ? '#273036' : '#101316',
    metalness: 0.88,
    roughness: 0.18,
    clearcoat: 0.9,
    wireframe: i % 4 === 0,
    transparent: true,
    opacity: 0.93,
  })
  const mesh = new THREE.Mesh(shellGeo, material)
  mesh.position.set(Math.cos(a) * 1.72, Math.sin(a * 1.4) * 0.52, Math.sin(a) * 1.72)
  mesh.scale.set(0.82, 0.28 + (i % 3) * 0.05, 1.18)
  mesh.rotation.set(a * 0.13, a, a * 0.08)
  mesh.userData.home = mesh.position.clone()
  mesh.userData.exploded = new THREE.Vector3(
    Math.cos(a) * (3.35 + (i % 2) * 0.58),
    Math.sin(a * 1.3) * 2.15,
    Math.sin(a) * 2.8
  )
  coreGroup.add(mesh)
  shellPieces.push(mesh)
}

const particleCount = innerWidth < 700 ? 800 : 1800
const particlePositions = new Float32Array(particleCount * 3)
for (let i = 0; i < particleCount; i++) {
  const radius = 4 + Math.random() * 18
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  particlePositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
  particlePositions[i * 3 + 1] = Math.cos(phi) * radius * 0.65
  particlePositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
}
const particlesGeo = new THREE.BufferGeometry()
particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
const particles = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ color: '#bcd0ce', size: 0.018, transparent: true, opacity: 0.26 }))
scene.add(particles)

const physicsGroup = new THREE.Group()
physicsGroup.visible = false
scene.add(physicsGroup)
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -2.75, 0) })
world.allowSleep = true
world.broadphase = new CANNON.SAPBroadphase(world)
const physicsItems = []
const physicsMaterial = new CANNON.Material('matter')
const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: physicsMaterial })
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
groundBody.position.set(0, -2.4, 0)
world.addBody(groundBody)
world.addContactMaterial(new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, { friction: 0.08, restitution: 0.78 }))

const physicsPalette = ['#dfff43', '#a7b0b4', '#22282d', '#68c9ff']
for (let i = 0; i < 22; i++) {
  const radius = 0.16 + (i % 5) * 0.045
  const body = new CANNON.Body({ mass: 0.7 + (i % 4) * 0.12, material: physicsMaterial })
  body.addShape(i % 3 === 0 ? new CANNON.Box(new CANNON.Vec3(radius, radius, radius)) : new CANNON.Sphere(radius))
  body.position.set((Math.random() - 0.5) * 5.7, 1.8 + Math.random() * 5.4, (Math.random() - 0.5) * 2.3)
  body.angularVelocity.set(Math.random(), Math.random(), Math.random())
  world.addBody(body)
  const geometry = i % 3 === 0 ? new THREE.BoxGeometry(radius * 2, radius * 2, radius * 2) : new THREE.DodecahedronGeometry(radius, 0)
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: physicsPalette[i % physicsPalette.length], metalness: 0.58, roughness: 0.2 }))
  mesh.userData.body = body
  physicsGroup.add(mesh)
  physicsItems.push({ body, mesh })
}
const physicsFloor = new THREE.Mesh(new THREE.CircleGeometry(5.8, 80), new THREE.MeshBasicMaterial({ color: '#111516', transparent: true, opacity: 0.38 }))
physicsFloor.rotation.x = -Math.PI / 2
physicsFloor.position.y = -2.39
physicsGroup.add(physicsFloor)

const projectGroup = new THREE.Group()
projectGroup.visible = false
scene.add(projectGroup)
const projectMeshes = []
const projectData = [
  { x: -2.65, color: '#d7e4e8', emissive: '#6c8a98' },
  { x: 0, color: '#0b0d0e', emissive: '#627077' },
  { x: 2.65, color: '#dfff43', emissive: '#8da919' },
]
projectData.forEach((item, index) => {
  const group = new THREE.Group()
  group.position.x = item.x
  const planet = new THREE.Mesh(
    index === 1 ? new THREE.TorusKnotGeometry(0.72, 0.24, 160, 24) : new THREE.IcosahedronGeometry(0.9, index === 2 ? 4 : 2),
    new THREE.MeshPhysicalMaterial({ color: item.color, emissive: item.emissive, emissiveIntensity: index === 2 ? 0.7 : 0.15, metalness: index === 1 ? 0.98 : 0.45, roughness: 0.18, clearcoat: 1 })
  )
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: index === 2 ? '#dfff43' : '#819095', transparent: true, opacity: 0.45 }))
  ring.rotation.x = Math.PI / 2 + index * 0.35
  group.add(planet, ring)
  group.userData.planet = planet
  group.userData.ring = ring
  projectGroup.add(group)
  projectMeshes.push(group)
})

const raycaster = new THREE.Raycaster()
function impulseAtPointer(event) {
  if (!physicsGroup.visible) return
  pointerTarget.x = (event.clientX / innerWidth) * 2 - 1
  pointerTarget.y = -(event.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(pointerTarget, camera)
  const hits = raycaster.intersectObjects(physicsItems.map((item) => item.mesh), false)
  if (!hits.length) return
  const body = hits[0].object.userData.body
  const direction = new THREE.Vector3().subVectors(hits[0].point, camera.position).normalize()
  body.applyImpulse(new CANNON.Vec3(direction.x * 3.5, 3.8 + Math.random() * 2, direction.z * 3.5), body.position)
}
window.addEventListener('pointerdown', impulseAtPointer)

document.querySelector('#burstButton').addEventListener('click', () => {
  physicsItems.forEach(({ body }, index) => {
    const angle = (index / physicsItems.length) * Math.PI * 2
    body.wakeUp()
    body.applyImpulse(new CANNON.Vec3(Math.cos(angle) * 4.2, 3.5 + Math.random() * 4, Math.sin(angle) * 4.2), body.position)
  })
})

const presets = {
  holo: { a: '#dfff43', b: '#26b8ff', fresnel: 2.4, intensity: 0.34, bg: '#050607' },
  chrome: { a: '#e9f1f3', b: '#49555e', fresnel: 4.2, intensity: 0.12, bg: '#060708' },
  plasma: { a: '#ff3fa8', b: '#6c5cff', fresnel: 1.7, intensity: 0.55, bg: '#08050a' },
  void: { a: '#1d2429', b: '#030405', fresnel: 6.0, intensity: 0.18, bg: '#020303' },
}
let motionScale = 1
function selectButton(button, selector) {
  document.querySelectorAll(selector).forEach((btn) => btn.classList.toggle('is-active', btn === button))
}
document.querySelectorAll('[data-material]').forEach((button) => {
  button.addEventListener('click', () => {
    selectButton(button, '[data-material]')
    const p = presets[button.dataset.material]
    gsap.to(shaderUniforms.uColorA.value, { r: new THREE.Color(p.a).r, g: new THREE.Color(p.a).g, b: new THREE.Color(p.a).b, duration: 0.7 })
    gsap.to(shaderUniforms.uColorB.value, { r: new THREE.Color(p.b).r, g: new THREE.Color(p.b).g, b: new THREE.Color(p.b).b, duration: 0.7 })
    gsap.to(shaderUniforms.uFresnel, { value: p.fresnel, duration: 0.6 })
    gsap.to(shaderUniforms.uIntensity, { value: p.intensity, duration: 0.6 })
    gsap.to(scene.background, { r: new THREE.Color(p.bg).r, g: new THREE.Color(p.bg).g, b: new THREE.Color(p.bg).b, duration: 0.8 })
  })
})
document.querySelectorAll('[data-motion]').forEach((button) => {
  button.addEventListener('click', () => {
    selectButton(button, '[data-motion]')
    motionScale = { calm: 0.45, reactive: 1, chaotic: 2.1 }[button.dataset.motion]
    document.querySelector('#modeLabel').textContent = button.dataset.motion.toUpperCase()
  })
})

function setScene(name) {
  coreGroup.visible = ['core', 'exploded', 'tunnel', 'materials', 'final'].includes(name)
  physicsGroup.visible = name === 'physics'
  projectGroup.visible = name === 'projects'
  const label = { core: 'CORE / 01', exploded: 'SHELL / 02', tunnel: 'TUNNEL / 03', physics: 'PHYSICS / 04', materials: 'MATTER / 05', projects: 'GALAXY / 06', final: 'SIGNAL / 07' }[name] || 'CORE / 01'
  document.querySelector('#sceneLabel').textContent = label

  if (name === 'physics') gsap.to(camera.position, { x: 0, y: 0.2, z: 7.2, duration: 1.1, overwrite: true })
  if (name === 'materials') gsap.to(camera.position, { x: 1.4, y: 0.15, z: 6.3, duration: 1.1, overwrite: true })
  if (name === 'projects') gsap.to(camera.position, { x: 0, y: 0, z: 8.2, duration: 1.1, overwrite: true })
  if (name === 'final') gsap.to(camera.position, { x: 0, y: 0, z: 9, duration: 1.1, overwrite: true })
}

document.querySelectorAll('[data-scene]').forEach((section) => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top 55%',
    end: 'bottom 45%',
    onEnter: () => setScene(section.dataset.scene),
    onEnterBack: () => setScene(section.dataset.scene),
  })
})

const heroTimeline = gsap.timeline({
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: reducedMotion ? false : 1.1 }
})
shellPieces.forEach((piece, index) => {
  heroTimeline.to(piece.position, { x: piece.userData.exploded.x, y: piece.userData.exploded.y, z: piece.userData.exploded.z, duration: 1 }, 0)
  heroTimeline.to(piece.rotation, { x: index * 0.23, y: index * 0.48, z: index * 0.11, duration: 1 }, 0)
})
heroTimeline.to(coreGroup.rotation, { y: Math.PI * 1.55, x: 0.32, duration: 1.2 }, 0)
heroTimeline.to(camera.position, { z: 5.1, duration: 0.65 }, 0.22)
heroTimeline.to(camera.position, { z: 2.15, duration: 0.55 }, 0.72)
heroTimeline.to('.hero__title', { opacity: 0.1, scale: 1.08, duration: 0.6 }, 0.55)

const tunnelTimeline = gsap.timeline({
  scrollTrigger: { trigger: '.tunnel', start: 'top bottom', end: 'bottom top', scrub: reducedMotion ? false : 1 }
})
tunnelTimeline.fromTo(camera.position, { z: 4.8 }, { z: -4.2, duration: 1 }, 0)
tunnelTimeline.fromTo(coreGroup.scale, { x: 1, y: 1, z: 1 }, { x: 2.8, y: 2.8, z: 2.8, duration: 0.5 }, 0)
tunnelTimeline.to(coreGroup.scale, { x: 0.58, y: 0.58, z: 0.58, duration: 0.5 }, 0.5)
tunnelTimeline.to(coreGroup.position, { z: -4.8, duration: 1 }, 0)

ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate(self) {
    gsap.set('.progress span', { scaleX: self.progress })
    const velocity = Math.max(-1, Math.min(1, self.getVelocity() / 2800))
    gsap.to('.kinetic', { skewX: velocity * -4, duration: 0.28, overwrite: true, ease: 'power2.out' })
  }
})

gsap.utils.toArray('.reveal').forEach((element) => {
  gsap.fromTo(element, { y: 40, opacity: 0 }, {
    y: 0, opacity: 1, duration: reducedMotion ? 0 : 0.95, ease: 'power3.out',
    scrollTrigger: { trigger: element, start: 'top 87%' }
  })
})

const lenis = reducedMotion ? null : new Lenis({ duration: 1.05, smoothWheel: true })
lenis?.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis?.raf(time * 1000))
gsap.ticker.lagSmoothing(0)

const cursor = document.querySelector('.cursor')
const cursorText = cursor.querySelector('span')
let cursorX = innerWidth / 2, cursorY = innerHeight / 2, targetX = cursorX, targetY = cursorY
if (!coarsePointer) {
  addEventListener('pointermove', (event) => { targetX = event.clientX; targetY = event.clientY }, { passive: true })
  document.addEventListener('pointerover', (event) => {
    const hit = event.target.closest('[data-cursor]')
    if (!hit) return
    cursor.classList.add('is-active')
    cursorText.textContent = hit.dataset.cursor
  })
  document.addEventListener('pointerout', (event) => {
    if (!event.target.closest('[data-cursor]')) return
    cursor.classList.remove('is-active')
    cursorText.textContent = ''
  })
}

const projectCards = document.querySelectorAll('[data-project]')
projectCards.forEach((card) => {
  card.addEventListener('pointerenter', () => {
    const index = Number(card.dataset.project)
    projectMeshes.forEach((group, i) => gsap.to(group.scale, { x: i === index ? 1.32 : 0.78, y: i === index ? 1.32 : 0.78, z: i === index ? 1.32 : 0.78, duration: 0.55, ease: 'power3.out' }))
  })
  card.addEventListener('pointerleave', () => projectMeshes.forEach((group) => gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.45 })))
})

const boot = document.querySelector('.boot')
const counter = document.querySelector('.boot__counter')
const bootState = { value: 0 }
gsap.to(bootState, {
  value: 100,
  duration: reducedMotion ? 0 : 1.7,
  ease: 'power3.inOut',
  onUpdate: () => { counter.textContent = String(Math.round(bootState.value)).padStart(3, '0') },
  onComplete: () => boot.classList.add('is-done')
})

const clock = new THREE.Clock()
let physicsAccumulator = 0
let fpsFrames = 0, fpsTime = performance.now()
const fpsLabel = document.querySelector('#fpsLabel')

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const elapsed = clock.elapsedTime
  pointer.lerp(pointerTarget, 0.045)
  shaderUniforms.uTime.value = elapsed * motionScale
  shaderUniforms.uMouse.value.lerp(pointer, 0.08)
  const velocityEnergy = Math.min(1, pointerVelocity.length() * 4)
  core.rotation.y += 0.0015 * motionScale
  core.rotation.x = THREE.MathUtils.lerp(core.rotation.x, pointer.y * 0.11 * motionScale, 0.025)
  innerCore.scale.setScalar(1 + Math.sin(elapsed * 2.2 * motionScale) * 0.035)
  rings.forEach((ring) => { ring.rotation.z += ring.userData.speed * dt * motionScale })
  particles.rotation.y += 0.006 * dt * motionScale
  particles.rotation.x = pointer.y * 0.025
  acidLight.intensity = 7.2 + Math.sin(elapsed * 2.3) * 1.3 + velocityEnergy * 2

  if (physicsGroup.visible) {
    physicsAccumulator += dt
    while (physicsAccumulator >= 1 / 60) { world.step(1 / 60); physicsAccumulator -= 1 / 60 }
    physicsItems.forEach(({ body, mesh }) => {
      mesh.position.copy(body.position)
      mesh.quaternion.copy(body.quaternion)
      if (body.position.y < -5) {
        body.position.set((Math.random() - 0.5) * 5, 4 + Math.random() * 3, (Math.random() - 0.5) * 2)
        body.velocity.set(0, 0, 0)
      }
    })
    physicsGroup.rotation.y = pointer.x * 0.08
  }

  if (projectGroup.visible) {
    projectMeshes.forEach((group, index) => {
      group.userData.planet.rotation.x += dt * (0.22 + index * 0.06)
      group.userData.planet.rotation.y += dt * (0.3 + index * 0.07)
      group.userData.ring.rotation.z += dt * (index % 2 ? -0.34 : 0.26)
      group.position.y = Math.sin(elapsed * 0.8 + index * 1.7) * 0.18
    })
  }

  if (!physicsGroup.visible && !projectGroup.visible) {
    coreGroup.rotation.z = THREE.MathUtils.lerp(coreGroup.rotation.z, pointer.x * 0.06, 0.02)
  }

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, (materialsActive() ? 1.4 : 0) + pointer.x * 0.22, 0.02)
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.y * 0.13, 0.02)
  camera.lookAt(0, 0, 0)
  renderer.render(scene, camera)

  cursorX += (targetX - cursorX) * 0.17
  cursorY += (targetY - cursorY) * 0.17
  if (!coarsePointer) cursor.style.transform = `translate3d(${cursorX}px,${cursorY}px,0)`

  fpsFrames++
  const now = performance.now()
  if (now - fpsTime > 700) {
    fpsLabel.textContent = String(Math.round((fpsFrames * 1000) / (now - fpsTime)))
    fpsFrames = 0
    fpsTime = now
  }
}
function materialsActive() {
  const rect = document.querySelector('#materials').getBoundingClientRect()
  return rect.top < innerHeight * 0.55 && rect.bottom > innerHeight * 0.45
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.setSize(innerWidth, innerHeight)
})

setScene('core')
