# 💸 Controle Financeiro PWA

Bem-vindo ao **Controle Financeiro**, um aplicativo web progressivo (PWA) construído com foco total em privacidade, velocidade e experiência móvel (Mobile-First). Este projeto foi criado para ajudar na organização de finanças pessoais de forma visual, baseada em blocos de orçamento e sem depender de servidores em nuvem.
<p align="center">
  <img src="https://github.com/user-attachments/assets/4f6bb731-1c5a-4f7c-9cd9-47c0cccdb922" alt="Layout do App" width="300" />
</p>

## 🚀 Funcionalidades Principais

- **100% Offline e Privado:** Todos os seus dados são salvos localmente no seu dispositivo utilizando a tecnologia [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (através do Dexie.js). Nenhuma informação financeira é enviada para servidores externos.
- **Blocos de Orçamento:** Organize seu dinheiro por "caixinhas" (Lazer, Contas, Mercado) e acompanhe visualmente o quanto resta do seu orçamento semanal ou mensal.
- **Calendário Tátil:** Uma visão mensal interativa onde você pode ver exatamente em quais dias houveram gastos ou rendas.
- **Gráficos Dinâmicos:** Acompanhamento visual através de gráficos de pizza (gastos por categoria) e de barras (orçamento vs. gasto).
- **Instalável (PWA):** Adicione à Tela de Início do iOS ou Android para uma experiência de aplicativo nativo (tela cheia, ícone próprio e funcionamento sem internet).
- **Personalização de Categorias:** Crie categorias com cores personalizadas para identificar facilmente para onde o seu dinheiro está indo.

## 🛠️ Tecnologias Utilizadas

Este projeto é totalmente autossuficiente (sem backend) e foi construído com:

- **React 19**
- **TypeScript**
- **Vite** (com `vite-plugin-pwa`)
- **Tailwind CSS v4**
- **Dexie.js** (IndexedDB)
- **Recharts** (Gráficos)
- **Lucide React** (Ícones)

## 💻 Como Rodar Localmente

Qualquer pessoa que fizer um fork deste projeto pode rodá-lo localmente com apenas três passos:

1. Clone o repositório:
   ```bash
   git clone https://github.com/dmdlgg/financial_control.git
   cd financial_control
   ```

2. Instale as dependências (utilize a flag de legacy-peer-deps para evitar conflitos de versão do PWA plugin com o Vite 8):
   ```bash
   npm install --legacy-peer-deps
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

Acesse `http://localhost:5173` no seu navegador. Recomenda-se utilizar as Ferramentas de Desenvolvedor (F12) no modo de visualização de celular para a melhor experiência.

## 📱 Como Instalar no Celular (PWA)

Por ser um Progressive Web App, você não precisa baixar nada na App Store ou Google Play. Basta instalar direto pelo navegador:

**No iPhone (iOS - Safari):**
1. Abra o link do aplicativo no **Safari**.
2. Toque no ícone de **Compartilhar** (o quadrado com uma seta para cima, no menu inferior).
3. Role a tela para baixo e selecione **"Adicionar à Tela de Início"** (Add to Home Screen).
4. Confirme tocando em "Adicionar". O app aparecerá na sua tela inicial como um aplicativo nativo!

**No Android (Chrome):**
1. Abra o link do aplicativo no **Google Chrome**.
2. Toque no ícone de **três pontinhos** (menu) no canto superior direito.
3. Selecione **"Adicionar à tela inicial"** ou "Instalar aplicativo".
4. Confirme a instalação. O ícone aparecerá junto aos seus outros aplicativos.

## 💡 Sugestões e Melhorias

Este projeto está em constante evolução! Estou super aberto a sugestões de novas funcionalidades, melhorias no código ou ajustes visuais. Caso tenha alguma ideia para adicionar no app, sinta-se à vontade para abrir uma *Issue* no repositório ou entrar em contato.

## 📫 Contato e Dúvidas

Se você tiver alguma dúvida ou encontrou algum problema, pode me chamar:

- **Desenvolvedor:** Eduardo Medolago
- **E-mail:** dumedolago@gmail.com
- **GitHub:** [@dmdlgg](https://github.com/dmdlgg)

---
*Feito com dedicação para simplificar a vida financeira.* 💙
