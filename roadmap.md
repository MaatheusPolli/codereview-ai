# 🗺️ Roadmap Estratégico — CodeReview AI

Este documento descreve a visão de evolução do **CodeReview AI**, transformando-o de um MVP de revisão local para uma ferramenta indispensável no fluxo de trabalho de engenharia.

---

## 🌅 Horizonte 1 — Quick wins (Concluído ✅)
*Foco em estabilidade, percepção de valor imediata e qualidade do código.*

| Melhoria | Impacto | Esforço | Status |
| :--- | :--- | :---: | :--- |
| **Resiliência no Parsing de JSON** | Evita falhas quando a IA adiciona comentários ou markdown. | P | ✅ 09/03/2026 |
| **Syntax Highlighting (Prism.js)** | Melhora drasticamente a experiência de leitura do código. | P | ✅ 09/03/2026 |
| **Language Detection Nativa** | Usa a `Language Detection API` do Chrome para arquivos sem extensão. | M | ✅ 09/03/2026 |
| **Suporte a Markdown em Sugestões** | Permite que a IA envie blocos de código formatados. | P | ✅ 09/03/2026 |
| **Testes de Unidade (Services)** | Garante que novas regras de Regex não quebrem funcionalidades. | M | ✅ 09/03/2026 |

---

## 🚀 Horizonte 2 — Evolução (Em andamento)
*Foco em customização, produtividade e integração.*

| Melhoria | Impacto | Esforço | Status |
| :--- | :--- | :---: | :--- |
| **Gestão de Regras Customizadas** | UI para usuários adicionarem seus próprios Regex e contexto (.md). | M | ✅ 09/03/2026 |
| **Histórico com Analytics** | Dashboard mostrando a evolução da qualidade. | M | ✅ 09/03/2026 |
| **Contextos Especializados** | Refinamento de bibliotecas para Pascal e SQL. | P | ✅ 09/03/2026 |
| **Revisão de Diretórios (FS API)** | Permite revisar projetos inteiros via File System Access API. | G | ⏳ Adiado (G) |
| **Integração com Git Hooks** | Script CLI para rodar revisões críticas localmente. | M | ⏳ Próxima sessão |

---

## 🔭 Horizonte 3 — Visão
*Foco em escala, automação inteligente e colaboração.*

| Melhoria | Impacto | Esforço | Status |
| :--- | :--- | :---: | :--- |
| **Auto-Fix (Refatoração)** | IA propõe e aplica a correção diretamente no código original. | G | ⏳ Adiado (G) |
| **Extensão para VS Code** | Integra o motor de revisão diretamente no ambiente. | G | ⏳ Adiado (G) |

---

## 📝 Log da Sessão — 09 de Março de 2026
- **Implementado:** Robustez no `aiService.js` com retry logic (2 tentativas) e extrator de JSON resiliente.
- **Implementado:** Syntax Highlighting no editor (sincronização textarea/pre) e nas sugestões via Prism.js.
- **Implementado:** Sistema de Abas (Analysis, History, Settings) para melhor navegação.
- **Implementado:** Dashboard de Analytics básico mostrando total de revisões e severidade.
- **Implementado:** Gestão de Contextos Customizados salvos no `localStorage`.
- **Implementado:** Detecção Heurística de Linguagem + API Nativa do Chrome.
- **Expandido:** Suíte de testes unitários para cobrir novos casos de detecção e regras sênior de Regex.
- **Adiado:** Itens de esforço G (Diretórios, Auto-Fix) documentados para horizontes futuros devido à complexidade de segurança e arquitetura.

---

## 🛠️ Priorização Imediata (Next Steps)
1. **Refatoração do `aiService.js`:** Implementar um parser de JSON mais robusto usando `try-catch` e limpeza de strings.
2. **Setup de Vitest:** Criar a infraestrutura de testes para validar o `RegexService`.
3. **UI de Edição de Contexto:** Adicionar uma aba "Configurações" para que o usuário não dependa de arquivos estáticos no repositório.
