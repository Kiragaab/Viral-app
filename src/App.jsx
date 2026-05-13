import { useState } from "react";

const COLORS = ["#FF3B30","#FF9500","#FFCC00","#34C759","#007AFF","#BF5AF2"];
const STEPS = ["REFERENCIA","ANALISE","ROTEIRO"];

function Tag({ children, color }) {
  return (
    <span style={{
      display:"inline-block",
      background:color+"18",
      border:"1px solid "+color+"33",
      color:color,
      fontSize:10,
      fontWeight:700,
      letterSpacing:"1.5px",
      padding:"3px 10px",
      borderRadius:3,
      textTransform:"uppercase",
    }}>{children}</span>
  );
}

function InfoBox({ label, value, accent }) {
  return (
    <div style={{
      background:"#0a0a0a",
      borderLeft:"3px solid "+(accent||"#333"),
      borderRadius:"0 6px 6px 0",
      padding:"12px 16px",
    }}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:accent||"#444",textTransform:"uppercase",marginBottom:5}}>{label}</div>
      <div style={{fontSize:13,color:"#ccc",lineHeight:1.6}}>{value}</div>
    </div>
  );
}

function Block({ label, content, i }) {
  const color = COLORS[i] || "#888";
  return (
    <div style={{
      borderLeft:"3px solid "+color,
      padding:"14px 18px",
      marginBottom:10,
      background:"#0a0a0a",
      borderRadius:"0 6px 6px 0",
    }}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:color,textTransform:"uppercase",marginBottom:7}}>{label}</div>
      <div style={{fontSize:14,lineHeight:1.75,color:"#ddd",whiteSpace:"pre-wrap"}}>{content}</div>
    </div>
  );
}

function Steps({ current }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:40}}>
      {STEPS.map(function(s,i) {
        return (
          <div key={s} style={{display:"flex",alignItems:"center"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
              <div style={{
                width:30,height:30,borderRadius:"50%",
                background:i<=current?"#FF3B30":"#111",
                border:"2px solid "+(i<=current?"#FF3B30":"#222"),
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:700,
                color:i<=current?"#fff":"#333",
              }}>
                {i < current ? "v" : i+1}
              </div>
              <span style={{fontSize:8,fontWeight:700,letterSpacing:"1.5px",color:i<=current?"#FF3B30":"#2a2a2a",textTransform:"uppercase"}}>{s}</span>
            </div>
            {i < STEPS.length-1 && (
              <div style={{width:56,height:1,background:i<current?"#FF3B30":"#1e1e1e",margin:"0 4px",marginBottom:18}}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" style={{animation:"spin 0.8s linear infinite",flexShrink:0}}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="#ffffff22" strokeWidth="2.5"/>
      <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [transcricao, setTrans] = useState("");
  const [nicho, setNicho] = useState("");
  const [objetivo, setObj] = useState("");
  const [estilo, setEstilo] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function callClaude(system, userMsg) {
    var res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    var raw = data.content.filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
    var match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Sem JSON");
    return JSON.parse(match[0]);
  }

  async function handleAnalyze() {
    if (!transcricao.trim()) { setError("Cole a transcricao ou descricao do video."); return; }
    setError(""); setLoading(true); setLoadMsg("Decodificando padroes virais...");
    var system = "Voce e um especialista em engenharia de conteudo viral para TikTok e Reels.\nAnalise o conteudo fornecido e extraia os padroes que fazem ele performar bem no algoritmo.\nRetorne APENAS JSON valido sem markdown.\n\nFormato:\n{\"hook_principal\":\"gancho e por que funciona\",\"tipo_hook\":\"curiosidade\",\"gatilhos\":[\"g1\",\"g2\",\"g3\"],\"estrutura_emocional\":\"como progride\",\"padrao_retencao\":\"o que mantem assistindo\",\"ritmo\":\"como ritmo funciona\",\"cta_estilo\":\"como cta converte\",\"por_que_viral\":\"motivo de alta performance\"}";
    var user = "Analise esse video viral:\n\n" + transcricao + "\n\nIdentifique o que faz esse conteudo performar bem.";
    try {
      var result = await callClaude(system, user);
      setAnalysis(result);
      setStep(1);
    } catch(e) {
      setError("Erro na analise. Tente novamente.");
      console.error(e);
    }
    setLoading(false);
  }

  async function handleGenerate() {
    if (!nicho || !objetivo) { setError("Preencha Nicho e Objetivo."); return; }
    setError(""); setLoading(true); setLoadMsg("Gerando roteiro...");
    var system = "Voce e um especialista em roteiros virais para TikTok e Reels.\nCrie um roteiro NOVO que replique a engenharia viral da referencia, adaptado ao nicho fornecido.\nEstrutura: HOOK, QUEBRA, DOR, SOLUCAO, PROVA, CTA.\nFrases curtas. Linguagem conversacional. Direcoes de camera: [CORTE RAPIDO] [ZOOM] [PAUSA].\nRetorne APENAS JSON valido sem markdown.\nFormato:{\"hook\":\"texto\",\"quebra\":\"texto\",\"dor\":\"texto\",\"solucao\":\"texto\",\"prova\":\"texto\",\"cta\":\"texto\",\"script_completo\":\"roteiro com direcoes\",\"por_que_vai_funcionar\":\"explicacao\"}";
    var user = "PADROES DA REFERENCIA:\n" + JSON.stringify(analysis) + "\n\nNICHO: " + nicho + "\nOBJETIVO: " + objetivo + "\nESTILO: " + (estilo||"Moderno e direto");
    try {
      var result = await callClaude(system, user);
      setScript(result);
      setStep(2);
    } catch(e) {
      setError("Erro ao gerar roteiro. Tente novamente.");
      console.error(e);
    }
    setLoading(false);
  }

  function reset() {
    setStep(0); setTrans(""); setNicho(""); setObj(""); setEstilo("");
    setAnalysis(null); setScript(null); setError("");
  }

  function handleCopy() {
    if (script && script.script_completo) {
      navigator.clipboard.writeText(script.script_completo);
      setCopied(true);
      setTimeout(function(){ setCopied(false); }, 2000);
    }
  }

  var scriptBlocks = script ? [
    { label:"HOOK", content:script.hook },
    { label:"QUEBRA DE PADRAO", content:script.quebra },
    { label:"DOR", content:script.dor },
    { label:"SOLUCAO", content:script.solucao },
    { label:"PROVA", content:script.prova },
    { label:"CTA", content:script.cta },
  ] : [];

  var inputSx = {
    width:"100%",background:"#080808",border:"1px solid #1e1e1e",
    borderRadius:6,color:"#f0f0f0",fontFamily:"Sora,sans-serif",
    fontSize:14,padding:"11px 14px",outline:"none",
  };

  function PrimaryBtn(props) {
    return (
      <button onClick={props.onClick} disabled={props.disabled} style={{
        width:"100%",background:props.disabled?"#1a0808":"#FF3B30",border:"none",
        borderRadius:7,color:"#fff",fontFamily:"Bebas Neue,sans-serif",
        fontSize:20,letterSpacing:3,padding:"16px",
        cursor:props.disabled?"not-allowed":"pointer",
        opacity:props.disabled?0.6:1,
        display:"flex",alignItems:"center",justifyContent:"center",gap:10,
      }}>
        {props.children}
      </button>
    );
  }

  return (
    <div>
      <style>{"\n@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Sora:wght@400;500;600;700&display=swap');\n*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}\nbody{background:#080808;color:#f0f0f0;font-family:Sora,sans-serif;min-height:100vh;}\n@keyframes spin{to{transform:rotate(360deg);}}\n@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}\n@keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}\ntextarea{resize:vertical;}\n"}</style>

      <div style={{maxWidth:680,margin:"0 auto",padding:"40px 20px 100px"}}>

        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#FF3B3011",border:"1px solid #FF3B3030",borderRadius:4,padding:"5px 14px",marginBottom:18}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#FF3B30",animation:"pulse 1.5s infinite"}}/>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:"#FF3B30",textTransform:"uppercase"}}>Engenharia Viral</span>
          </div>
          <h1 style={{fontFamily:"Bebas Neue,sans-serif",fontSize:"clamp(50px,10vw,82px)",lineHeight:0.9,letterSpacing:2,marginBottom:14}}>
            <span style={{color:"#fff"}}>CLONE O</span><br/>
            <span style={{color:"#FF3B30"}}>ALGORITMO</span>
          </h1>
          <p style={{color:"#444",fontSize:14,lineHeight:1.7,maxWidth:360,margin:"0 auto"}}>
            Cole a transcricao de um video viral. A IA decodifica a engenharia e gera um roteiro novo.
          </p>
        </div>

        <Steps current={step}/>

        {step === 0 && (
          <div>
            <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{background:"#FF3B30",borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>1</div>
                <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:18,letterSpacing:1}}>TRANSCRICAO DO VIDEO VIRAL</span>
              </div>
              <div style={{background:"#0a0a0a",border:"1px solid #181818",borderRadius:6,padding:"12px 16px",marginBottom:16}}>
                <p style={{fontSize:12,color:"#555",lineHeight:1.8}}>
                  Como pegar a transcricao:<br/>
                  TikTok: compartilhar, Transcricao. Ou use downsub.com<br/>
                  YouTube: clique em ... abaixo do video, Transcricao<br/>
                  Sem transcricao? Descreva o video: gancho, estrutura, CTA.
                </p>
              </div>
              <textarea
                rows={8}
                value={transcricao}
                onChange={function(e){setTrans(e.target.value);}}
                placeholder="Cole a transcricao ou descreva o video..."
                style={Object.assign({},inputSx,{lineHeight:1.7,fontSize:13})}
              />
              {error && <p style={{color:"#FF3B30",fontSize:13,marginTop:10,textAlign:"center"}}>{error}</p>}
            </div>
            <PrimaryBtn onClick={handleAnalyze} disabled={loading}>
              {loading ? [<Spinner key="s"/>, loadMsg] : "DECODIFICAR PADROES VIRAIS"}
            </PrimaryBtn>
          </div>
        )}

        {step >= 1 && analysis && (
          <div>
            <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{background:"#34C759",borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>v</div>
                  <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:18,letterSpacing:1}}>PADROES IDENTIFICADOS</span>
                </div>
                <Tag color="#FF9500">{analysis.tipo_hook}</Tag>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <InfoBox label="Hook principal" value={analysis.hook_principal} accent="#FF3B30"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <InfoBox label="Retencao" value={analysis.padrao_retencao} accent="#007AFF"/>
                  <InfoBox label="Ritmo" value={analysis.ritmo} accent="#FF9500"/>
                </div>
                <div style={{background:"#0a0a0a",borderRadius:6,padding:"12px 16px"}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:"#333",textTransform:"uppercase",marginBottom:8}}>Gatilhos</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {analysis.gatilhos && analysis.gatilhos.map(function(g,i){return <Tag key={i} color={COLORS[i%6]}>{g}</Tag>;})}
                  </div>
                </div>
                <div style={{background:"#08060a",border:"1px solid #BF5AF218",borderRadius:6,padding:"12px 16px"}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:"#BF5AF2",textTransform:"uppercase",marginBottom:5}}>Por que e viral</div>
                  <p style={{fontSize:13,color:"#bbb",lineHeight:1.65}}>{analysis.por_que_viral}</p>
                </div>
              </div>
            </div>

            {step === 1 && (
              <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{background:"#FF3B30",borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>2</div>
                  <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:18,letterSpacing:1}}>SEU NICHO E OBJETIVO</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",color:"#3a3a3a",textTransform:"uppercase",display:"block",marginBottom:7}}>Nicho *</label>
                    <input value={nicho} onChange={function(e){setNicho(e.target.value);}} placeholder="Ex: Academia..." style={inputSx}/>
                  </div>
                  <div>
                    <label style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",color:"#3a3a3a",textTransform:"uppercase",display:"block",marginBottom:7}}>Objetivo *</label>
                    <input value={objetivo} onChange={function(e){setObj(e.target.value);}} placeholder="Ex: Captar clientes..." style={inputSx}/>
                  </div>
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",color:"#3a3a3a",textTransform:"uppercase",display:"block",marginBottom:7}}>Estilo</label>
                  <input value={estilo} onChange={function(e){setEstilo(e.target.value);}} placeholder="Ex: Agressivo e direto..." style={inputSx}/>
                </div>
                {error && <p style={{color:"#FF3B30",fontSize:13,textAlign:"center",marginBottom:12}}>{error}</p>}
                <PrimaryBtn onClick={handleGenerate} disabled={loading}>
                  {loading ? [<Spinner key="s"/>, loadMsg] : "GERAR ROTEIRO COM ESSA ENGENHARIA"}
                </PrimaryBtn>
              </div>
            )}
          </div>
        )}

        {step >= 2 && script && (
          <div>
            <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                <div style={{background:"#BF5AF2",borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>*</div>
                <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:18,letterSpacing:1}}>ROTEIRO GERADO</span>
              </div>
              {scriptBlocks.map(function(b,i){return <Block key={b.label} label={b.label} content={b.content} i={i}/>;}) }
            </div>

            <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
              <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:15,letterSpacing:1,color:"#555",marginBottom:12}}>ROTEIRO COMPLETO</div>
              <div style={{background:"#080808",border:"1px solid #181818",borderRadius:6,padding:18,fontSize:13,lineHeight:1.9,color:"#bbb",whiteSpace:"pre-wrap",maxHeight:300,overflowY:"auto",marginBottom:14}}>
                {script.script_completo}
              </div>
              <div style={{background:"#050a05",border:"1px solid #34C75918",borderRadius:6,padding:"12px 16px",marginBottom:16}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:"#34C759",textTransform:"uppercase",marginBottom:5}}>Por que vai funcionar</div>
                <p style={{fontSize:13,color:"#bbb",lineHeight:1.65}}>{script.por_que_vai_funcionar}</p>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={handleCopy} style={{
                  flex:1,
                  background:copied?"#0a1a0a":"#1a1a1a",
                  border:"1px solid "+(copied?"#34C759":"#252525"),
                  color:copied?"#34C759":"#f0f0f0",
                  fontFamily:"Sora,sans-serif",fontSize:13,fontWeight:600,
                  padding:"12px",borderRadius:6,cursor:"pointer",
                }}>
                  {copied ? "Copiado!" : "Copiar roteiro"}
                </button>
                <button onClick={reset} style={{
                  background:"none",border:"1px solid #1e1e1e",color:"#3a3a3a",
                  fontFamily:"Sora,sans-serif",fontSize:13,
                  padding:"12px 20px",borderRadius:6,cursor:"pointer",
                }}>
                  Novo video
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
