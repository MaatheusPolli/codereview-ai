# 🔍 CodeReview AI — Revisor de Código Sênior Offline

![Versão](https://img.shields.io/badge/vers%C3%A3o-0.0.1-blue)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)
![Status](https://img.shields.io/badge/status-MVP-orange)
![Chrome AI](https://img.shields.io/badge/Chrome%20AI-Gemini%20Nano-blueviolet)

> Seu revisor sênior particular, 100% offline e treinado nos padrões da sua empresa. 

O **CodeReview AI** é uma ferramenta de análise de código estática e semântica que roda inteiramente no navegador. Utilizando a inteligência artificial integrada do Google Chrome (**Gemini Nano**), ele revisa seu código em busca de bugs, falhas de segurança e desvios de padrão sem que uma única linha de código saia da sua máquina.

---

## 🎯 Para quem é este projeto?
- **Desenvolvedores Sêniores:** Para automatizar revisões de rotina (nomenclatura, logs esquecidos).
- **Equipes com Restrições de Segurança:** Para revisar código proprietário sem risco de vazamento para nuvens públicas.
- **Engenheiros de QA/Segurança:** Para varreduras rápidas de SQL Injection ou credenciais expostas em arquivos de configuração.

---

## 🚀 Funcionalidades (Recém-Implementadas)

- **Análise Semântica Resiliente:** Motor de IA com lógica de retry e parsing de JSON robusto para evitar falhas de formatação do Gemini Nano.
- **Syntax Highlighting Real-time:** Editor integrado com realce de sintaxe via Prism.js para JavaScript, Pascal, SQL e XML.
- **Dashboard de Analytics:** Visualize a evolução da qualidade do seu código através de métricas de severidade e histórico de revisões.
- **Gestão de Padrões Customizados:** Interface para editar as regras de contexto da empresa diretamente no navegador, com persistência local.
- **Detecção Inteligente de Linguagem:** Identificação automática de arquivos sem extensão usando heurísticas sêniores e a `Language Detection API` do Chrome.
- **Suporte a Markdown:** Sugestões de correção ricas com blocos de código formatados.

---

## 🚀 Como Funciona (Arquitetura Atualizada)

1.  **Detecção Inteligente:** Identifica se o código é Pascal, JavaScript, SQL ou XML via heurística ou `LanguageDetectorService`.
2.  **Motor de Regex (Dual Engine):** O `RegexService` sinaliza erros críticos (ex: `eval()`, `DELETE` sem `WHERE`) instantaneamente.
3.  **Injeção de Contexto Dinâmica:** Carrega regras de `context/` ou suas personalizações do `localStorage`.
4.  **Processamento Local (Gemini Nano):** Análise semântica offline em chunks de 300 linhas com retry logic.
5.  **Analytics & Histórico:** Armazenamento local no IndexedDB com dashboard de visualização de progresso.

---

## 🛠️ Instalação e Configuração

### 1. Pré-requisitos (Configuração do Ambiente)
Como este projeto utiliza APIs experimentais do Chrome, você **deve** configurar as seguintes flags:

1.  Abra o Chrome (versão 127 ou superior).
2.  Acesse `chrome://flags` e ative:
    - **Prompt API for Gemini Nano:** `Enabled`
    - **Enabling optimization guide on-device model:** `Enabled BypassPrefRequirement`
3.  Reinicie o navegador.
4.  Aguarde o download do modelo (aprox. 1.5GB). Você pode verificar o status em `chrome://components` procurando por "Optimization Guide On Device Model".

### 2. Rodando o Projeto
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/1-codereview-ai.git

# Entre na pasta
cd 1-codereview-ai

# Instale o servidor de desenvolvimento
npm install

# Inicie o servidor
npm start
```
Acesse: `http://localhost:8080`

---

## 📖 Exemplos de Uso Real

### Cenário 1: Segurança em SQL
**Entrada:**
```sql
UPDATE Usuarios SET Ativo = 1
```
**Resultado do CodeReview AI:**
- 🔴 **CRÍTICO (Regex):** UPDATE sem cláusula WHERE detectado. Isso afetará todas as linhas da tabela.
- 🟡 **MÉDIO (IA):** Sugestão de uso de transações para operações de escrita em massa.

### Cenário 2: Padrões Legacy (Delphi/Pascal)
**Entrada:**
```pascal
try
  PerformTask;
except
end;
```
**Resultado do CodeReview AI:**
- 🔴 **CRÍTICO (Regex):** Bloco `except` vazio detectado. Exceções estão sendo silenciadas, o que dificulta o debug.
- 🟢 **BAIXO (IA):** Sugestão de implementar `TLogger.Error()` conforme definido em `context/pascal.md`.

---

## ⚙️ Configuração de Variáveis (Browser)
Este projeto é puramente client-side. Não utiliza arquivos `.env`. Todas as configurações são baseadas nas flags do Chrome mencionadas acima.

---

## 🤝 Contribuição e Licença
Contribuições são bem-vindas! Sinta-se à vontade para abrir Issues ou Pull Requests.
Distribuído sob a licença **MIT**.

---
Matheus Gasparotto Polli
