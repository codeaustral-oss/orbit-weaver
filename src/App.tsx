import './App.css'
import { Camera, RefreshCw, Shuffle, SlidersHorizontal, Waves } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type WeaveMode = 'braid' | 'gyre' | 'halo'

type WeaverSettings = {
  rings: number
  strands: number
  twist: number
  depth: number
  speed: number
  tilt: number
  palette: string
  mode: WeaveMode
  seed: number
}

type Palette = {
  name: string
  colors: [string, string, string, string]
}

const palettes: Palette[] = [
  { name: 'Copper Tide', colors: ['#f2cc8f', '#e07a5f', '#81b29a', '#f4f1de'] },
  { name: 'Glass Garden', colors: ['#a7f3d0', '#fefae0', '#dda15e', '#90e0ef'] },
  { name: 'Signal Ember', colors: ['#ffd166', '#ef476f', '#06d6a0', '#edf6f9'] },
]

const initialSettings: WeaverSettings = {
  rings: 11,
  strands: 6,
  twist: 0.72,
  depth: 1.1,
  speed: 0.54,
  tilt: 0.82,
  palette: palettes[0].name,
  mode: 'braid',
  seed: 24591,
}

function randomFrom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function activePalette(settings: WeaverSettings) {
  return palettes.find((palette) => palette.name === settings.palette) ?? palettes[0]
}

type DisposableObject = THREE.Object3D & {
  geometry?: THREE.BufferGeometry
  material?: THREE.Material | THREE.Material[]
}

function disposeGroup(group: THREE.Group) {
  group.traverse((child) => {
    const object = child as DisposableObject
    object.geometry?.dispose()
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose())
    } else {
      object.material?.dispose()
    }
  })
}

function createOrbitGroup(settings: WeaverSettings) {
  const group = new THREE.Group()
  const random = randomFrom(settings.seed)
  const colors = activePalette(settings).colors.map((color) => new THREE.Color(color))
  const segments = 240
  const fullTurn = Math.PI * 2

  for (let ring = 0; ring < settings.rings; ring += 1) {
    const ringRadius = 1.7 + ring * 0.34
    const ringLift = (ring - settings.rings / 2) * 0.045

    for (let strand = 0; strand < settings.strands; strand += 1) {
      const phase = (strand / settings.strands) * fullTurn + random() * 0.35
      const material = new THREE.LineBasicMaterial({
        color: colors[(ring + strand) % colors.length],
        transparent: true,
        opacity: 0.42 + (strand / Math.max(settings.strands, 1)) * 0.25,
        blending: THREE.AdditiveBlending,
      })
      const points: THREE.Vector3[] = []

      for (let segment = 0; segment <= segments; segment += 1) {
        const progress = segment / segments
        const t = progress * fullTurn
        const braid = Math.sin(t * (settings.mode === 'halo' ? 2 : 3) + phase + ring * 0.28) * settings.twist
        const gyre = Math.cos(t * 2 + ring * 0.5) * settings.depth
        const radius = ringRadius + braid * (settings.mode === 'gyre' ? 0.58 : 0.34)
        const x = Math.cos(t + phase) * radius
        const z = Math.sin(t + phase) * (radius * (settings.mode === 'halo' ? 0.28 : 0.64) + gyre * 0.18)
        const y =
          Math.sin(t * settings.tilt + phase) * settings.depth +
          Math.cos(t * 4 + ring) * settings.twist * 0.14 +
          ringLift

        points.push(new THREE.Vector3(x, y, z))
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const line = new THREE.Line(geometry, material)
      line.userData.spin = (random() - 0.5) * 0.002
      group.add(line)
    }
  }

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshBasicMaterial({
      color: colors[1],
      wireframe: true,
      transparent: true,
      opacity: 0.54,
    }),
  )
  group.add(core)
  return group
}

type RangeControlProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

function RangeControl({ label, value, min, max, step, onChange, format }: RangeControlProps) {
  return (
    <label className="range-control">
      <span>
        {label}
        <strong>{format ? format(value) : value}</strong>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function App() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const settingsRef = useRef<WeaverSettings>(initialSettings)
  const [settings, setSettings] = useState<WeaverSettings>(initialSettings)
  const palette = useMemo(() => activePalette(settings), [settings])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    const container = mountRef.current
    if (!container) {
      return
    }

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x0b0b09, 12, 34)

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80)
    camera.position.set(0, 3.2, 13)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setClearColor(0x0b0b09, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const grid = new THREE.GridHelper(14, 28, 0x4c3b22, 0x2a241a)
    grid.position.y = -3
    grid.material.opacity = 0.18
    grid.material.transparent = true
    scene.add(grid)

    let signature = ''
    let orbitGroup = createOrbitGroup(settingsRef.current)
    scene.add(orbitGroup)

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    let frameId = 0
    const animate = (time: number) => {
      frameId = requestAnimationFrame(animate)
      const nextSettings = settingsRef.current
      const nextSignature = `${nextSettings.rings}-${nextSettings.strands}-${nextSettings.twist}-${nextSettings.depth}-${nextSettings.tilt}-${nextSettings.palette}-${nextSettings.mode}-${nextSettings.seed}`

      if (signature !== nextSignature) {
        signature = nextSignature
        scene.remove(orbitGroup)
        disposeGroup(orbitGroup)
        orbitGroup = createOrbitGroup(nextSettings)
        scene.add(orbitGroup)
      }

      const seconds = time * 0.001
      orbitGroup.rotation.y += nextSettings.speed * 0.002
      orbitGroup.rotation.x = Math.sin(seconds * 0.23) * 0.18
      orbitGroup.children.forEach((child, index) => {
        child.rotation.z += ((child.userData.spin as number | undefined) ?? 0.001) * nextSettings.speed
        child.position.y = Math.sin(seconds * 0.8 + index * 0.09) * 0.012
      })

      renderer.render(scene, camera)
    }

    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      scene.remove(orbitGroup)
      disposeGroup(orbitGroup)
      grid.geometry.dispose()
      grid.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      rendererRef.current = null
    }
  }, [])

  const updateSetting = <Key extends keyof WeaverSettings>(key: Key, value: WeaverSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const exportImage = () => {
    const renderer = rendererRef.current
    if (!renderer) {
      return
    }
    const link = document.createElement('a')
    link.href = renderer.domElement.toDataURL('image/png')
    link.download = `orbit-weaver-${settings.seed}.png`
    link.click()
  }

  return (
    <main className="weaver-shell">
      <section className="stage" ref={mountRef} aria-label="Animated Three.js orbit composer" />

      <aside className="control-panel" aria-label="Orbit controls">
        <div className="brand-row">
          <span aria-hidden="true">
            <Waves size={19} />
          </span>
          <div>
            <p>Orbit Weaver</p>
            <small>Kinetic line-system composer</small>
          </div>
        </div>

        <div className="mode-row" aria-label="Weave mode">
          {(['braid', 'gyre', 'halo'] as WeaveMode[]).map((mode) => (
            <button
              className={settings.mode === mode ? 'active' : ''}
              key={mode}
              onClick={() => updateSetting('mode', mode)}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>

        <section className="panel-section">
          <p className="section-label">Structure</p>
          <RangeControl label="Rings" value={settings.rings} min={3} max={18} step={1} onChange={(value) => updateSetting('rings', value)} />
          <RangeControl label="Strands" value={settings.strands} min={2} max={10} step={1} onChange={(value) => updateSetting('strands', value)} />
          <RangeControl label="Twist" value={settings.twist} min={0.05} max={1.5} step={0.01} onChange={(value) => updateSetting('twist', value)} format={(value) => value.toFixed(2)} />
          <RangeControl label="Depth" value={settings.depth} min={0.1} max={2.3} step={0.01} onChange={(value) => updateSetting('depth', value)} format={(value) => value.toFixed(2)} />
          <RangeControl label="Tilt" value={settings.tilt} min={0.2} max={1.6} step={0.01} onChange={(value) => updateSetting('tilt', value)} format={(value) => value.toFixed(2)} />
          <RangeControl label="Speed" value={settings.speed} min={0} max={1.6} step={0.01} onChange={(value) => updateSetting('speed', value)} format={(value) => value.toFixed(2)} />
        </section>

        <section className="panel-section">
          <p className="section-label">Palette</p>
          <div className="palette-list">
            {palettes.map((item) => (
              <button
                className={settings.palette === item.name ? 'palette active' : 'palette'}
                key={item.name}
                onClick={() => updateSetting('palette', item.name)}
                type="button"
              >
                <span>
                  {item.colors.map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                </span>
                {item.name}
              </button>
            ))}
          </div>
        </section>

        <div className="action-row">
          <button type="button" onClick={() => updateSetting('seed', Math.floor(Math.random() * 80000) + 12000)}>
            <Shuffle size={16} />
            Seed
          </button>
          <button type="button" onClick={() => setSettings(initialSettings)}>
            <RefreshCw size={16} />
            Reset
          </button>
          <button type="button" onClick={exportImage}>
            <Camera size={16} />
            PNG
          </button>
        </div>
      </aside>

      <div className="status-strip">
        <span>
          <SlidersHorizontal size={15} />
          {palette.name}
        </span>
        <strong>{settings.rings * settings.strands} paths</strong>
        <span>seed {settings.seed}</span>
      </div>
    </main>
  )
}

export default App
