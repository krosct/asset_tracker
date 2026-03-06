# AssetTracker (Frontend)

O **AssetTracker** é uma aplicação web moderna para gerenciamento de portfólio de investimentos. Desenvolvido com foco em performance e experiência do usuário, permite o acompanhamento de ativos, histórico de transações e análise de alocação de carteira através de gráficos interativos.

## 🚀 Funcionalidades

- **Dashboard Interativo**: Visão geral do patrimônio com cartões de resumo e gráficos.
- **Gestão de Ativos**: Adicionar, editar e remover ativos (Ações, FIIs, Tesouro, etc.).
- **Histórico de Transações**: Registro de compras e vendas com filtragem por data.
- **Gráficos de Alocação**: Visualização da distribuição da carteira por classe de ativo.
- **Autenticação Segura**: Login e Registro com suporte a Refresh Token automático.
- **Interface Responsiva**: Design adaptável para desktop e mobile (Dark/Light mode).

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Componentes**: [shadcn/ui](https://ui.shadcn.com/) (@radix-ui)
- **Gerenciamento de Estado/API**: Axios, React Hooks
- **Gráficos**: Recharts
- **Validação de Formulários**: React Hook Form + Zod
- **Ícones**: Lucide React

## ⚙️ Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (v18 ou superior)
- Gerenciador de pacotes (npm, pnpm ou yarn)
- Backend do AssetTracker rodando (API)

## 🔧 Instalação e Configuração

1. **Clone o repositório**
   ```bash
   git clone [https://github.com/seu-usuario/front-asset-tracker.git](https://github.com/seu-usuario/front-asset-tracker.git)
   cd front-asset-tracker 
   ```

2. **Instale as dependências**
    ```bash
    npm install
    # ou
    pnpm install
   ```

3. **Configure as Variáveis de Ambiente Crie um arquivo .env.local na raiz do projeto e configure a URL da API:**
    ```bash
    NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

4. **Execute o projeto O projeto está configurado para rodar na porta 3001 (conforme package.json).**
    ```bash
    npm run dev
   ```

5. **Acesse a aplicação Abra seu navegador em http://localhost:3001.**

# Arquitetura e Estrutura do Projeto

Este documento descreve a organização das pastas e as decisões arquiteturais adotadas no projeto **Front Asset Tracker**.

## 🏗 Visão Geral da Arquitetura

O projeto é uma **Single Page Application (SPA)** construída sobre o framework **Next.js** utilizando o **App Router**. A aplicação consome uma API REST externa e gerencia o estado da interface principalmente no lado do cliente (Client-Side Rendering).

### Principais Decisões Técnicas

* **Framework**: [Next.js 16](https://nextjs.org/) com App Router para roteamento e otimização.
* **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/) com design system baseado em [Shadcn/UI](https://ui.shadcn.com/) (Radix UI).
* **Gerenciamento de Estado**:
    * Local State (`useState`) para UI interativa.
    * Context API para estados globais como Autenticação (`useAuth`).
* **Comunicação com API**: [Axios](https://axios-http.com/) configurado com *Interceptors* para injeção automática de tokens JWT e tratamento de *Refresh Token*.
* **Formulários e Validação**: [React Hook Form](https://react-hook-form.com/) integrado com [Zod](https://zod.dev/) para validação de schemas.

---

## 📂 Estrutura de Pastas

A organização do projeto segue uma abordagem modular, separando componentes genéricos de UI dos componentes de negócio (features).

```text
/
├── app/                        # Next.js App Router (Páginas e Rotas)
│   ├── dashboard/              # Rota protegida do painel principal
│   │   └── page.tsx            # Página principal do Dashboard
│   ├── login/                  # Rota pública de Login
│   ├── register/               # Rota pública de Registro
│   ├── layout.tsx              # Layout raiz (Root Layout)
│   └── globals.css             # Estilos globais e diretivas do Tailwind
│
├── components/                 # Componentes React
│   ├── dashboard/              # Componentes de Negócio (Específicos do Domínio)
│   │   ├── assets-list.tsx     # Listagem de ativos financeiros
│   │   ├── allocation-chart.tsx# Gráfico de alocação de carteira
│   │   ├── summary-cards.tsx   # Cards de resumo financeiro
│   │   └── ... (modais de add/edit)
│   │
│   ├── ui/                     # Design System (Shadcn UI)
│   │   ├── button.tsx          # Botões reutilizáveis
│   │   ├── card.tsx            # Cards de container
│   │   ├── input.tsx           # Campos de entrada
│   │   └── ... (outros componentes base)
│   │
│   └── theme-provider.tsx      # Provider para Dark/Light mode
│
├── hooks/                      # Custom React Hooks
│   ├── use-auth.tsx            # Lógica de Autenticação (Login, Logout, Sessão)
│   ├── use-toast.ts            # Hook para notificações (Sonner/Toast)
│   └── use-mobile.ts           # Detecção de viewport mobile
│
├── lib/                        # Utilitários e Configurações de Infra
│   ├── api.ts                  # Instância do Axios (Base URL, Interceptors)
│   └── utils.ts                # Funções auxiliares (cn, formatadores)
│
├── public/                     # Arquivos Estáticos
│   └── ... (ícones, logos, imagens)
│
└── ... (Arquivos de configuração na raiz: package.json, tsconfig.json, etc.)
