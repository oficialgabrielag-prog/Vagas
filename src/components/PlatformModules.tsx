import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { toUserErrorMessage } from "../lib/errorMessages";
import { useLazyRenderList } from "../lib/useLazyRenderList";
import "./platform-modules.css";

const CATEGORIES = ["Todas", "Emprego", "Comunidade", "Dicas", "Empresas"];

export function Avatar({ src, name = "Utilizador" }: { src?: string; name?: string }) {
  return src
    ? <img className="cv-avatar" src={src} alt={name} />
    : <div className="cv-avatar cv-avatar-fallback">{name?.charAt(0)?.toUpperCase() || "U"}</div>;
}

export function FullscreenPost({ post, onClose, onProfile }: { post: any; onClose: () => void; onProfile?: (authorId: string) => void }) {
  const [comments, setComments] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  async function loadComments() {
    const { data, error: e } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (e) {
      console.warn("Erro ao carregar comentários:", e.message);
      setError(toUserErrorMessage(e, "Não foi possível carregar os comentários."));
    }
    else setComments(data || []);
  }

  useEffect(() => {
    let channel: any;

    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadComments();

    channel = supabase
      .channel(`post-comments-${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${post.id}`,
        },
        loadComments
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id]);

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return setError("Inicia sessão para comentar.");
    if (!comment.trim()) return;

    setBusy(true);
    setError("");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const { error: insertError } = await supabase
      .from("post_comments")
      .insert({
        post_id: post.id,
        author_id: user.id,
        author_name: profile?.full_name || user.email?.split("@")[0] || "Utilizador",
        content: comment.trim(),
      });

    if (insertError) {
      console.warn("Erro ao enviar comentário:", insertError.message);
      setError(toUserErrorMessage(insertError, "Não foi possível enviar o comentário. Tenta novamente."));
    }
    else {
      setComment("");
      await loadComments();
    }

    setBusy(false);
  }

  return (
    <div className="cv-modal-backdrop" onMouseDown={onClose}>
      <section className="cv-post-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="cv-modal-close" onClick={onClose} aria-label="Fechar">×</button>

        <div className="cv-post-modal-content">
          <div className="cv-post-visual">
            {post.image_url
              ? <img src={post.image_url} alt="Imagem da publicação" />
              : post.video_url
                ? <video src={post.video_url} controls />
                : <div className="cv-post-no-media">CuneneVagas</div>}
          </div>

          <div className="cv-post-discussion">
            <div className="cv-post-author">
              <Avatar src={post.author_avatar} name={post.author_name} />
              <div>
                <strong>{post.author_name || "Utilizador"}</strong>
                <small>{post.category || "Comunidade"}</small>
              </div>
            </div>

            <div className="cv-post-caption">{post.content}</div>
            {post.link_url && (
              <a href={post.link_url} target="_blank" rel="noreferrer">Abrir ligação</a>
            )}

            <div className="cv-comments-heading">
              Comentários <span>{comments.length}</span>
            </div>

            <div className="cv-comments-list">
              {comments.map((item) => (
                <article className="cv-comment" key={item.id}>
                  <Avatar name={item.author_name} />
                  <div>
                    <strong>{item.author_name}</strong>
                    <p>{item.content}</p>
                    <small>{new Date(item.created_at).toLocaleString("pt-PT")}</small>
                  </div>
                </article>
              ))}
              {comments.length === 0 && <p className="cv-muted">Ainda não há comentários.</p>}
            </div>

            {error && <p className="cv-error">{error}</p>}

            <form className="cv-comment-form" onSubmit={sendComment}>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escreve um comentário..."
                maxLength={1000}
              />
              <button disabled={busy || !comment.trim()}>
                {busy ? "..." : "Enviar"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PostCard({ post, index, onOpen }: { post: any; index: number; onOpen: () => void }) {
  const title = post.titulo || post.title || post.author_name || "Publicação";
  const contentText = post.content || post.descricao || "";
  const displayImage = post.image_url || post.imagem_url;
  const isPriority = index < 2;

  return (
    <article className="cv-post-card">
      <button className="cv-post-open" onClick={onOpen} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}>
        <div className="cv-post-card-author">
          <Avatar src={post.author_avatar} name={post.author_name} />
          <div>
            <strong>{post.author_name || title}</strong>
            <small>{post.category || post.tipo || "Comunidade"} · {new Date(post.created_at).toLocaleDateString("pt-PT")}</small>
          </div>
        </div>

        {post.titulo && <h3 style={{ fontSize: 16, margin: "8px 0", color: "var(--gold-light)" }}>{post.titulo}</h3>}
        {contentText && <p>{contentText.slice(0, 180) + (contentText.length > 180 ? "..." : "")}</p>}

        {displayImage && displayImage !== "Sem título" && (
          <img 
            className="cv-post-card-image" 
            src={displayImage} 
            alt="Publicação" 
            loading={isPriority ? "eager" : "lazy"} 
            {...(isPriority ? { fetchPriority: "high" } : {})}
          />
        )}

        <div className="cv-post-card-footer">
          <span>♡ {post.likes_count || 0}</span>
          <span>◌ {post.comments_count || 0} comentários</span>
          <span>Ver publicação →</span>
        </div>
      </button>
    </article>
  );
}

export function CommunityFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [category, setCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limitCount, setLimitCount] = useState(30);

  async function loadPosts() {
    setLoading(true);
    setError("");

    try {
      let query = supabase
        .from("feed_publico")
        .select("id,tipo,author_id,author_type,author_name,author_avatar,company_id,titulo,content,image_url,category,likes_count,comments_count,created_at")
        .order("created_at", { ascending: false })
        .limit(limitCount);

      if (category !== "Todas") {
        query = query.eq("category", category);
      }
      if (search.trim()) {
        query = query.ilike("content", `%${search.trim()}%`);
      }

      const { data, error: e } = await query;
      if (e) {
        console.warn("Erro ao carregar feed:", e.message);
        setError(toUserErrorMessage(e, "Não foi possível carregar as publicações."));
      } else {
        const rows = data || [];
        const sanitized = rows.map((row: any) => {
          if (!row) return row;
          const copy = { ...row };
          if (typeof copy.image_url === "string" && copy.image_url.startsWith("data:image/") && copy.image_url.length > 200_000) {
            copy.image_url = "";
          }
          return copy;
        });
        setPosts(sanitized);
      }
    } catch (err: unknown) {
      console.warn("Erro inesperado feed:", err);
      setError(toUserErrorMessage(err, "Não foi possível carregar as publicações. Tenta novamente."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, [category, search, limitCount]);

  useEffect(() => {
    const channel = supabase
      .channel("feed-publico-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_posts",
        },
        () => loadPosts()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace",
        },
        () => loadPosts()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [category, search, limitCount]);

  return (
    <section className="cv-module">
      <div className="cv-module-heading">
        <div>
          <span className="cv-kicker">CUNENEVAGAS</span>
          <h1>Comunidade & Marketplace</h1>
          <p>Oportunidades, produtos e novidades da província do Cunene.</p>
        </div>
        <input
          className="cv-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar publicações ou produtos..."
        />
      </div>

      <div className="cv-category-row">
        {CATEGORIES.map((name) => (
          <button
            key={name}
            className={category === name ? "selected" : ""}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {loading && posts.length === 0 && (
        <p className="cv-loading" style={{ textAlign: "center", padding: 40, color: "var(--gold)" }}>
          A carregar feed unificado do Cunene...
        </p>
      )}

      {error && (
        <div className="panel" style={{ textAlign: "center", padding: 30, borderColor: "#6b2828" }}>
          <p style={{ color: "#f28b82", marginBottom: 14 }}>{error}</p>
          <button className="cv-gold-button" onClick={() => loadPosts()}>
            ↻ Atualizar Feed
          </button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <p className="cv-muted" style={{ padding: "40px 0", textAlign: "center" }}>
          Nenhuma publicação ou produto encontrado nesta categoria.
        </p>
      )}

      {posts.length > 0 && (
        <div className="cv-post-grid">
          {posts.map((post, index) => (
            <PostCard key={post.id || index} post={post} index={index} onOpen={() => setSelected(post)} />
          ))}
        </div>
      )}

      {!loading && posts.length >= limitCount && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            className="cv-outline-button"
            onClick={() => setLimitCount(prev => prev + 20)}
          >
            Carregar Mais Publicações ↓
          </button>
        </div>
      )}



      {selected && (
        <FullscreenPost post={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

export function JobDetails({ job, onClose }: { job: any; onClose: () => void }) {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCompany() {
      if (!job?.company_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("companies")
        .select("id, logo_url, cover_url, slogan, setor, descricao, website, address, phone, whatsapp, email")
        .eq("id", job.company_id)
        .maybeSingle();

      if (active) {
        setCompany(error ? null : data);
        setLoading(false);
      }
    }

    loadCompany();
    return () => { active = false; };
  }, [job?.company_id]);

  if (!job) return null;

  return (
    <div className="cv-modal-backdrop" onMouseDown={onClose}>
      <section className="cv-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="cv-modal-close" onClick={onClose}>×</button>
        <span className="cv-kicker">OPORTUNIDADE DE EMPREGO</span>
        <h2>{job.titulo || job.title}</h2>
        <p className="cv-muted">{job.municipio || job.location || "Cunene"} · {job.tipo_contrato || job.contract_type || "Contrato não especificado"}</p>

        <div className="cv-company-profile">
          <Avatar src={company?.logo_url || job.company_logo} name={company?.slogan || job.company_name || "Empresa"} />
          <div>
            <strong>{company?.slogan || job.company_name || "Empresa anunciante"}</strong>
            <small>{company?.setor || job.category || "Empresa registada"}</small>
          </div>
        </div>

        {loading && <p className="cv-muted">A carregar empresa...</p>}
        <h3>Descrição da vaga</h3>
        <p>{job.descricao || job.description || "Sem descrição disponível."}</p>
        <h3>Requisitos</h3>
        <p>{job.requisitos || job.requirements || "Consultar a empresa para mais informações."}</p>
        {(job.salario || job.salary) && (
          <p className="cv-gold">Salário: {Number(job.salario || job.salary).toLocaleString("pt-PT")} Kz</p>
        )}
        {company?.address && <p>Localização da empresa: {company.address}</p>}
        {company?.website && <a href={company.website} target="_blank" rel="noreferrer">Website da empresa</a>}
        <button
          className="cv-gold-button"
          onClick={() => {
            alert(`Candidatura registada para: ${job.titulo || job.title}. A empresa entrará em contacto!`);
            onClose();
          }}
        >
          Candidatar-me
        </button>
      </section>
    </div>
  );
}

export function JobsBrowser({ onApply }: { onApply?: (job: any) => void }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      let query = supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);

      if (search.trim()) query = query.ilike("titulo", `%${search.trim()}%`);
      const { data } = await query;
      if (alive) {
        setJobs(data || []);
        setLoading(false);
      }
    }

    setLoading(true);
    load();

    const channel = supabase
      .channel("jobs-browser-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, load)
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [search]);

  const {
    visibleItems: visibleJobs,
    hasMore: hasMoreJobs,
    remainingCount: remainingJobsCount,
    loadMore: loadMoreJobs,
    sentinelRef: jobsSentinelRef
  } = useLazyRenderList(jobs, {
    initialCount: 12,
    batchSize: 12,
    resetKey: search
  });

  return (
    <section className="cv-module">
      <div className="cv-module-heading">
        <div><span className="cv-kicker">CARREIRAS</span><h1>Vagas de emprego</h1></div>
        <input className="cv-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar vaga..." />
      </div>

      {loading && <p className="cv-muted">A carregar vagas...</p>}
      <div className="cv-list-grid">
        {visibleJobs.map((job) => (
          <article className="cv-job-card" key={job.id}>
            <span className="cv-kicker">{job.categoria || job.category || "Oportunidade"}</span>
            <h3>{job.titulo || job.title}</h3>
            <p>{job.municipio || job.location || "Cunene"} · {job.tipo_contrato || job.contract_type || "Contrato não indicado"}</p>
            <p>{(job.descricao || job.description || "").slice(0, 130)}</p>
            <button className="cv-outline-button" onClick={() => setSelected(job)}>Ver vaga e empresa →</button>
          </article>
        ))}
      </div>

      {hasMoreJobs && (
        <div ref={jobsSentinelRef} style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
          <button type="button" className="cv-outline-button" onClick={loadMoreJobs}>
            Carregar mais vagas ({remainingJobsCount} restantes)
          </button>
        </div>
      )}

      {selected && (
        <JobDetails
          job={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

export function ProductDetails({ product, onClose }: { product: any; onClose: () => void }) {
  if (!product) return null;

  const number = String(product.whatsapp_contact || product.phone || product.contact_phone || "").replace(/\D/g, "");
  const whatsappUrl = number
    ? `https://wa.me/${number}?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${product.titulo || product.title}`)}`
    : null;

  return (
    <div className="cv-modal-backdrop" onMouseDown={onClose}>
      <section className="cv-detail-modal cv-product-detail" onMouseDown={(e) => e.stopPropagation()}>
        <button className="cv-modal-close" onClick={onClose}>×</button>
        {(product.imagem_url || product.image_url) && (
          <img className="cv-product-large" src={product.imagem_url || product.image_url} alt={product.titulo || product.title} />
        )}
        <span className="cv-kicker">{product.categoria || product.category || "Marketplace"}</span>
        <h2>{product.titulo || product.title}</h2>
        <strong className="cv-product-price">
          {(product.preco != null || product.price != null)
            ? `${Number(product.preco ?? product.price).toLocaleString("pt-PT")} Kz`
            : "Preço sob consulta"}
        </strong>
        <p>{product.descricao || product.description || "Sem descrição disponível."}</p>
        <p className="cv-muted">Condição: {product.condicao || "Excelente"} · Localização: {product.municipio || "Cunene"}</p>

        {whatsappUrl
          ? <a className="cv-gold-button cv-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">Contactar vendedor no WhatsApp</a>
          : <button className="cv-gold-button cv-whatsapp" onClick={() => alert("Mensagem enviada ao vendedor via plataforma CuneneVagas!")}>Contactar Vendedor</button>}
      </section>
    </div>
  );
}

export function ProductsBrowser() {
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      let query = supabase
        .from("marketplace")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80);

      if (search.trim()) query = query.ilike("titulo", `%${search.trim()}%`);
      const { data } = await query;

      if (alive) {
        setProducts(data || []);
        setLoading(false);
      }
    }

    setLoading(true);
    load();

    const channel = supabase
      .channel("marketplace-browser-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace" }, load)
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [search]);

  return (
    <section className="cv-module">
      <div className="cv-module-heading">
        <div><span className="cv-kicker">MERCADO LOCAL</span><h1>Marketplace</h1></div>
        <input className="cv-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar produtos..." />
      </div>

      {loading && <p className="cv-muted">A carregar produtos...</p>}
      <div className="cv-product-grid">
        {products.map((product) => (
          <button className="cv-product-card" key={product.id} onClick={() => setSelected(product)}>
            {(product.imagem_url || product.image_url)
              ? <img src={product.imagem_url || product.image_url} alt={product.titulo || product.title} loading="lazy" />
              : <div className="cv-product-placeholder">CV</div>}
            <div>
              <small>{product.categoria || product.category || "Produto"}</small>
              <h3>{product.titulo || product.title}</h3>
              <strong>
                {(product.preco != null || product.price != null)
                  ? `${Number(product.preco ?? product.price).toLocaleString("pt-PT")} Kz`
                  : "Preço sob consulta"}
              </strong>
              <span>Ver produto →</span>
            </div>
          </button>
        ))}
      </div>

      {selected && <ProductDetails product={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

export function GlobalSearch({ onSelectResult }: { onSelectResult?: (type: string, item: any) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<{ profiles: any[]; companies: any[]; products: any[]; posts: any[] }>({
    profiles: [],
    companies: [],
    products: [],
    posts: []
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults({ profiles: [], companies: [], products: [], posts: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setBusy(true);
      const pattern = `%${term.trim()}%`;

      const [profiles, companies, products, posts] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, role").ilike("full_name", pattern).limit(5),
        supabase.from("companies").select("id, slogan, logo_url, setor").ilike("slogan", pattern).limit(5),
        supabase.from("marketplace").select("id, titulo, imagem_url, preco").ilike("titulo", pattern).limit(5),
        supabase.from("community_posts").select("id, content, author_name, author_avatar").ilike("content", pattern).limit(5),
      ]);

      setResults({
        profiles: profiles.data || [],
        companies: companies.data || [],
        products: products.data || [],
        posts: posts.data || [],
      });
      setBusy(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [term]);

  const hasResults = Object.values(results).some((group) => group.length);

  return (
    <section className="cv-global-search">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Pesquisar pessoas, empresas, produtos e publicações..."
      />
      {busy && <small style={{ display: "block", marginTop: 4, color: "var(--gold)" }}>A pesquisar...</small>}
      {term.trim().length >= 2 && !busy && (
        <div className="cv-search-results">
          {!hasResults && <p className="cv-muted">Nenhum resultado encontrado.</p>}
          {Object.entries(results).map(([type, rows]) => rows.length > 0 && (
            <div key={type}>
              <h4>{({
                profiles: "Pessoas",
                companies: "Empresas",
                products: "Produtos",
                posts: "Publicações",
              } as Record<string, string>)[type]}</h4>
              {rows.map((row) => (
                <div
                  className="cv-search-result"
                  key={row.id}
                  onClick={() => onSelectResult && onSelectResult(type, row)}
                >
                  <span>{row.full_name || row.slogan || row.titulo || row.author_name}</span>
                  <small>{row.role || row.setor || (row.content ? String(row.content).slice(0, 70) + "..." : "")}</small>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
