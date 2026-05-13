import { useState } from "react";

const STRUCTURE_COLORS = ["#FF3B30","#FF9500","#FFCC00","#34C759","#007AFF","#BF5AF2"];
const STEPS = ["REFERÊNCIA","ANÁLISE","ROTEIRO"];

function Tag({ children, color }) {
  return (
    <span style={{
      display:"inline-block", background:color+"18",
      border:`1px solid ${color}33`, color, fontSize:10,
      fontWeight:700, letterSpacing:"1.5px", padding:"3px 10px",
      borderRadius:3, textTransform:"uppercase",
    }}>{children}</span>
  );
}

function InfoBox({ label, value, accent }) {
  return (
    <div style={{
      background:"#0a0a0a", borderLeft:`3px solid ${accent||"#333"}`,
      borderRadius:"0 6px 6px 0", padding:"12px 16px",
    }}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:accent||"#444",textTransform:"uppercase",marginBottom:5}}>{label}</div>
      <div style={{fontSize:13,color:"#ccc",lineHeight:1.6}}>{value}</div>
    </div>
  );
}

function ScriptBlock({ label, content, i }) {
  const color = STRUCTURE_COLORS[i] || "#888";
  return (
    <div style={{
      borderLeft:`3px solid ${color}`, padding:"14px 18px", marginBottom:10,
      background:"#0a0a0a", borderRadius:"0 6px 6px 0",
      animation:`fadeUp 0.35s ${i*0.06}s ease both`,
    }}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color,textTransform:"uppercase",marginBottom:7}}>{label}</div>
      <div style={{fontSize:14,lineHeight:1.75,color:"#ddd",whiteSpace:"pre-wrap"}}>{content}</div>
    </div>
  );
}

function Steps({ current }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:40}}>
      {STEPS.map((s,i) => (
        <div key={s} style={{display:"flex",alignItems:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
            <div style={{
              width:30,height:30,borderRadius:"50%",
              background:i<=current?"#FF3B30":"#111",
              border:`2px solid ${i<=current?"#FF3B30":"#222"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:700,
              color:i<=current?"#fff":"#333",
              transition:"all 0.3s",
            }}>
              {i < current ? "✓" : i+1}
            </div>
            <span style={{fontSize:8,fontWeight:700,letterSpacing:"1.5px",color:i<=current?"#FF3B30":"#2a2a2a",textTransform:"uppercase"}}>{s}</span>
          </div>
          {i < STEPS.length-1 && (
            <div style={{width:56,height:1,background:i<current?"#FF3B30":"#1e1e1e",margin:"0 4px",marginBottom:18,transition:"all 0.3s"}}/>
          )}
        </div>
      ))}
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
  const [step, setStep]         = useState(0);
  const [transcricao, setTrans] = useState("");
  const [nicho, setNicho]       = useState("");
  const [objetivo, setObj]      = useState("");
  const [estilo, setEstilo]     = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [script, setScript]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState("");
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);

  // Chama nosso backend seguro no Netlify — a API key fica só no servidor
  const callClaude = async (system, userMsg) => {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));

    const raw = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Sem JSON na resposta");
    return JSON.parse(match[0]);
  };

  const handleAnalyze = async () => {
    if (!transcricao.trim()) { setError("Cole a transcrição ou descrição do vídeo."); return; }
    setError(""); setLoading(true); setLoadMsg("Decodificando padrões virais...");

    const system = `Você é um especialista em engenharia de conteúdo viral para TikTok e Reels.
Analise o conteúdo fornecido e extraia os padrões que fazem ele performar bem no algoritmo.
Retorne APENAS JSON válido — sem markdown, sem texto fora do JSON.

Formato exato:
{
  "hook_principal": "qual é o gancho de abertura e por que funciona",
  "tipo_hook": "uma palavra: curiosidade | dor | provocação | promessa | autoridade | controvérsia",
  "gatilhos": ["gatilho 1","gatilho 2","gatilho 3"],
  "estrutura_emocional": "como a narrativa emocional progride do início ao fim",
  "padrao_retencao": "o que mantém o espectador assistindo segundo a segundo",
  "ritmo": "como o ritmo, cortes e pausas funcionam",
  "cta_estilo": "como o CTA é posicionado e por que converte",
  "por_que_viral": "análise direta do motivo de alta performance no algoritmo"
}`;

    const user = `Analise esse vídeo viral e extraia os padrões de engenharia:

CONTEÚDO / TRANSCRIÇÃO:
${transcricao}

Identifique o que faz esse conteúdo performar bem no algoritmo.`;

    try {
      const result = await callClaude(system, user);
      setAnalysis(result);
      setStep(1);
    } catch(e) {
      setError("Erro na análise. Verifique se a transcrição está legível e tente novamente.");
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!nicho || !objetivo) { setError("Preencha Nicho e Objetivo."); return; }
    setError(""); setLoading(true); setLoadMsg("Engenhando seu roteiro...");

    const system = `Você é um especialista em roteiros virais para TikTok e Reels.

MISSÃO: Criar um roteiro NOVO que replique a engenharia viral do vídeo de referência, adaptado ao nicho e objetivo fornecidos. Não copie o conteúdo — replique a ESTRUTURA e os GATILHOS.

REGRAS:
- Estrutura: HOOK → QUEBRA DE PADRÃO → DOR → SOLUÇÃO → PROVA → CTA
- Frases CURTAS. Impacto imediato. Linguagem 100% conversacional.
- Direções de câmera: [CORTE RÁPIDO] [ZOOM] [PAUSA] [CLOSE] [TEXTO NA TELA]
- A cada 3-5 segundos: nova informação, quebra de padrão ou tensão crescente
- NUNCA soe corporativo, formal ou robótico
- Retorne APENAS JSON válido, sem markdown

Formato:
{
  "hook": "texto do hook",
  "quebra": "texto da quebra de padrão",
  "dor": "texto da dor",
  "solucao": "texto da solução",
  "prova": "texto da prova",
  "cta": "texto do CTA",
  "script_completo": "roteiro completo com todas as direções de câmera intercaladas",
  "por_que_vai_funcionar": "como esse roteiro replica a engenharia viral identificada"
}`;

    const user = `PADRÕES VIRAIS DA REFERÊNCIA:
${JSON.stringify(analysis, null, 2)}

CRIE O ROTEIRO PARA:
NICHO: ${nicho}
OBJETIVO: ${objetivo}
ESTILO: ${estilo || "Moderno e direto"}

Use os mesmos gatilhos e estrutura emocional — conteúdo 100% original.`;

    try {
      const result = await callClaude(system, user);
      setScript(result);
      setStep(2);
    } catch(e) {
      setError("Erro ao gerar roteiro. Tente novamente.");
      console.error(e);
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep(0); setTrans(""); setNicho(""); setObj(""); setEstilo("");
    setAnalysis(null); setScript(null); setError("");
  };

  const handleCopy = () => {
    if (script?.script_completo) {
      navigator.clipboard.writeText(script.script_completo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const scriptBlocks = script ? [
    { label:"HOOK",             content:script.hook },
    { label:"QUEBRA DE PADRÃO", content:script.quebra },
    { label:"DOR",              content:script.dor },
    { label:"SOLUÇÃO",          content:script.solucao },
    { label:"PROVA",            content:script.prova },
    { label:"CTA",              content:script.cta },
  ] : [];

  const inputSx = {
    width:"100%", background:"#080808", border:"1px solid #1e1e1e",
    borderRadius:6, color:"#f0f0f0", fontFamily:"'Sora',sans-serif",
    fontSize:14, padding:"11px 14px", outline:"none", transition:"border-color 0.2s",
  };

  const primaryBtn = (onClick, disabled, children) => (
    <button onClick={onClick} disabled={disabled} style={{
      width:"100%", background:disabled?"#1a0808":"#FF3B30", border:"none",
      borderRadius:7, color:"#fff", fontFamily:"'Bebas Neue',sans-serif",
      fontSize:20, letterSpacing:3, padding:"16px",
      cursor:disabled?"not-allowed":"pointer", transition:"all 0.2s",
      opacity:disabled?0.6:1, display:"flex", alignItems:"center",
      justifyContent:"center", gap:10,
    }}>
      {children}
    </button>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Sora:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#080808;color:#f0f0f0;font-family:'Sora',sans-serif;min-height:100vh;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#080808;}
        ::-webkit-scrollbar-thumb{background:#1e1e1e;border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
        input:focus,textarea:focus{border-color:#FF3B30 !important;}
        textarea{resize:vertical;}
      `}</style>

      <div style={{maxWidth:680,margin:"0 auto",padding:"40px 20px 100px"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{
            display:"inline-flex",alignItems:"center",gap:8,
            background:"#FF3B3011",border:"1px solid #FF3B3030",
            borderRadius:4,padding:"5px 14px",marginBottom:18,
          }}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#FF3B30",animation:"pulse 1.5s infinite"}}/>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:"#FF3B30",textTransform:"uppercase"}}>Engenharia Viral · IA</span>
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(50px,10vw,82px)",lineHeight:0.9,letterSpacing:2,marginBottom:14}}>
            <span style={{color:"#fff"}}>CLONE O</span><br/>
            <span style={{color:"transparent",WebkitTextStroke:"2px #FF3B30"}}>ALGORITMO</span>
          </h1>
          <p style={{color:"#444",fontSize:14,lineHeight:1.7,maxWidth:360,margin:"0 auto"}}>
            Cole a transcrição de um vídeo viral. A IA decodifica a engenharia e gera um roteiro novo — mesmos gatilhos, conteúdo original.
          </p>
        </div>

        <Steps current={step}/>

        {/* STEP 0 */}
        {step === 0 && (
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{background:"#FF3B30",borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>1</div>
                <span style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:1}}>TRANSCRIÇÃO DO VÍDEO VIRAL</span>
              </div>

              <div style={{background:"#0a0a0a",border:"1px solid #181818",borderRadius:6,padding:"12px 16px",marginBottom:16}}>
                <p style={{fontSize:12,color:"#3a3a3a",lineHeight:1.8}}>
                  <span style={{color:"#FF9500",fontWeight:600}}>Como pegar a transcrição:</span><br/>
                  <span style={{color:"#555"}}>• TikTok → compartilhar → "Transcrição" · ou use </span><span style={{color:"#FF3B30"}}>downsub.com</span><br/>
                  <span style={{color:"#555"}}>• Instagram → ative as legendas e copie o texto</span><br/>
                  <span style={{color:"#555"}}>• YouTube → clique em "…" abaixo do vídeo → "Transcrição"</span><br/>
                  <span style={{color:"#555"}}>• Sem transcrição? Descreva o que o vídeo faz: gancho, estrutura, CTA.</span>
                </p>
              </div>

              <textarea
                rows={8}
                value={transcricao}
                onChange={e => setTrans(e.target.value)}
                placeholder={"Cole a transcrição ou descreva o vídeo...\n\nEx: Abre com 'Você tá jogando dinheiro fora todo mês e nem sabe.' Corte rápido, zoom no rosto. Fala sobre o erro mais comum em finanças pessoais. Termina com CTA direto para planilha gratuita."}
                style={{...inputSx, lineHeight:1.7, fontSize:13}}
              />

              {error && <p style={{color:"#FF3B30",fontSize:13,marginTop:10,textAlign:"center"}}>{error}</p>}
            </div>

            {primaryBtn(handleAnalyze, loading,
              loading ? <><Spinner/>{loadMsg}</> : "🔍 DECODIFICAR PADRÕES VIRAIS"
            )}
          </div>
        )}

        {/* STEP 1 */}
        {step >= 1 && analysis && (
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{background:"#34C759",borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>✓</div>
                  <span style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:1}}>PADRÕES IDENTIFICADOS</span>
                </div>
                <Tag color="#FF9500">{analysis.tipo_hook}</Tag>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <InfoBox label="Hook principal" value={analysis.hook_principal} accent="#FF3B30"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <InfoBox label="Padrão de retenção" value={analysis.padrao_retencao} accent="#007AFF"/>
                  <InfoBox label="Ritmo & cortes" value={analysis.ritmo} accent="#FF9500"/>
                </div>
                <div style={{background:"#0a0a0a",borderRadius:6,padding:"12px 16px"}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:"#333",textTransform:"uppercase",marginBottom:8}}>Gatilhos detectados</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {analysis.gatilhos?.map((g,i) => <Tag key={i} color={STRUCTURE_COLORS[i%6]}>{g}</Tag>)}
                  </div>
                </div>
                <div style={{background:"#08060a",border:"1px solid #BF5AF218",borderRadius:6,padding:"12px 16px"}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:"#BF5AF2",textTransform:"uppercase",marginBottom:5}}>Por que é viral</div>
                  <p style={{fontSize:13,color:"#bbb",lineHeight:1.65}}>{analysis.por_que_viral}</p>
                </div>
              </div>
            </div>

            {step === 1 && (
              <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{background:"#FF3B30",borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>2</div>
                  <span style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:1}}>SEU NICHO E OBJETIVO</span>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  {[
                    {label:"Nicho *",ph:"Ex: Academia, Finanças...",val:nicho,set:setNicho},
                    {label:"Objetivo *",ph:"Ex: Captar clientes...",val:objetivo,set:setObj},
                  ].map((f,i) => (
                    <div key={i}>
                      <label style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",color:"#3a3a3a",textTransform:"uppercase",display:"block",marginBottom:7}}>{f.label}</label>
                      <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={inputSx}/>
                    </div>
                  ))}
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",color:"#3a3a3a",textTransform:"uppercase",display:"block",marginBottom:7}}>Estilo / Tom</label>
                  <input value={estilo} onChange={e=>setEstilo(e.target.value)} placeholder="Ex: Agressivo e direto, Educativo com urgência..." style={inputSx}/>
                </div>

                {error && <p style={{color:"#FF3B30",fontSize:13,textAlign:"center",marginBottom:12}}>{error}</p>}

                {primaryBtn(handleGenerate, loading,
                  loading ? <><Spinner/>{loadMsg}</> : "⚡ GERAR ROTEIRO COM ESSA ENGENHARIA"
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2 */}
        {step >= 2 && script && (
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                <div style={{background:"#BF5AF2",borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>✦</div>
                <span style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:1}}>ROTEIRO GERADO</span>
              </div>
              {scriptBlocks.map((b,i) => <ScriptBlock key={b.label} label={b.label} content={b.content} i={i}/>)}
            </div>

            <div style={{background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,padding:28,marginBottom:14}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:15,letterSpacing:1,color:"#555",marginBottom:12}}>ROTEIRO COMPLETO</div>
              <div style={{
                background:"#080808",border:"1px solid #181818",borderRadius:6,
                padding:18,fontSize:13,lineHeight:1.9,color:"#bbb",
                whiteSpace:"pre-wrap",maxHeight:300,overflowY:"auto",marginBottom:14,
              }}>
                {script.script_completo}
              </div>

              <div style={{background:"#050a05",border:"1px solid #34C75918",borderRadius:6,padding:"12px 16px",marginBottom:16}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",color:"#34C759",textTransform:"uppercase",marginBottom:5}}>Por que vai funcionar</div>
                <p style={{fontSize:13,color:"#bbb",lineHeight:1.65}}>{script.por_que_vai_funcionar}</p>
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={handleCopy} style={{
                  flex:1,background:copied?"#0a1a0a":"#1a1a1a",
                  border:`1px sol
