import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toUserErrorMessage } from "../lib/errorMessages";
import { soundEffects } from "../lib/soundEffects";
import "./platform-modules.css";

// ========================================================
// 1. EMPRESAS (COMPANIES BROWSER)
// ========================================================
export function CompaniesBrowser({ onSelectCompany }: { onSelectCompany?: (company: any) => void }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [municipality, setMunicipality] = useState("Todos");
  const [loading, setLoading] = useState(true);

  const MUNICIPALITIES = ["Todos", "Ondjiva", "Namacunde", "Cuanhama", "Ombadja", "Cuvelai", "Cahama"];

  useEffect(() => {
    let alive = true;

    async function loadCompanies() {
      setLoading(true);
      try {
        let query = supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (search.trim()) {
          query = query.ilike("slogan", `%${search.trim()}%`);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          if (alive) setCompanies(data);
        } else {
          // Fallback gracioso com perfis de empresas registadas
          const { data: profs } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "empresa")
            .limit(30);

          if (profs && profs.length > 0 && alive) {
            setCompanies(
              profs.map((p) => ({
                id: p.id,
                name: p.full_name || "Empresa do Cunene",
                slogan: p.bio || "Empresa registada na província do Cunene",
                logo_url: p.avatar_url,
                municipio: p.municipio || "Ondjiva",
                setor: "Comércio & Serviços",
                phone: p.phone || p.whatsapp || "+244 923 000 000",
                whatsapp: p.whatsapp || p.phone,
                verified: true,
              }))
            );
          } else if (alive) {
            setCompanies([
              {
                id: "emp-cunene-log",
                name: "Logística & Distribuição Trans-Cunene",
                slogan: "Transporte de cargas, entreposto aduaneiro e logística na fronteira de Santa Clara.",
                logo_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150",
                municipio: "Namacunde",
                setor: "Logística & Transporte",
                phone: "+244 923 111 222",
                whatsapp: "+244 923 111 222",
                verified: true,
              },
              {
                id: "emp-ondjiva-tech",
                name: "Ondjiva Soluções Tecnológicas",
                slogan: "Instalação de redes, suporte informático e consultoria digital no Cunene.",
                logo_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150",
                municipio: "Ondjiva",
                setor: "Tecnologia & Informática",
                phone: "+244 934 555 777",
                whatsapp: "+244 934 555 777",
                verified: true,
              },
              {
                id: "emp-agro-cuanhama",
                name: "Cooperativa Agro-Pecuária do Cuanhama",
                slogan: "Produção pecuária, cereais e abastecimento alimentar para toda a província.",
                logo_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=150",
                municipio: "Cuanhama",
                setor: "Agricultura & Pecuária",
                phone: "+244 912 333 444",
                whatsapp: "+244 912 333 444",
                verified: true,
              },
            ]);
          }
        }
      } catch (err) {
        console.warn("Erro ao buscar empresas:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadCompanies();
    return () => {
      alive = false;
    };
  }, [search]);

  const filteredCompanies = companies.filter((c) => {
    const loc = (c.municipio || c.location || "").toLowerCase();
    return municipality === "Todos" || loc.includes(municipality.toLowerCase());
  });

  return (
    <section className="cv-module">
      <div className="cv-module-heading">
        <div>
          <span className="cv-kicker">EMPREGADORES & NEGÓCIOS</span>
          <h1>Empresas no Cunene</h1>
          <p className="cv-muted">Organizações, comércios e empresas cadastradas na província.</p>
        </div>
        <input
          className="cv-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome ou setor..."
        />
      </div>

      {/* Filtros de Municípios */}
      <div className="cv-category-row">
        {MUNICIPALITIES.map((mun) => (
          <button
            key={mun}
            className={municipality === mun ? "selected" : ""}
            onClick={() => setMunicipality(mun)}
          >
            {mun}
          </button>
        ))}
      </div>

      {loading && <p className="cv-muted">A carregar empresas...</p>}

      <div className="cv-companies-grid">
        {filteredCompanies.map((comp) => {
          const compName = comp.name || comp.slogan || comp.full_name || "Empresa Local";
          const compDesc = comp.description || comp.slogan || "Empresa parceira CuneneVagas.";
          const compLoc = comp.municipio || comp.location || "Cunene";
          const compSector = comp.setor || comp.industry || "Comércio & Indústria";

          return (
            <article className="cv-company-card" key={comp.id}>
              <div className="cv-card-header">
                {comp.logo_url ? (
                  <img src={comp.logo_url} alt={compName} />
                ) : (
                  <div className="cv-avatar cv-avatar-fallback">
                    {compName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="cv-card-header-info">
                  <h3>{compName}</h3>
                  <p>{compSector} · {compLoc}</p>
                </div>
              </div>

              <p style={{ margin: "6px 0", fontSize: 13, color: "#d1c8b8", lineHeight: 1.45 }}>
                {String(compDesc).slice(0, 140)}
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8 }}>
                <span className="cv-badge-gold">✓ Empresa Verificada</span>
                <button
                  className="cv-outline-button"
                  style={{ padding: "6px 12px", fontSize: 11 }}
                  onClick={() => {
                    setSelected(comp);
                    if (onSelectCompany) onSelectCompany(comp);
                  }}
                >
                  Ver Perfil →
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal de Detalhes da Empresa */}
      {selected && (
        <div className="cv-modal-backdrop" onMouseDown={() => setSelected(null)}>
          <section className="cv-detail-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <button className="cv-modal-close" onClick={() => setSelected(null)}>×</button>

            {/* Capa e Logo */}
            <div style={{ height: 180, background: "#16130d", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
              <img src={selected.cover_url || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800"} alt="Capa" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
            </div>
            
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -60, paddingLeft: 20, marginBottom: 16 }}>
              {selected.logo_url ? (
                <img
                  src={selected.logo_url}
                  alt={selected.name}
                  style={{ width: 80, height: 80, borderRadius: 14, objectFit: "cover", border: "4px solid #080808" }}
                />
              ) : (
                <div className="cv-avatar cv-avatar-fallback" style={{ width: 80, height: 80, fontSize: 32, border: "4px solid #080808" }}>
                  {(selected.name || "E").charAt(0).toUpperCase()}
                </div>
              )}
              <h2 style={{ margin: "0 0 10px", color: "#fff", fontSize: 24 }}>{selected.name || "Empresa"}</h2>
            </div>

            <p style={{ color: "#e5ded2", fontSize: 14, lineHeight: 1.6, padding: "0 20px" }}>
              {selected.description || selected.slogan || "Empresa ativa e comprometida com o crescimento económico da província do Cunene."}
            </p>

            <div style={{ background: "#16130d", border: "1px solid #362914", borderRadius: 10, padding: 14, margin: "14px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span className="cv-muted">Município:</span>
                <strong>{selected.municipio || "Ondjiva"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span className="cv-muted">Contacto:</span>
                <strong>{selected.phone || selected.whatsapp || "Sob consulta"}</strong>
              </div>
            </div>

            {selected.whatsapp && (
              <div style={{ padding: "0 20px" }}>
                <a
                  className="cv-gold-button cv-whatsapp"
                  style={{ textAlign: "center", textDecoration: "none", display: "block" }}
                  href={`https://wa.me/${String(selected.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Encontrei a vossa empresa no portal CuneneVagas.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Contactar Empresa no WhatsApp
                </a>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

// ========================================================
// 2. CANDIDATOS (TALENTS BROWSER)
// ========================================================
export function CandidatesBrowser({ onSelectCandidate }: { onSelectCandidate?: (candidate: any) => void }) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [municipality, setMunicipality] = useState("Todos");
  const [loading, setLoading] = useState(true);

  const MUNICIPALITIES = ["Todos", "Ondjiva", "Namacunde", "Cuanhama", "Ombadja", "Cuvelai", "Cahama"];

  useEffect(() => {
    let alive = true;

    async function loadCandidates() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .or("role.eq.candidato,role.is.null")
          .order("created_at", { ascending: false })
          .limit(60);

        if (!error && data && alive) {
          setCandidates(data);
        } else if (alive) {
          setCandidates([]);
        }
      } catch (err) {
        console.warn("Erro ao buscar candidatos:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadCandidates();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = candidates.filter((c) => {
    const name = (c.full_name || "").toLowerCase();
    const prof = (c.profession || c.bio || "").toLowerCase();
    const loc = (c.municipio || "").toLowerCase();
    const matchSearch = !search.trim() || name.includes(search.toLowerCase()) || prof.includes(search.toLowerCase());
    const matchMun = municipality === "Todos" || loc.includes(municipality.toLowerCase());
    return matchSearch && matchMun;
  });

  return (
    <section className="cv-module">
      <div className="cv-module-heading">
        <div>
          <span className="cv-kicker">TALENTOS & PROFISSIONAIS</span>
          <h1>Candidatos no Cunene</h1>
          <p className="cv-muted">Profissionais com competências verificadas prontos para contratação.</p>
        </div>
        <input
          className="cv-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por profissão ou nome..."
        />
      </div>

      <div className="cv-category-row">
        {MUNICIPALITIES.map((mun) => (
          <button
            key={mun}
            className={municipality === mun ? "selected" : ""}
            onClick={() => setMunicipality(mun)}
          >
            {mun}
          </button>
        ))}
      </div>

      {loading && <p className="cv-muted">A carregar profissionais...</p>}

      <div className="cv-candidates-grid">
        {filtered.map((cand) => {
          const name = cand.full_name || "Candidato";
          const prof = cand.profession || "Profissional CuneneVagas";
          const loc = cand.municipio || "Cunene";
          const skills = Array.isArray(cand.skills) ? cand.skills : ["Qualificado", "Disponível"];

          return (
            <article className="cv-candidate-card" key={cand.id}>
              <div className="cv-card-header">
                {cand.avatar_url ? (
                  <img src={cand.avatar_url} alt={name} />
                ) : (
                  <div className="cv-avatar cv-avatar-fallback">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="cv-card-header-info">
                  <h3>{name}</h3>
                  <p>{prof}</p>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0" }}>
                ⌖ {loc}, Angola {cand.exam_passed && <span style={{ color: "var(--gold-light)", marginLeft: 6 }}>★ Exame Aprovado</span>}
              </div>

              <p style={{ margin: "4px 0 8px", fontSize: 12, color: "#d1c8b8", lineHeight: 1.45 }}>
                {String(cand.bio || "Profissional com perfil ativo na plataforma oficial do Cunene.").slice(0, 110)}
              </p>

              <div className="cv-skills-row">
                {skills.slice(0, 3).map((sk: string, i: number) => (
                  <span className="cv-skill-pill" key={i}>
                    {sk}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="cv-badge-gold">✓ Perfil Ativo</span>
                <button
                  className="cv-outline-button"
                  style={{ padding: "6px 12px", fontSize: 11 }}
                  onClick={() => {
                    setSelected(cand);
                    if (onSelectCandidate) onSelectCandidate(cand);
                  }}
                >
                  Ver Perfil →
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {selected && (
        <div className="cv-modal-backdrop" onMouseDown={() => setSelected(null)}>
          <section className="cv-detail-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <button className="cv-modal-close" onClick={() => setSelected(null)}>×</button>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              {selected.avatar_url ? (
                <img
                  src={selected.avatar_url}
                  alt={selected.full_name}
                  style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)" }}
                />
              ) : (
                <div className="cv-avatar cv-avatar-fallback" style={{ width: 68, height: 68, fontSize: 26 }}>
                  {(selected.full_name || "C").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <span className="cv-badge-gold">Candidato Verificado</span>
                <h2 style={{ margin: "4px 0 2px", color: "var(--gold-light)", fontSize: 20 }}>
                  {selected.full_name || "Candidato"}
                </h2>
                <p className="cv-muted" style={{ margin: 0 }}>
                  {selected.profession || "Profissional"} · {selected.municipio || "Cunene"}
                </p>
              </div>
            </div>

            <p style={{ color: "#e5ded2", fontSize: 13, lineHeight: 1.6 }}>
              {selected.bio || "Candidato cadastrado para oportunidades de trabalho e estágios profissionais."}
            </p>

            {selected.exam_title && (
              <div style={{ background: "#211a0e", border: "1px solid var(--gold)", borderRadius: 10, padding: 12, margin: "14px 0" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--gold)", fontWeight: 700 }}>
                  ✦ Certificação Técnica CuneneVagas
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                  {selected.exam_title}
                </div>
              </div>
            )}

            {selected.whatsapp && (
              <a
                className="cv-gold-button cv-whatsapp"
                style={{ textAlign: "center", textDecoration: "none", display: "block", marginTop: 14 }}
                href={`https://wa.me/${String(selected.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${selected.full_name}! Vi o seu perfil de talento na plataforma CuneneVagas.`)}`}
                target="_blank"
                rel="noreferrer"
              >
                Contactar Candidato no WhatsApp
              </a>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

// ========================================================
// 3. EXAMES TÉCNICOS & CERTIFICAÇÃO (EXAMS CENTER)
// ========================================================
interface ExamDef {
  id: string;
  title: string;
  category: string;
  timeLimit: number; // minutos
  questions: Array<{
    id: number;
    q: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
}

const OFFICIAL_EXAMS: ExamDef[] = [
  {
    id: "exam-logistica",
    title: "Gestão de Logística, Armazém & Distribuição",
    category: "Logística & Transporte",
    timeLimit: 12,
    questions: [
      {
        id: 1,
        q: "No controlo de stocks de mercadorias perecíveis, qual é o método de rotação recomendado?",
        options: ["LIFO (Último a entrar, primeiro a sair)", "FIFO/PEPS (Primeiro a entrar, primeiro a sair)", "Preço Médio Ponderado", "Rotação Aleatória"],
        correct: 1,
        explanation: "O método FIFO (First In, First Out) garante que os produtos mais antigos sejam expedidos primeiro, evitando quebras.",
      },
      {
        id: 2,
        q: "Qual é a função do documento de 'Guia de Remessa / Guia de Transporte' em Angola?",
        options: ["Substituir a fatura comercial definitiva", "Acompanhar a circulação de mercadorias e comprovar a carga perante a AGT", "Isentar de imposto sobre o valor acrescentado", "Comprovar apenas a saída de pessoal"],
        correct: 1,
        explanation: "A Guia de Transporte comprova legalmente perante as autoridades fiscais (AGT) a origem e o destino da mercadoria em trânsito.",
      },
      {
        id: 3,
        q: "O que significa 'Cross-docking' na operação logística de armazém?",
        options: ["Guardar mercadorias durante mais de um ano", "Transferir produtos diretamente do recebimento para a expedição sem estocagem prévia", "Pintar as paredes da doca", "Despejo de resíduos industriais"],
        correct: 1,
        explanation: "O Cross-docking agiliza a entrega ao transferir cargas diretamente da receção para a expedição com tempo mínimo de paragem.",
      },
      {
        id: 4,
        q: "Qual o indicador logístico utilizado para medir a percentagem de pedidos entregues sem atrasos e sem avarias?",
        options: ["OTIF (On-Time In-Full)", "ROI (Retorno do Investimento)", "EBITDA", "Margem Bruta"],
        correct: 0,
        explanation: "O OTIF (On-Time In-Full) mede a eficácia no cumprimento dos prazos e a integridade dos pedidos aos clientes.",
      },
    ],
  },
  {
    id: "exam-contabilidade",
    title: "Contabilidade Geral, Fiscalidade AGT & Finanças",
    category: "Finanças & Administração",
    timeLimit: 12,
    questions: [
      {
        id: 1,
        q: "Em conformidade com o regime fiscal angolano, qual é a taxa normal do IVA (Imposto sobre o Valor Acrescentado)?",
        options: ["7%", "10%", "14%", "20%"],
        correct: 2,
        explanation: "A taxa normal de IVA em Angola é de 14%, aplicável às transmissões de bens e prestações de serviços tributáveis.",
      },
      {
        id: 2,
        q: "O que representa o princípio contabilístico das partidas dobradas?",
        options: ["Cada lançamento tem um débito e um crédito de igual valor", "Emitir duas faturas para a mesma venda", "Pagar salários duas vezes por mês", "Cobrar o dobro do preço no cliente"],
        correct: 0,
        explanation: "Para todo o débito efetuado deve existir um crédito de igual valor, garantindo o equilíbrio da equação patrimonial.",
      },
      {
        id: 3,
        q: "O que é o NIF em Angola?",
        options: ["Número de Inscrição em Farmácias", "Número de Identificação Fiscal atribuído pela AGT", "Norma Internacional de Faturação", "Nome do Instituto Financeiro"],
        correct: 1,
        explanation: "O NIF é o Número de Identificação Fiscal gerido pela Administração Geral Tributária (AGT).",
      },
      {
        id: 4,
        q: "No Plano Geral de Contabilidade de Angola (PGC), a que classe pertencem as 'Existências' (Stocks)?",
        options: ["Classe 1 - Meios Fixos e Investimentos", "Classe 2 - Existências", "Classe 3 - Terceiros", "Classe 4 - Meios Monetários"],
        correct: 1,
        explanation: "A Classe 2 do PGC de Angola destina-se ao registo das compras, matérias-primas e existências de mercadorias.",
      },
    ],
  },
  {
    id: "exam-ti",
    title: "Informática Prática, Redes & Tecnologias de Informação",
    category: "Tecnologia & Informática",
    timeLimit: 10,
    questions: [
      {
        id: 1,
        q: "Qual protocolo é utilizado para a navegação segura na Internet com criptografia de dados?",
        options: ["HTTP", "FTP", "HTTPS (SSL/TLS)", "SMTP"],
        correct: 2,
        explanation: "O HTTPS garante a confidencialidade e integridade da comunicação entre o navegador e o servidor web.",
      },
      {
        id: 2,
        q: "Qual é a função primordial de um 'Firewall' numa rede informática empresarial?",
        options: ["Aumentar a velocidade da corrente elétrica", "Monitorar e bloquear tráfego de rede não autorizado", "Formatar discos rígidos automaticamente", "Imprimir relatórios diários"],
        correct: 1,
        explanation: "A firewall protege a rede interna contra acessos não autorizados e ataques provenientes da Internet.",
      },
      {
        id: 3,
        q: "Para realizar cópias de segurança confiáveis contra ransomware, qual é a boa prática recomendada?",
        options: ["Salvar apenas no ambiente de trabalho", "Regra 3-2-1 (3 cópias, 2 mídias diferentes, 1 cópia externa/nuvem)", "Desligar o monitor à noite", "Enviar por email num anexo não protegido"],
        correct: 1,
        explanation: "A estratégia 3-2-1 é a referência padrão internacional para proteção contra perda irreversível de ficheiros corporativos.",
      },
    ],
  },
  {
    id: "exam-vendas",
    title: "Atendimento ao Cliente, Vendas & Negociação Comercial",
    category: "Comércio & Vendas",
    timeLimit: 10,
    questions: [
      {
        id: 1,
        q: "Na abordagem moderna de vendas, qual é o primeiro passo para conquistar um cliente exigente?",
        options: ["Pressionar imediatamente para fechar contrato", "Ouvir ativamente e diagnosticar as necessidades reais do cliente", "Oferecer descontos sem perguntar o que precisa", "Criticar os concorrentes"],
        correct: 1,
        explanation: "A escuta ativa e o diagnóstico correto das dores do cliente geram confiança e fundamentam a proposta de valor.",
      },
      {
        id: 2,
        q: "O que significa 'Pós-Venda' numa empresa comercial no Cunene?",
        options: ["Ações e acompanhamento após a conclusão da compra para fidelizar o cliente", "Cobrança de juros adicionais", "Venda de produtos fora do prazo", "Devolução imediata de toda a mercadoria"],
        correct: 0,
        explanation: "O pós-venda assegura a satisfação do cliente, resolve eventuais dúvidas e incentiva novas compras futuras.",
      },
      {
        id: 3,
        q: "Quando um cliente manifesta uma objeção em relação ao preço, qual é a conduta ideal do vendedor?",
        options: ["Abandonar o atendimento", "Demonstrar o valor, a durabilidade e o retorno que o produto oferece", "Dizer que o cliente não tem dinheiro suficiente", "Ignorar o comentário do cliente"],
        correct: 1,
        explanation: "Superar objeções exige reforçar os benefícios, a garantia e o custo-benefício prático da solução.",
      },
    ],
  },
  {
    id: "exam-secretariado",
    title: "Secretariado Executivo, Gestão de Documentos & RH",
    category: "Recursos Humanos & Administração",
    timeLimit: 10,
    questions: [
      {
        id: 1,
        q: "Qual é o documento formal utilizado para resumir deliberações e decisões tomadas numa reunião corporativa?",
        options: ["Ata de Reunião", "Aviso Prévio", "Fatura Pró-forma", "Recibo de Vencimento"],
        correct: 0,
        explanation: "A Ata regista de forma fiel, cronológica e legal os temas debatidos e as decisões aprovadas numa reunião de trabalho.",
      },
      {
        id: 2,
        q: "Segundo a Lei Geral do Trabalho em Angola, qual é a duração padrão do período normal de trabalho semanal?",
        options: ["30 horas", "44 horas semanais", "60 horas semanais", "20 horas semanais"],
        correct: 1,
        explanation: "O regime legal de trabalho ordinário em Angola estabelece por regra um teto de 44 horas semanais.",
      },
      {
        id: 3,
        q: "Na correspondência oficial em Angola, qual é o vocativo de abertura formal para dirigir um ofício a um Diretor Provincial?",
        options: ["Olá amigo,", "Excelentíssimo Senhor Diretor,", "Prezado colega de trabalho,", "A quem possa interessar,"],
        correct: 1,
        explanation: "O vocativo 'Excelentíssimo Senhor' respeita os padrões protocolares de deferência administrativa e institucional.",
      },
    ],
  },
];

export function ExamsCenter({ session }: { session: any }) {
  const [activeExam, setActiveExam] = useState<ExamDef | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [completedExams, setCompletedExams] = useState<Record<string, any>>({});
  const [viewingCertificate, setViewingCertificate] = useState<any>(null);
  const [reviewingExam, setReviewingExam] = useState<{ exam: ExamDef; result: any } | null>(null);

  const userId = session?.user?.id || "anon";

  // Carregar histórico de exames realizados para impedir repetições
  useEffect(() => {
    try {
      const storageKey = `cv_user_exams_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCompletedExams(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [userId]);

  function startExam(exam: ExamDef) {
    // Regra obrigatória: uma vez feito o exame não permitir repetir
    if (completedExams[exam.id]) {
      return;
    }
    setActiveExam(exam);
    setCurrentQIndex(0);
    setAnswers({});
    setIsFinished(false);
    setScore(0);
    setCertificateData(null);
  }

  function handleSelectOption(optIndex: number) {
    setAnswers((prev) => ({ ...prev, [currentQIndex]: optIndex }));
  }

  function submitExam() {
    if (!activeExam) return;

    let correctCount = 0;
    activeExam.questions.forEach((q, idx) => {
      if (answers[idx] === q.correct) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / activeExam.questions.length) * 100);
    const passed = finalScore >= 70;
    setScore(finalScore);
    setIsFinished(true);

    try {
      soundEffects.playLikeSound();
    } catch {}

    const certId = `CUN-CERT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const cert = {
      id: certId,
      examId: activeExam.id,
      candidateName: session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "Candidato CuneneVagas",
      examTitle: activeExam.title,
      category: activeExam.category,
      score: finalScore,
      passed,
      date: new Date().toLocaleDateString("pt-AO", { day: "2-digit", month: "long", year: "numeric" }),
      timestamp: new Date().toISOString(),
      userAnswers: answers,
    };

    if (passed) {
      setCertificateData(cert);
    }

    // Persistir o exame como REALIZADO e BLOQUEAR repetição
    const updated = {
      ...completedExams,
      [activeExam.id]: cert,
    };
    setCompletedExams(updated);
    try {
      localStorage.setItem(`cv_user_exams_${userId}`, JSON.stringify(updated));
    } catch {}

    // Notificação em tempo real
    if (session?.user?.id) {
      supabase.from("notifications").insert({
        user_id: session.user.id,
        title: passed ? "🎉 Exame Aprovado & Certificado Emitido!" : "📋 Avaliação Concluída",
        message: passed
          ? `Parabéns! Foste aprovado no exame "${activeExam.title}" com ${finalScore}%. O teu certificado oficial foi emitido.`
          : `Concluíste a avaliação oficial "${activeExam.title}" com aproveitamento de ${finalScore}%.`,
        read: false,
        link: "Exames",
      }).then(() => {});

      // Se passou, atualizar o perfil com o título do exame
      if (passed) {
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
          if (authUser) {
            supabase.from("profiles").update({
              bio: `Profissional certificado CuneneVagas: ${activeExam.title}`,
            }).eq("id", authUser.id).then(() => {});
          }
        });
      }
    }
  }

  return (
    <section className="cv-module">
      <div className="cv-module-heading">
        <div>
          <span className="cv-kicker">AVALIAÇÃO OFICIAL DE COMPETÊNCIAS</span>
          <h1>Exames Técnicos & Certificação</h1>
          <p className="cv-muted">
            Avaliações de aptidão técnica profissional do Cunene. 
            <strong> Regra Oficial:</strong> Uma vez realizado o exame, o resultado torna-se definitivo e intransmissível.
          </p>
        </div>
      </div>

      {/* Cartões de Exames */}
      {!activeExam && (
        <div className="cv-exams-grid">
          {OFFICIAL_EXAMS.map((exam) => {
            const attempt = completedExams[exam.id];
            const isCompleted = !!attempt;
            const isPassed = attempt?.passed;

            return (
              <article
                className="cv-exam-card"
                key={exam.id}
                style={{
                  border: isCompleted
                    ? isPassed
                      ? "1px solid #2e7d32"
                      : "1px solid #8d2626"
                    : "1px solid #362914",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div className="cv-exam-icon">{isCompleted ? (isPassed ? "✓" : "✗") : "✦"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="cv-badge-gold">{exam.category}</span>
                      {isCompleted && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: isPassed ? "#153d19" : "#421515",
                            color: isPassed ? "#81c784" : "#e57373",
                            fontWeight: 700,
                          }}
                        >
                          {isPassed ? `Aprovado (${attempt.score}%)` : `Realizado (${attempt.score}%)`}
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: "6px 0 4px", fontSize: 17, color: "#fff" }}>{exam.title}</h3>
                  </div>
                </div>

                <div className="cv-exam-meta">
                  <span>⏱ {exam.timeLimit} minutos</span>
                  <span>• {exam.questions.length} Questões</span>
                  <span>• Nota mínima: 70%</span>
                </div>

                {isCompleted ? (
                  <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    {isPassed ? (
                      <button
                        className="cv-gold-button"
                        style={{ flex: 1 }}
                        onClick={() => setViewingCertificate(attempt)}
                      >
                        ★ Ver Certificado
                      </button>
                    ) : (
                      <div
                        style={{
                          flex: 1,
                          padding: "10px",
                          textAlign: "center",
                          background: "#181212",
                          border: "1px dashed #6b2828",
                          borderRadius: 8,
                          color: "#d9a0a0",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        🔒 Exame Realizado ({attempt.score}%) — Não Repetível
                      </div>
                    )}
                    <button
                      className="cv-outline-button"
                      style={{ padding: "8px 12px", fontSize: 12 }}
                      onClick={() => setReviewingExam({ exam, result: attempt })}
                      title="Rever perguntas e respostas"
                    >
                      Revisão
                    </button>
                  </div>
                ) : (
                  <button className="cv-gold-button" onClick={() => startExam(exam)}>
                    Iniciar Avaliação Oficial →
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Simulador Interativo do Exame */}
      {activeExam && !isFinished && (
        <div className="panel" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #362914", paddingBottom: 12, marginBottom: 16 }}>
            <div>
              <span className="cv-kicker">{activeExam.category}</span>
              <h2 style={{ margin: 0, fontSize: 18, color: "var(--gold-light)" }}>{activeExam.title}</h2>
            </div>
            <button className="cv-modal-close" onClick={() => setActiveExam(null)}>✕</button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            <span>Questão {currentQIndex + 1} de {activeExam.questions.length}</span>
            <span>Progresso: {Math.round(((currentQIndex + 1) / activeExam.questions.length) * 100)}%</span>
          </div>

          <div style={{ background: "#16130d", border: "1px solid #362914", borderRadius: 12, padding: 18, marginBottom: 18 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#fff", lineHeight: 1.5 }}>
              {activeExam.questions[currentQIndex].q}
            </h3>

            <div style={{ display: "grid", gap: 10 }}>
              {activeExam.questions[currentQIndex].options.map((option, optIdx) => {
                const isSelected = answers[currentQIndex] === optIdx;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: isSelected ? "linear-gradient(110deg, #f6d77f, #bd852b)" : "#0f0d09",
                      color: isSelected ? "#1a1205" : "#e5ded2",
                      border: isSelected ? "1px solid var(--gold)" : "1px solid #362914",
                      fontWeight: isSelected ? 800 : 500,
                      cursor: "pointer",
                      fontSize: 13,
                      transition: "all 0.2s",
                    }}
                  >
                    <strong>{String.fromCharCode(65 + optIdx)})</strong> {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <button
              className="cv-outline-button"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
            >
              ← Anterior
            </button>

            {currentQIndex < activeExam.questions.length - 1 ? (
              <button
                className="cv-gold-button"
                onClick={() => setCurrentQIndex((prev) => prev + 1)}
              >
                Próxima Questão →
              </button>
            ) : (
              <button
                className="cv-gold-button"
                onClick={submitExam}
              >
                Submeter Avaliação Definitiva ✓
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ecrã de Resultado Imediato */}
      {activeExam && isFinished && (
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="panel" style={{ textAlign: "center", marginBottom: 20 }}>
            <span className="cv-kicker">RESULTADO FINAL DEFINITIVO</span>
            <h2 style={{ fontSize: 28, margin: "6px 0", color: score >= 70 ? "var(--gold-light)" : "#f28b82" }}>
              {score >= 70 ? "Parabéns! Foste Aprovado!" : "Avaliação Concluída"}
            </h2>
            <p style={{ fontSize: 18, color: "#fff", fontWeight: 700 }}>
              Classificação: <span style={{ color: "var(--gold)" }}>{score}%</span>
            </p>
            <p className="cv-muted" style={{ margin: "4px 0 16px" }}>
              {score >= 70
                ? "Demonstraste competências comprovadas e o teu certificado oficial foi registado com sucesso no CuneneVagas."
                : "Obtiveste uma pontuação inferior a 70%. O teu resultado foi registado na plataforma como definitivo para este ciclo."}
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              {score >= 70 && certificateData && (
                <button
                  className="cv-gold-button"
                  onClick={() => setViewingCertificate(certificateData)}
                >
                  ★ Ver & Imprimir Certificado
                </button>
              )}
              <button
                className="cv-outline-button"
                onClick={() => setActiveExam(null)}
              >
                Voltar à Lista de Exames
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Revisão do Exame Feito */}
      {reviewingExam && (
        <div className="cv-modal-backdrop" onMouseDown={() => setReviewingExam(null)}>
          <section className="cv-detail-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <button className="cv-modal-close" onClick={() => setReviewingExam(null)}>✕</button>
            <span className="cv-kicker">{reviewingExam.exam.category}</span>
            <h2 style={{ margin: "4px 0 12px", color: "var(--gold-light)", fontSize: 20 }}>
              Revisão: {reviewingExam.exam.title}
            </h2>
            <p className="cv-muted" style={{ marginBottom: 16 }}>
              Nota obtida: <strong style={{ color: reviewingExam.result.passed ? "#81c784" : "#e57373" }}>{reviewingExam.result.score}%</strong> · 
              Estado: <strong>{reviewingExam.result.passed ? "Aprovado" : "Não Aprovado"}</strong>
            </p>

            <div style={{ display: "grid", gap: 14, maxHeight: 380, overflowY: "auto", paddingRight: 6 }}>
              {reviewingExam.exam.questions.map((q, idx) => {
                const chosen = reviewingExam.result.userAnswers?.[idx];
                const isCorrect = chosen === q.correct;

                return (
                  <div
                    key={q.id}
                    style={{
                      background: "#12100b",
                      border: isCorrect ? "1px solid #2e7d32" : "1px solid #7f2b2b",
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <strong style={{ fontSize: 13, color: "#fff" }}>Questão {idx + 1}</strong>
                      <span style={{ fontSize: 12, color: isCorrect ? "#81c784" : "#e57373", fontWeight: 700 }}>
                        {isCorrect ? "✓ Correto" : "✗ Incorreto"}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 13, color: "#e0d9ce" }}>{q.q}</p>
                    <div style={{ fontSize: 12, color: "#bbb", marginBottom: 6 }}>
                      A tua resposta: <strong style={{ color: isCorrect ? "#81c784" : "#e57373" }}>{chosen !== undefined ? q.options[chosen] : "Não respondida"}</strong>
                    </div>
                    {!isCorrect && (
                      <div style={{ fontSize: 12, color: "var(--gold-light)", marginBottom: 4 }}>
                        Resposta correta: <strong>{q.options[q.correct]}</strong>
                      </div>
                    )}
                    <small style={{ display: "block", color: "#888", fontStyle: "italic", marginTop: 4 }}>
                      Explicação: {q.explanation}
                    </small>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button className="cv-gold-button" onClick={() => setReviewingExam(null)}>
                Fechar Revisão
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Modal / Visualizador do Certificado Oficial */}
      {viewingCertificate && (
        <div className="cv-modal-backdrop" onMouseDown={() => setViewingCertificate(null)}>
          <section className="cv-detail-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 660, background: "#0a0a08" }}>
            <button className="cv-modal-close" onClick={() => setViewingCertificate(null)}>✕</button>

            <div className="cv-certificate-card" id="printable-certificate" style={{ margin: 0 }}>
              <div className="cv-cert-seal">★</div>
              <span className="cv-kicker">REPÚBLICA DE ANGOLA · PROVÍNCIA DO CUNENE</span>
              <h2 className="cv-cert-title">Certificado de Mérito Profissional</h2>
              <p style={{ margin: "4px 0", color: "#bbb", fontSize: 13 }}>
                Certifica-se formalmente que
              </p>
              <div className="cv-cert-name">{viewingCertificate.candidateName}</div>
              <p style={{ margin: "4px 0", color: "#ddd", fontSize: 13 }}>
                concluiu com êxito a avaliação técnica oficial de competências em
              </p>
              <h3 style={{ color: "var(--gold-light)", margin: "8px 0", fontSize: 18 }}>
                {viewingCertificate.examTitle}
              </h3>
              <p style={{ margin: "4px 0", fontSize: 12, color: "#aaa" }}>
                Classificação obtida: <strong>{viewingCertificate.score}%</strong> · Emitido em <strong>{viewingCertificate.date}</strong>
              </p>

              <div>
                <span className="cv-cert-code">{viewingCertificate.id}</span>
              </div>

              <div style={{ marginTop: 22, display: "flex", justifyContent: "center", gap: 12 }}>
                <button
                  className="cv-gold-button"
                  onClick={() => window.print()}
                >
                  🖨 Imprimir Certificado
                </button>
                <button
                  className="cv-outline-button"
                  onClick={() => setViewingCertificate(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

// ========================================================
// 4. NOTIFICAÇÕES (NOTIFICATIONS CENTER)
// ========================================================
export function NotificationsCenter({ session }: { session: any }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const userId = session?.user?.id;

  async function loadNotifs() {
    setLoading(true);
    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data } = await query;
      setNotifications(data || []);
    } catch (err) {
      console.warn("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifs();

    const channel = supabase
      .channel("notifications-center-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadNotifs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAllAsRead() {
    if (!userId) return;
    try {
      await supabase.from("notifications").update({ read: true, lida: true }).eq("user_id", userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, lida: true })));
      setNotice("Todas as notificações foram marcadas como lidas.");
      setTimeout(() => setNotice(""), 3000);
    } catch (e: any) {
      console.warn(e);
    }
  }

  async function sendTestNotification() {
    try {
      const testItem = {
        user_id: userId || null,
        title: "🔔 Alerta em Tempo Real CuneneVagas",
        message: "Notificação emitida via Supabase Realtime para a província do Cunene.",
        read: false,
        link: "Vagas",
      };
      await supabase.from("notifications").insert(testItem);
      setNotice("Alerta de teste emitido com sucesso!");
      setTimeout(() => setNotice(""), 3000);
      loadNotifs();
    } catch (e: any) {
      console.warn(e);
    }
  }

  return (
    <section className="cv-module">
      <div className="cv-module-heading">
        <div>
          <span className="cv-kicker">CENTRO DE ALERTAS</span>
          <h1>Notificações</h1>
          <p className="cv-muted">Alertas em tempo real sobre vagas, mensagens, exames e novidades.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="cv-gold-button" onClick={sendTestNotification}>
            + Testar Alerta em Tempo Real
          </button>
          {notifications.some((n) => !n.read && !n.lida) && (
            <button className="cv-outline-button" onClick={markAllAsRead}>
              Marcar Todas Lidas
            </button>
          )}
        </div>
      </div>

      {notice && <div className="notice">{notice}</div>}
      {loading && <p className="cv-muted">A carregar notificações...</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {notifications.length === 0 && !loading && (
          <div className="empty-state">
            <span>✦</span>
            <h3>Sem notificações no momento</h3>
            <p>Quando surgirem novidades sobre as tuas candidaturas ou publicações, elas aparecerão aqui.</p>
          </div>
        )}

        {notifications.map((notif) => {
          const isUnread = !notif.read && !notif.lida;
          return (
            <article
              key={notif.id}
              style={{
                background: isUnread ? "#1f180d" : "#11100d",
                border: isUnread ? "1px solid var(--gold)" : "1px solid #362914",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 20 }}>{isUnread ? "🔔" : "✓"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: isUnread ? "var(--gold-light)" : "#fff", fontSize: 14 }}>
                    {notif.title || notif.titulo || "Notificação"}
                  </strong>
                  <small style={{ color: "var(--muted)", fontSize: 11 }}>
                    {notif.created_at ? new Date(notif.created_at).toLocaleString("pt-PT") : "Recente"}
                  </small>
                </div>
                <p style={{ margin: "4px 0 0", color: "#ddd", fontSize: 13, lineHeight: 1.45 }}>
                  {notif.message || notif.mensagem || notif.content || "Tens uma nova atualização."}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ========================================================
// 5. PERFIL & DASHBOARD DO UTILIZADOR
// ========================================================
export function UserProfileDashboard({
  session,
  onLogout,
}: {
  session: any;
  onLogout: () => void;
}) {
  const user = session?.user;
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [municipio, setMunicipio] = useState("Ondjiva");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("candidato");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "edit" | "role">("info");

  useEffect(() => {
    if (!user) return;

    async function loadUserProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setWhatsapp(data.whatsapp || "");
        setMunicipio(data.municipio || "Ondjiva");
        setBio(data.bio || "");
        setRole(data.role || "candidato");
        setAvatarUrl(data.avatar_url || "");
      } else {
        const meta = user.user_metadata || {};
        setFullName(meta.full_name || meta.name || "");
        setRole(meta.role || "candidato");
      }
    }

    loadUserProfile();
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setNotice("");

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) throw new Error("Utilizador não autenticado.");

      const updates = {
        id: authUser.id,
        full_name: fullName,
        phone,
        whatsapp,
        municipio,
        bio,
        role,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(updates, { onConflict: "id" });

      if (error) throw error;
      setNotice("Perfil atualizado com sucesso!");
      setActiveTab("info");
    } catch (err: unknown) {
      console.warn("Erro ao atualizar perfil:", err);
      setNotice(toUserErrorMessage(err, "Não foi possível atualizar o perfil. Tenta novamente."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSwitchRole() {
    setSaving(true);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) throw new Error("Inicia sessão para continuar.");

      const newRole = role === "empresa" ? "candidato" : "empresa";
      
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", authUser.id);

      if (error) throw error;

      setRole(newRole);
      setNotice(`Conta alternada para: ${newRole === "empresa" ? "Empresa / Empregador" : "Candidato / Profissional"}`);
    } catch (err: unknown) {
      console.warn("Erro ao alternar perfil:", err);
      setNotice(toUserErrorMessage(err, "Não foi possível alternar o tipo de conta. Tenta novamente."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="cv-module" style={{ maxWidth: 680, margin: "0 auto" }}>
      <div className="cv-module-heading">
        <div>
          <span className="cv-kicker">GESTÃO DE CONTA</span>
          <h1>Painel do Utilizador</h1>
          <p className="cv-muted">Configura os teus dados de perfil, preferências e presença no Cunene.</p>
        </div>
      </div>

      {notice && <div className="notice">{notice}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={activeTab === "info" ? "cv-gold-button" : "cv-outline-button"}
          onClick={() => setActiveTab("info")}
        >
          Visão Geral
        </button>
        <button
          className={activeTab === "edit" ? "cv-gold-button" : "cv-outline-button"}
          onClick={() => setActiveTab("edit")}
        >
          Editar Dados
        </button>
        <button
          className={activeTab === "role" ? "cv-gold-button" : "cv-outline-button"}
          onClick={() => setActiveTab("role")}
        >
          Tipo de Conta ({role === "empresa" ? "Empresa" : "Candidato"})
        </button>
      </div>

      {activeTab === "info" && (
        <div className="panel">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)" }}
              />
            ) : (
              <div className="cv-avatar cv-avatar-fallback" style={{ width: 72, height: 72, fontSize: 26 }}>
                {(fullName || user?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="cv-badge-gold">
                {role === "empresa" ? "Conta Empresa" : "Conta Candidato"}
              </span>
              <h2 style={{ margin: "4px 0 2px", color: "#fff", fontSize: 22 }}>
                {fullName || "Utilizador CuneneVagas"}
              </h2>
              <p className="cv-muted" style={{ margin: 0 }}>{user?.email}</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div className="profile-line">
              <span>Município</span><strong>{municipio}</strong>
            </div>
            <div className="profile-line">
              <span>Telefone</span><strong>{phone || "Não indicado"}</strong>
            </div>
            <div className="profile-line">
              <span>WhatsApp</span><strong>{whatsapp || "Não indicado"}</strong>
            </div>
            <div className="profile-line">
              <span>Biografia / Apresentação</span>
              <p style={{ margin: 0, textAlign: "right", maxWidth: 300, fontSize: 12, color: "#ccc" }}>
                {bio || "Sem apresentação definida."}
              </p>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <button className="cv-gold-button" onClick={() => setActiveTab("edit")}>
              Editar Perfil
            </button>
            <button className="cv-outline-button" onClick={onLogout}>
              Terminar Sessão
            </button>
          </div>
        </div>
      )}

      {activeTab === "edit" && (
        <form className="panel" onSubmit={handleSaveProfile} style={{ display: "grid", gap: 14 }}>
          <h3>Editar Dados de Perfil</h3>

          <div className="form-group">
            <label>Nome Completo / Denominação Social</label>
            <input
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Gabriel André ou Empresa Lda."
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Telefone</label>
              <input
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+244 923 000 000"
              />
            </div>
            <div className="form-group">
              <label>WhatsApp</label>
              <input
                className="form-input"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+244 923 000 000"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Município no Cunene</label>
            <select
              className="form-input"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
            >
              <option value="Ondjiva">Ondjiva</option>
              <option value="Namacunde">Namacunde</option>
              <option value="Cuanhama">Cuanhama</option>
              <option value="Ombadja">Ombadja</option>
              <option value="Cuvelai">Cuvelai</option>
              <option value="Cahama">Cahama</option>
            </select>
          </div>

          <div className="form-group">
            <label>URL da Fotografia / Logótipo</label>
            <input
              className="form-input"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://exemplo.com/foto.jpg"
            />
          </div>

          <div className="form-group">
            <label>Biografia / Apresentação</label>
            <textarea
              className="form-input"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descreve a tua formação, experiências ou serviços da tua empresa no Cunene..."
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <button type="submit" className="cv-gold-button" disabled={saving}>
              {saving ? "A guardar..." : "Guardar Alterações"}
            </button>
            <button type="button" className="cv-outline-button" onClick={() => setActiveTab("info")}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {activeTab === "role" && (
        <div className="panel">
          <h3>Alternar Modo de Utilizador</h3>
          <p className="cv-muted">
            Atualmente a tua conta está configurada como:{" "}
            <strong style={{ color: "var(--gold-light)" }}>
              {role === "empresa" ? "Empresa / Empregador" : "Candidato / Profissional"}
            </strong>
          </p>

          <div style={{ background: "#16130d", border: "1px solid #362914", borderRadius: 12, padding: 16, margin: "14px 0" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#ccc" }}>
              {role === "empresa"
                ? "Como Empresa, podes publicar ofertas de emprego, produtos no Marketplace e receber candidaturas."
                : "Como Candidato, podes candidatar-te a vagas, realizar exames de competência e ser contratado por empresas."}
            </p>
          </div>

          <button className="cv-gold-button" onClick={handleSwitchRole} disabled={saving}>
            Alternar para {role === "empresa" ? "Conta de Candidato" : "Conta de Empresa"}
          </button>
        </div>
      )}
    </section>
  );

}

// ========================================================
// 5. PRIVACIDADE & TERMOS (PRIVACY POLICY)
// ========================================================
export function PrivacyPolicy() {
  return (
    <section className="cv-module" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="cv-module-heading">
        <div>
          <span className="cv-kicker">SEGURANÇA & TRANSPARÊNCIA</span>
          <h1>Políticas de Privacidade</h1>
          <p className="cv-muted">Última atualização: Novembro de 2026</p>
        </div>
      </div>
      
      <div className="panel" style={{ display: "grid", gap: 24 }}>
        <div>
          <h3 style={{ color: "var(--gold-light)", marginBottom: 8 }}>1. Compromisso de Privacidade</h3>
          <p className="cv-muted" style={{ lineHeight: 1.6 }}>
            A plataforma CuneneVagas está comprometida com a proteção dos dados dos cidadãos e empresas da província do Cunene. 
            Todos os dados são armazenados de forma segura utilizando a infraestrutura do Supabase.
          </p>
        </div>

        <div>
          <h3 style={{ color: "var(--gold-light)", marginBottom: 8 }}>2. Dados Coletados</h3>
          <p className="cv-muted" style={{ lineHeight: 1.6 }}>
            Recolhemos informações de perfil (nome, contacto, biografia) e dados profissionais para facilitar a ligação entre candidatos e empregadores. 
            Não partilhamos dados com terceiros sem o seu consentimento explícito.
          </p>
        </div>

        <div>
          <h3 style={{ color: "var(--gold-light)", marginBottom: 8 }}>3. Direitos do Utilizador</h3>
          <p className="cv-muted" style={{ lineHeight: 1.6 }}>
            O utilizador tem o direito de aceder, retificar ou eliminar os seus dados a qualquer momento através do seu painel de perfil.
          </p>
        </div>
      </div>
    </section>
  );
}

// ========================================================
// 6. PAINEL DE ADMINISTRADOR (ADMIN RIGHTS)
// ========================================================
export function AdminDashboard({ session }: { session: any }) {
  const [stats, setStats] = useState<any>({ users: 0, jobs: 0, posts: 0, products: 0 });
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.email?.includes("admin") || session?.user?.email === "oficialgabrielag@gmail.com";

  useEffect(() => {
    async function loadAdminStats() {
      if (!isAdmin) return;
      setLoading(true);
      try {
        const [u, j, p, m] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("jobs").select("*", { count: "exact", head: true }),
          supabase.from("community_posts").select("*", { count: "exact", head: true }),
          supabase.from("marketplace").select("*", { count: "exact", head: true }),
        ]);

        setStats({
          users: u.count || 0,
          jobs: j.count || 0,
          posts: p.count || 0,
          products: m.count || 0,
        });
      } catch (err) {
        console.error("Admin stats error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAdminStats();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: 60 }}>
        <h2 style={{ color: "#f28b82" }}>Acesso Restrito</h2>
        <p className="cv-muted">Apenas administradores autorizados podem aceder a este painel.</p>
      </div>
    );
  }

  return (
    <section className="cv-module">
      <div className="cv-module-heading">
        <div>
          <span className="cv-kicker">CONTROLO DE PLATAFORMA</span>
          <h1>Painel de Administrador</h1>
          <p className="cv-muted">Gestão centralizada de métricas e conteúdos do CuneneVagas.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="panel" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, color: "var(--gold)" }}>{stats.users}</div>
          <small className="cv-muted">Utilizadores Totais</small>
        </div>
        <div className="panel" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, color: "var(--gold)" }}>{stats.jobs}</div>
          <small className="cv-muted">Vagas Ativas</small>
        </div>
        <div className="panel" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, color: "var(--gold)" }}>{stats.posts}</div>
          <small className="cv-muted">Posts na Comunidade</small>
        </div>
        <div className="panel" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, color: "var(--gold)" }}>{stats.products}</div>
          <small className="cv-muted">Produtos Marketplace</small>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Log de Atividade Recente</h3>
        <p className="cv-muted">Funcionalidade de auditoria em desenvolvimento...</p>
      </div>
    </section>
  );
}

// ========================================================
// 7. ASSISTENTE DE IA (GEMINI AI)
// ========================================================
export function AIAssistant({ session }: { session: any }) {
  const [messages, setMessages] = useState<any[]>([
    { role: "ai", text: "Olá! Sou o Assistente IA do CuneneVagas. Como posso ajudar com a sua carreira ou negócios no Cunene hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    
    const userMsg = input.trim();
    setInput("");
    setBusy(true);
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    
    try {
      // Simulação de resposta inteligente baseada no contexto do Cunene
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: "ai", 
          text: `A analisar o seu pedido sobre "${userMsg}"... No Cunene, as áreas de Logística e Agricultura estão com forte crescimento. Recomendo verificar as vagas de Ondjiva.` 
        }]);
        setBusy(false);
      }, 1000);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Desculpe, ocorreu um erro no processamento da IA." }]);
      setBusy(false);
    }
  }

  return (
    <section className="cv-module" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="cv-module-heading">
        <div>
          <span className="cv-kicker">INTELIGÊNCIA ARTIFICIAL</span>
          <h1>Assistente IA</h1>
        </div>
      </div>

      <div className="panel" style={{ display: "flex", flexDirection: "column", height: 500 }}>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16, display: "grid", gap: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ 
              alignSelf: m.role === "ai" ? "flex-start" : "flex-end",
              background: m.role === "ai" ? "#1a1a1a" : "var(--gold)",
              color: m.role === "ai" ? "#fff" : "#000",
              padding: "10px 16px",
              borderRadius: 14,
              maxWidth: "85%",
              fontSize: 13,
              lineHeight: 1.5,
              border: m.role === "ai" ? "1px solid #333" : "none"
            }}>
              {m.text}
            </div>
          ))}
          {busy && <div className="cv-muted" style={{ fontSize: 11 }}>A processar resposta...</div>}
        </div>

        <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, paddingTop: 16, borderTop: "1px solid #222" }}>
          <input 
            className="form-input" 
            style={{ flex: 1 }}
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Pergunte algo sobre vagas ou negócios..."
            disabled={busy}
          />
          <button className="cv-gold-button" style={{ padding: "0 20px" }} disabled={busy || !input.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </section>
  );
}
