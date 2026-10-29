(() => {
  "use strict";

  const root = document.documentElement;
  const msg = document.getElementById("msg");
  const out = document.getElementById("out");
  const go = document.getElementById("go");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const themeLabel = document.getElementById("themeLabel");
  const charCount = document.getElementById("charCount");
  const MAX_CHARS = 12000;

  // O resultado é uma estimativa heurística, não uma confirmação criminal.
  // Pesos maiores representam comportamentos de risco mais concretos.
  const rules = [
    {
      id: "credential",
      title: "Pedido de senha ou código de autenticação",
      weight: 5,
      pattern: /\b(?:senha|password|token|c[oó]digo\s+(?:de\s+)?(?:verifica(?:ç[aã]o|r)?|seguran[cç]a|acesso|autentica[cç][aã]o)|c[oó]digo\s+que\s+(?:chegou|recebeu)|confirme\s+(?:seus\s+)?dados|informe\s+(?:sua\s+)?senha)\b/giu,
      explanation: "Compartilhar senhas ou códigos de autenticação pode permitir que alguém invada sua conta. Não os envie por mensagem nem por telefone."
    },
    {
      id: "remote-access",
      title: "Pedido para instalar aplicativo ou dar acesso ao aparelho",
      weight: 5,
      pattern: /\b(?:instale|baix(?:e|ar)|acesse|abra)\b.{0,65}\b(?:anydesk|teamviewer|rustdesk|aplicativo|app|acesso remoto)\b|\b(?:compartilhe|libere|conceda)\b.{0,35}\b(?:tela|acesso remoto|acesso ao celular)\b/giu,
      explanation: "Um falso atendente pode tentar controlar seu dispositivo ou visualizar aplicativos bancários. Só instale ferramentas quando você mesmo tiver confirmado a necessidade com uma fonte confiável."
    },
    {
      id: "payment-pressure",
      title: "Pagamento ou transferência com pressão",
      weight: 4,
      pattern: /\b(?:fa[cç]a|realize|envie|transfira|pague|deposite)\b.{0,55}\b(?:pix|transfer[eê]ncia|dep[oó]sito|pagamento|taxa|boleto|dinheiro)\b|\b(?:pague|pagamento)\b.{0,35}\b(?:taxa|libera[cç][aã]o|cadastro|entrega|pr[eê]mio)\b/giu,
      explanation: "Confirme a cobrança por um canal oficial que você já conheça antes de pagar. A urgência não é prova de legitimidade."
    },
    {
      id: "new-number",
      title: "Possível golpe do número novo",
      weight: 5,
      pattern: /\b(?:troquei de n[uú]mero|n[uú]mero novo|meu celular quebrou|perdi meu celular|salva(?: aí| este n[uú]mero)?|este [ée] meu novo n[uú]mero)\b/giu,
      explanation: "Criminosos podem usar a foto de um conhecido em outro número e pedir dinheiro. Confirme a identidade ligando para o número antigo ou por outro canal."
    },
    {
      id: "urgent-threat",
      title: "Urgência, ameaça ou medo de bloqueio",
      weight: 2,
      pattern: /\b(?:urgente|imediatamente|agora|última chance|bloquead[oa]|suspens[oa]|ser[aá]\s+(?:bloquead[oa]|cancelad[oa])|evite o bloqueio|prazo final|em \d+\s*(?:minutos?|horas?))\b/giu,
      explanation: "Golpistas costumam criar pressão para impedir que você confira a informação. Pare e procure o canal oficial separadamente."
    },
    {
      id: "link",
      title: "Link ou endereço para resolver um suposto problema",
      weight: 2,
      pattern: /\b(?:clique|acesse|entre|confira|regularize|atualize)\b.{0,45}\b(?:link|aqui|cadastro|conta|entrega|benef[ií]cio)\b|https?:\/\/[^\s<>"']+|(?:bit\.ly|tinyurl\.com|cutt\.ly)\/[^\s<>"']*/giu,
      explanation: "Um link pode levar a uma página falsa, mesmo quando a mensagem parece oficial. Não use o link recebido; abra o aplicativo oficial ou digite o endereço conhecido."
    },
    {
      id: "prize-fee",
      title: "Prêmio, benefício ou oferta que exige pagamento",
      weight: 4,
      pattern: /\b(?:voc[eê]\s+ganhou|parab[eé]ns|foi\s+selecionad[oa]|pr[eê]mio|renda extra|vaga garantida|benef[ií]cio liberado)\b/giu,
      explanation: "Promessas inesperadas que exigem taxa, Pix ou dados pessoais são um sinal importante de alerta. Verifique a oferta com a organização por um canal oficial."
    },
    {
      id: "fake-support",
      title: "Possível falsa central ou falso representante",
      weight: 3,
      pattern: /\b(?:central de atendimento|setor de seguran[cç]a|suporte t[eé]cnico|representante do banco|funcion[aá]rio do banco|conta com problema|compra suspeita|atividade suspeita|proteger sua conta)\b/giu,
      explanation: "O nome de uma instituição ou de um setor não comprova a identidade de quem entrou em contato. Encerre o contato e procure o atendimento oficial."
    },
    {
      id: "personal-data",
      title: "Pedido de dados pessoais ou bancários",
      weight: 3,
      pattern: /\b(?:cpf|n[uú]mero do cart[aã]o|dados banc[aá]rios|dados pessoais|c[oó]digo de seguran[cç]a|validar sua identidade|confirmar identidade|informe seus dados)\b/giu,
      explanation: "Não envie documentos, dados bancários ou códigos a um contato inesperado. Confirme primeiro a necessidade diretamente com a instituição."
    },
    {
      id: "spoofing",
      title: "Contato que afirma ser de banco, governo ou empresa",
      weight: 1,
      pattern: /\b(?:anatel|banco|receita federal|inss|pol[ií]cia|correios|transportadora|operadora|gov\.br|suporte|atendimento)\b/giu,
      explanation: "A menção a uma instituição não prova fraude nem autenticidade. Verifique o remetente, o endereço e a solicitação por um canal oficial independente."
    },
    {
      id: "account-takeover",
      title: "Possível tentativa de tomar uma conta",
      weight: 4,
      pattern: /\b(?:recuperar sua conta|reativar sua conta|verifica[cç][aã]o em duas etapas|desativar a autentica[cç][aã]o|perdi acesso|invadiram minha conta|c[oó]digo de login)\b/giu,
      explanation: "Mensagens sobre recuperação de conta podem ser usadas para roubar acesso. Não compartilhe códigos e abra o aplicativo ou site oficial diretamente."
    }
  ];

  function applyTheme(theme) {
    root.dataset.theme = theme;
    const isDark = theme === "dark";
    themeIcon.textContent = isDark ? "☀" : "☾";
    themeLabel.textContent = isDark ? "Tema claro" : "Tema escuro";
    themeToggle.setAttribute("aria-pressed", String(!isDark));
    themeToggle.setAttribute("aria-label", isDark ? "Mudar para tema claro" : "Mudar para tema escuro");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isDark ? "#080d18" : "#f0f5f8";
  }

  let initialTheme = "dark";
  try {
    const savedTheme = localStorage.getItem("site-theme");
    if (savedTheme === "light" || savedTheme === "dark") initialTheme = savedTheme;
  } catch (_) {}
  applyTheme(initialTheme);

  themeToggle.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try { localStorage.setItem("site-theme", nextTheme); } catch (_) {}
  });

  function escapeHTML(value) {
    return value.replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function findMatches(text) {
    const matches = [];
    rules.forEach((rule, index) => {
      rule.pattern.lastIndex = 0;
      for (const match of text.matchAll(rule.pattern)) {
        matches.push({ start: match.index, end: match.index + match[0].length, ruleIndex: index });
      }
    });
    matches.sort((a, b) => a.start - b.start || b.end - a.end);
    return matches;
  }

  function markMessage(text, matches) {
    let html = "";
    let cursor = 0;
    const markedRules = new Set();
    for (const hit of matches) {
      if (hit.start < cursor) continue;
      html += escapeHTML(text.slice(cursor, hit.start));
      html += "<mark>" + escapeHTML(text.slice(hit.start, hit.end)) + "</mark>";
      cursor = hit.end;
      markedRules.add(hit.ruleIndex);
    }
    html += escapeHTML(text.slice(cursor));
    return { html, markedRules };
  }

  function assessRisk(text, matches, markedRules) {
    const matchedIndices = [...markedRules];
    const uniqueWeight = matchedIndices.reduce((sum, index) => sum + rules[index].weight, 0);
    const hasCredential = matchedIndices.some(i => rules[i].id === "credential");
    const hasRemote = matchedIndices.some(i => rules[i].id === "remote-access");
    const hasNewNumber = matchedIndices.some(i => rules[i].id === "new-number");
    const hasPrizeFee = matchedIndices.some(i => rules[i].id === "prize-fee");
    const hasPayment = matchedIndices.some(i => rules[i].id === "payment-pressure");
    const hasLink = matchedIndices.some(i => rules[i].id === "link");
    const hasUrgency = matchedIndices.some(i => rules[i].id === "urgent-threat");
    const hasPersonal = matchedIndices.some(i => rules[i].id === "personal-data");
    const hasFakeSupport = matchedIndices.some(i => rules[i].id === "fake-support");
    let score = Math.min(100, uniqueWeight * 8);
    if (hasCredential) score += 28;
    if (hasRemote) score += 25;
    if (hasNewNumber && hasPayment) score += 25;
    if (hasPrizeFee && hasPayment) score += 20;
    if (hasLink && (hasUrgency || hasPersonal || hasFakeSupport)) score += 15;
    if (hasFakeSupport && (hasCredential || hasRemote || hasPayment)) score += 15;
    if (hasPersonal && hasPayment) score += 10;
    score = Math.min(100, score);

    // Mensagem curta/ambígua não deve receber um diagnóstico categórico.
    const specific = hasCredential || hasRemote || (hasNewNumber && hasPayment) ||
      (hasPrizeFee && hasPayment) || (hasLink && (hasUrgency || hasPersonal || hasFakeSupport));
    let level, title, subtitle, icon;
    if (score >= 65 && specific) {
      level = "high"; title = "Risco alto — fortes sinais de possível golpe";
      subtitle = "A mensagem combina sinais de risco concretos. Não aja antes de confirmar por um canal independente.";
      icon = "⚠";
    } else if (score >= 28 || matchedRulesCount(markedRules) >= 2) {
      level = "medium"; title = "Risco moderado — confira com cuidado";
      subtitle = "Foram encontrados sinais suspeitos, mas o texto sozinho não permite confirmar que seja fraude.";
      icon = "!";
    } else if (score > 0) {
      level = "low"; title = "Alguns sinais de atenção";
      subtitle = "Há elementos que merecem conferência. Eles também podem aparecer em mensagens legítimas.";
      icon = "◇";
    } else {
      level = "none"; title = "Nenhum padrão conhecido foi identificado";
      subtitle = "Isso não significa que a mensagem seja segura: golpes novos ou escritos de outra forma podem passar despercebidos.";
      icon = "✓";
    }
    return { score, level, title, subtitle, icon, specific };
  }

  function matchedRulesCount(set) { return set.size; }

  function renderResults(text) {
    const matches = findMatches(text);
    const { html: markedHTML, markedRules } = markMessage(text, matches);
    const risk = assessRisk(text, matches, markedRules);
    const riskLabels = { high: "Alto", medium: "Moderado", low: "Atenção", none: "Baixo sinal detectado" };
    const signalHTML = [...markedRules].map(index => {
      const rule = rules[index];
      return `<li><strong>${escapeHTML(rule.title)}</strong><p>${escapeHTML(rule.explanation)}</p></li>`;
    }).join("");

    let advice;
    if (risk.level === "high") {
      advice = "Não clique em links, não transfira dinheiro, não instale aplicativos e não compartilhe senhas ou códigos. Confirme a história diretamente com a instituição ou pessoa, usando um contato que você já conhecia.";
    } else if (risk.level === "medium" || risk.level === "low") {
      advice = "Pause antes de agir. Confira o endereço do remetente, não use links recebidos e procure a instituição pelo aplicativo ou site oficial. Se alguém conhecido pediu dinheiro, confirme por ligação no número já salvo.";
    } else {
      advice = "Não foram encontrados os padrões que esta ferramenta reconhece. Ainda assim, confirme pedidos inesperados de dinheiro ou dados por outro canal e não compartilhe códigos de autenticação.";
    }

    out.innerHTML = `
      <div class="risk-heading">
        <div class="risk-icon" aria-hidden="true">${risk.icon}</div>
        <div><h2 class="risk-title">${risk.title}</h2><p class="risk-subtitle">${risk.subtitle}</p></div>
      </div>
      <div class="risk-meter" role="img" aria-label="Indicador heurístico de sinais de risco: ${risk.score} de 100"><span style="width:${risk.score}%;background:${risk.level === "high" ? "var(--danger)" : risk.level === "medium" ? "var(--warning)" : risk.level === "low" ? "var(--link)" : "var(--good)"}"></span></div>
      <div class="meter-label"><span>Indicador de sinais detectados</span><strong>${riskLabels[risk.level]}</strong></div>
      <div class="message-preview">${markedHTML}</div>
      ${markedRules.size ? `<h3>Sinais encontrados (${markedRules.size})</h3><ul class="signal-list">${signalHTML}</ul>` : `<div class="no-signals"><strong>Nenhum sinal das regras atuais apareceu.</strong><p>Isso não confirma a autenticidade da mensagem.</p></div>`}
      <div class="next-step"><strong>O que recomendamos</strong>${escapeHTML(advice)}</div>
      <p class="disclaimer"><strong>Importante:</strong> o indicador é uma estimativa baseada em padrões de texto, não uma probabilidade estatística nem uma confirmação de crime. A ferramenta não consulta bancos de dados de denúncias nem verifica a identidade real do remetente.</p>`;
    out.hidden = false;
    out.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }

  go.addEventListener("click", () => {
    const text = msg.value.trim();
    if (!text) {
      out.innerHTML = '<p class="no-signals">Cole uma mensagem antes de analisar.</p>';
      out.hidden = false;
      msg.focus();
      return;
    }
    renderResults(text);
  });

  msg.addEventListener("input", () => {
    charCount.textContent = `${msg.value.length.toLocaleString("pt-BR")} / ${MAX_CHARS.toLocaleString("pt-BR")}`;
  });

  msg.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      go.click();
    }
  });

  document.querySelectorAll("[data-t]").forEach(button => {
    button.addEventListener("click", () => {
      msg.value = button.dataset.t;
      charCount.textContent = `${msg.value.length.toLocaleString("pt-BR")} / ${MAX_CHARS.toLocaleString("pt-BR")}`;
      msg.focus();
    });
  });
})();