import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import { Search, Shield, RotateCcw, BookOpen, Brain, Truck, X, Info } from "lucide-react";

type Compartment = { id: string; name: string; position: [number, number, number]; side: "left" | "right"; };
const compartments: Compartment[] = [
  { id: "g1", name: "Geräteraum 1", position: [-1.15, 1.12, 0.66], side: "left" },
  { id: "g2", name: "Geräteraum 2", position: [-0.35, 1.12, 0.66], side: "left" },
  { id: "g3", name: "Geräteraum 3", position: [0.45, 1.12, 0.66], side: "left" },
  { id: "g4", name: "Geräteraum 4", position: [-1.15, 1.12, -0.66], side: "right" },
  { id: "g5", name: "Geräteraum 5", position: [-0.35, 1.12, -0.66], side: "right" },
  { id: "g6", name: "Geräteraum 6", position: [0.45, 1.12, -0.66], side: "right" }
];

function TruckModel({ opened, onToggle, onCabin }: { opened: string[]; onToggle: (id: string) => void; onCabin: () => void }) {
  return <>
    {/* Schematisches Platzhaltermodell: Maße/Details vor Abgleich mit Referenzfotos nicht originalgetreu. */}
    <mesh position={[0, 0.72, 0]} castShadow>
      <boxGeometry args={[3.35, 0.95, 1.38]} />
      <meshStandardMaterial color="#f2f2ed" roughness={0.65} />
    </mesh>
    <mesh position={[1.48, 1.02, 0]} castShadow>
      <boxGeometry args={[1.05, 1.35, 1.34]} />
      <meshStandardMaterial color="#c82026" roughness={0.6} />
    </mesh>
    <mesh position={[1.47, 1.35, 0]} castShadow>
      <boxGeometry args={[0.72, 0.55, 1.36]} />
      <meshStandardMaterial color="#d8e8ee" metalness={0.1} roughness={0.25} />
    </mesh>
    <mesh position={[-0.4, 1.42, 0]} castShadow>
      <boxGeometry args={[1.9, 0.12, 1.42]} />
      <meshStandardMaterial color="#c82026" />
    </mesh>
    {[-1.08, 1.05].map((x) => [-0.72, 0.72].map((z) =>
      <group key={`${x}-${z}`} position={[x, 0.37, z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.16, 24]} />
          <meshStandardMaterial color="#242424" roughness={0.9} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.17, 20]} />
          <meshStandardMaterial color="#b7b7b7" metalness={0.65} roughness={0.35} />
        </mesh>
      </group>
    ))}
    {compartments.map((c) => {
      const isOpen = opened.includes(c.id);
      return <group key={c.id} position={c.position}>
        <mesh onClick={(e) => { e.stopPropagation(); onToggle(c.id); }} castShadow>
          <boxGeometry args={[0.72, 0.66, 0.045]} />
          <meshStandardMaterial color={isOpen ? "#ef4444" : "#d8dadd"} metalness={0.35} roughness={0.38} emissive={isOpen ? "#5f1010" : "#000000"} />
        </mesh>
        <mesh position={[0, 0, c.side === "left" ? 0.03 : -0.03]} onClick={(e) => { e.stopPropagation(); onToggle(c.id); }}>
          <boxGeometry args={[0.11, 0.035, 0.055]} />
          <meshStandardMaterial color="#444" metalness={0.7} />
        </mesh>
        {isOpen && <group position={[0, 0, c.side === "left" ? 0.12 : -0.12]}>
          <mesh><boxGeometry args={[0.62, 0.52, 0.08]} /><meshStandardMaterial color="#343a40" /></mesh>
          {[0, 1, 2].map((i) => <mesh key={i} position={[-0.18 + i * 0.18, -0.08, c.side === "left" ? 0.06 : -0.06]}>
            <boxGeometry args={[0.12, 0.22, 0.12]} /><meshStandardMaterial color={["#d9d9d9", "#e6c84f", "#b8c4cb"][i]} />
          </mesh>)}
          <Html distanceFactor={7} position={[0, 0.48, 0]}>
            <div className="scene-label">{c.name} · geöffnet</div>
          </Html>
        </group>}
      </group>;
    })}
    <mesh position={[1.46, 0.94, 0.72]} onClick={(e) => { e.stopPropagation(); onCabin(); }}>
      <boxGeometry args={[0.62, 0.65, 0.05]} />
      <meshStandardMaterial color="#e6e8eb" transparent opacity={0.8} />
    </mesh>
    <Html position={[1.5, 1.95, 0]} center distanceFactor={8}>
      <div className="scene-hint">Modell-Platzhalter</div>
    </Html>
  </>;
}

export default function App() {
  const [opened, setOpened] = useState<string[]>([]);
  const [selected, setSelected] = useState<Compartment | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"explore" | "learn" | "quiz">("explore");
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [invite, setInvite] = useState("");
  const [access, setAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  const results = useMemo(() => compartments.filter(c => c.name.toLowerCase().includes(search.toLowerCase())), [search]);
  const toggleCompartment = (id: string) => {
    setOpened(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setSelected(compartments.find(c => c.id === id) ?? null);
  };
  async function checkInvite() {
    setAccessMessage("Prüfe Einladungscode …");
    try {
      const response = await fetch("/api/access/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: invite }) });
      const data = await response.json();
      setAccess(Boolean(data.valid));
      setAccessMessage(data.valid ? "Zugang freigegeben." : "Der Code ist ungültig oder deaktiviert.");
    } catch {
      setAccessMessage("Backend nicht erreichbar. Starte das Projekt lokal mit npm run dev.");
    }
  }

  if (!access) return <main className="gate">
    <div className="gate-card">
      <div className="brand-mark"><Truck size={30} /></div>
      <p className="eyebrow">JUGENDFEUERWEHR HARSEWINKEL</p>
      <h1>LF 10 entdecken.</h1>
      <p className="muted">Gib deinen Einladungscode ein, um den Lernbereich zu öffnen.</p>
      <form onSubmit={e => { e.preventDefault(); void checkInvite(); }}>
        <label htmlFor="invite">Einladungscode</label>
        <input id="invite" value={invite} onChange={e => setInvite(e.target.value)} placeholder="Code eingeben" autoComplete="off" required />
        <button className="primary full" type="submit">Zugang prüfen</button>
      </form>
      {accessMessage && <p className="feedback">{accessMessage}</p>}
      <p className="small muted">Lokaler Entwicklungsstand – ein Admin muss Codes im Backend anlegen.</p>
    </div>
  </main>;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark small-mark"><Truck size={22}/></div><div><strong>LF 10</strong><span>Jugendfeuerwehr Harsewinkel</span></div></div>
      <nav><button className={mode === "explore" ? "nav-active" : ""} onClick={() => setMode("explore")}>Erkunden</button><button className={mode === "learn" ? "nav-active" : ""} onClick={() => setMode("learn")}><BookOpen size={16}/> Lernen</button><button className={mode === "quiz" ? "nav-active" : ""} onClick={() => {setMode("quiz");setQuizAnswer(null);}}><Brain size={16}/> Quiz</button></nav>
      <button className="admin-button" onClick={() => setShowAdmin(true)}><Shield size={16}/> Admin</button>
    </header>

    <main className="main-content">
      <section className="intro">
        <div><p className="eyebrow">FAHRZEUGKUNDE · INTERAKTIV</p><h1>Entdecke unser LF 10.</h1><p className="muted">Erkunde Fahrzeugbereiche und lerne die Ausrüstung kennen.</p></div>
        <div className="notice"><Info size={18}/><span>Das 3D-Modell ist derzeit ein schematischer Platzhalter und noch nicht anhand der Fahrzeugfotos modelliert.</span></div>
      </section>

      <section className="workspace">
        <div className="viewer-card">
          <div className="viewer-head"><div><span className="live-dot"></span><strong>3D-Fahrzeugansicht</strong><span className="subtle"> · drehen & zoomen</span></div><button className="icon-button" title="Ansicht zurücksetzen" onClick={() => window.location.reload()}><RotateCcw size={17}/></button></div>
          <div className="canvas-wrap">
            <Canvas camera={{ position: [4.8, 3.2, 5.5], fov: 42 }} shadows>
              <color attach="background" args={["#f4f5f7"]}/>
              <ambientLight intensity={1.5}/>
              <directionalLight position={[5, 8, 5]} intensity={2} castShadow/>
              <Environment preset="city"/>
              <gridHelper args={[10, 20, "#d3d7dc", "#e4e7eb"]} position={[0, 0.01, 0]}/>
              <TruckModel opened={opened} onToggle={toggleCompartment} onCabin={() => setShowInfo(true)}/>
              <OrbitControls makeDefault minDistance={3.5} maxDistance={11} target={[0, 0.8, 0]} enableDamping/>
            </Canvas>
            <div className="canvas-tip">Mit Maus oder Touch drehen · scrollen oder pinchen zum Zoomen</div>
          </div>
          <div className="viewer-footer"><span><i className="legend-swatch"></i> Anklickbare Rollläden</span><span>{opened.length} geöffnet</span></div>
        </div>

        <aside className="side-panel">
          <div className="panel-heading"><div><p className="eyebrow">NAVIGATION</p><h2>Fahrzeugbereiche</h2></div></div>
          <div className="searchbox"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Geräteraum suchen …"/></div>
          <div className="compartment-list">
            {results.map(c => <button key={c.id} className={`compartment-row ${selected?.id === c.id ? "selected" : ""}`} onClick={() => toggleCompartment(c.id)}><span className="compartment-icon">▤</span><span className="row-text"><strong>{c.name}</strong><small>{opened.includes(c.id) ? "Geöffnet – antippen zum Schließen" : "Antippen zum Öffnen"}</small></span><span className={`status ${opened.includes(c.id) ? "status-open" : ""}`}></span></button>)}
            {results.length === 0 && <p className="empty">Keine passenden Bereiche gefunden.</p>}
          </div>
          {selected && <div className="detail-card"><div className="detail-title"><h3>{selected.name}</h3><button className="icon-button" onClick={() => setSelected(null)}><X size={16}/></button></div><p className="muted">Ausstattungsdaten sind noch nicht anhand der Referenzfotos bestätigt.</p><p className="detail-label">Ausrüstung</p><p className="small">Noch nicht eingetragen</p><button className="secondary full" onClick={() => toggleCompartment(selected.id)}>{opened.includes(selected.id) ? "Geräteraum schließen" : "Geräteraum öffnen"}</button></div>}
        </aside>
      </section>

      {mode === "learn" && <section className="mode-card"><p className="eyebrow">LERNMODUS</p><h2>Fahrzeugkunde Schritt für Schritt</h2><p className="muted">Wähle rechts einen Geräteraum aus. Namen, Funktionen und Lagerorte werden ergänzt, sobald sie anhand der Referenzbilder bestätigt sind.</p><button className="secondary" onClick={() => setMode("explore")}>Zurück zum Erkunden</button></section>}
      {mode === "quiz" && <section className="mode-card"><p className="eyebrow">QUIZ</p><h2>Welcher Bereich ist ausgewählt?</h2><p className="muted">Dies ist eine Platzhalterfrage. Ein echtes Quiz wird erst mit bestätigten Fahrzeug- und Ausrüstungsdaten aktiviert.</p><div className="quiz-options">{["Geräteraum", "Mannschaftskabine", "Noch nicht festgelegt"].map(a => <button key={a} className={quizAnswer === a ? "selected" : ""} onClick={() => setQuizAnswer(a)}>{a}</button>)}</div>{quizAnswer && <p className="feedback">Quiz-Demo: Fragen und Antworten müssen noch mit echten Fahrzeugdaten hinterlegt werden.</p>}</section>}
      <footer>Ein Lernwerkzeug für die Jugendfeuerwehr · ersetzt keine praktische Einweisung durch Ausbilder.</footer>
    </main>

    {showAdmin && <div className="modal-backdrop" onClick={() => setShowAdmin(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => setShowAdmin(false)}><X/></button><p className="eyebrow">GESCHÜTZTER BEREICH</p><h2>Admin-Anmeldung</h2><p className="muted">Die Admin-Verwaltung ist im Grundgerüst noch nicht mit einem Anmeldeformular verbunden. Bitte nicht als produktionsfertig einsetzen.</p><button className="primary full" onClick={() => setShowAdmin(false)}>Schließen</button></div></div>}
    {showInfo && <div className="modal-backdrop" onClick={() => setShowInfo(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => setShowInfo(false)}><X/></button><p className="eyebrow">MANNSCHAFTSKABINE</p><h2>Kabine – noch in Arbeit</h2><p className="muted">Die Innenausstattung und Stauräume unter den Sitzen werden erst nach Sichtung der echten Referenzfotos modelliert.</p><button className="primary full" onClick={() => setShowInfo(false)}>Verstanden</button></div></div>}
  </div>;
}