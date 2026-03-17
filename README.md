# 🔍 CodeReview AI — Revisor Sênior Offline (v0.0.2)

O **CodeReview AI** é uma **Prova de Conceito (PoC)** e um projeto de estudo focado na exploração das capacidades da IA nativa do Chrome. Ele utiliza o modelo **Gemini Nano** (Window AI) para realizar revisões de código de forma 100% local, garantindo privacidade absoluta e explorando o futuro das IAs "Edge".

> [!IMPORTANT]  
> Este é um **protótipo experimental**. Seu objetivo principal é demonstrar a viabilidade de análises semânticas locais no navegador e servir como base de estudo para as novas APIs de IA do Google Chrome.

## 🚀 Funcionalidades Principais

- **Revisão Especialista (Senior Review):** O sistema opera permanentemente no modo Expert, focando em bugs críticos, falhas de segurança (Injection, XSS), Memory Leaks, Escalabilidade e falhas lógicas.
- **Recuperação Inteligente de JSON:** Lógica avançada para lidar com as respostas do Gemini Nano, garantindo a exibição correta mesmo em modelos mais leves.
- **Comparação Visual Antes/Depois:** Blocos visuais que mostram o código original e a sugestão de refatoração para facilitar a análise.
- **Privacidade por Design:** Como o processamento ocorre no dispositivo, nenhuma linha de código sai da máquina do usuário.

## 🛠️ Objetivos de Estudo (v0.0.2)

- **Estudo de Prompt Engineering:** Otimização de instruções para modelos locais menores.
- **Resiliência de Parsing:** Criação de parsers tolerantes a falhas para saídas de IA não determinísticas.
- **Web AI Integration:** Demonstração prática da integração com a API `window.ai`.

## 📦 Instalação e Configuração

1.  **Requisitos:** Google Chrome (Dev ou Canary) versão 128+.
2.  **Ativar IA Nativa:**
    - Vá em `chrome://flags/#optimization-guide-on-device-model` -> Defina como **Enabled (BypassPrefRequirement)**.
    - Vá em `chrome://flags/#prompt-api-for-gemini-nano` -> Defina como **Enabled**.
3.  **Executar:**
    ```bash
    npx http-server .
    ```

## 📄 Licença
MIT © 2026 Matheus Gasparotto Polli
