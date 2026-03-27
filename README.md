# 🎙️ FinVocalist AI
> **If Siri and your bank app had a baby.**

FinVocalist AI is a **voice-first personal finance copilot** designed to help users handle their finances conversationally ask questions, get insights, and (optionally) take actions using natural language.

Examples:
- “How much did I spend on food this week?”
- “Can I afford ₦50,000 on a new phone this month?”
- “Summarize my account activity and highlight anything unusual.”

---

## 🧩 Problem

Personal finance tools often fail because:
- dashboards are too complex for everyday users,
- insights are buried in charts and tables,
- tracking spending takes time and discipline,
- many products are not localized to Nigerian realities.

People don’t want to “do finance homework”, they want **quick answers**.

---

## 🛠️ Approach

FinVocalist approaches finance as a conversation:
- **voice-first UX**: ask naturally, get a clear response
- **narrative explanations**: numbers → plain-English meaning
- **insight-first design**: prioritize “what matters” over raw dashboards
- **modular services**: so bank integrations, categorization, and insights can evolve independently

This repo currently contains a TypeScript React frontend built with Vite (`npm run dev`).

---

## 📈 Impact

- Makes money management accessible even for non-technical users
- Reduces friction: users can “talk to their money” instead of navigating screens
- Creates a foundation for:
  - budgeting assistants,
  - anomaly/fraud detection prompts,
  - savings goal coaching,
  - personalized spending behavior insights

---

## 🧱 Tech Stack (current repo)

- React 18 + TypeScript
- Vite
- Playwright (testing)
- Recharts (charts/visualizations)
- `@google/genai` (AI integration library)

---

## 🗂️ Project Structure (current)

```text
finvocalist-ai/
├── App.tsx
├── index.tsx
├── index.html
├── vite.config.ts
├── package.json
├── components/
├── hooks/
├── services/
├── docs/
├── tests/
├── backend/    # folder present (implementation/WIP)
└── server/     # folder present (implementation/WIP)
```

---

## ✅ Prerequisites

- Node.js 18+ recommended
- npm

---

## 🚀 Quick Start (Frontend)

```bash
git clone https://github.com/kenechukwuosele/finvocalist-ai.git
cd finvocalist-ai
npm install
npm run dev
```

Vite will print the local URL (typically `http://localhost:5173`).

---

## 🔑 Configuration (recommended pattern)

If you are calling AI models from the browser:

```env
VITE_AI_PROVIDER=google
VITE_GOOGLE_GENAI_API_KEY=your_key_here
```

**Recommended for production:** keep API keys on a server and expose only a safe API to the frontend.

---

## 🧪 Testing

```bash
npx playwright test
```

---

## 🛣️ Roadmap (suggested)

- [ ] Voice input + transcription UX (push-to-talk, streaming, etc.)
- [ ] “Finance memory”: recurring bills, goals, budget rules
- [ ] Bank/fintech integrations (manual import, CSV, or API where available)
- [ ] Safety layer: confirmations for actions (“Do you want to transfer ₦5,000?”)
- [ ] Insights: anomaly detection, subscription detection, spend forecasting

---

## 🤝 Contributing

PRs welcome—especially around:
- voice UX
- agent design + prompts
- finance categorization + insights
- tests

---

## 📄 License

Add a `LICENSE` file if you want open-source usage terms.
