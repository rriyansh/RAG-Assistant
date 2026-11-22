# Reso Agent

Find answers in your documents, write code, and work with your connected apps in one conversation.

![Reso Agent preview with the workspace logo on a soft black and lavender gradient](frontend/public/reso-preview.jpg)

Reso Agent pairs a Next.js chat workspace with a Python API. Use **Chat** to talk to your chosen model, or switch to **Agent** when a task needs a tool. For example, you can ask for a summary of an indexed PDF, open the cited page to check the answer, then ask the agent to prepare a GitHub change.

## Answers, sources and connections

Chat answers directly when it has enough information. For missing or time-sensitive public facts, the model can request a search. Reso uses the returned passages to compose an answer and shows the source links. Search failures leave the model a chance to explain what it could verify. Public searches can transmit details from your request to a search provider.

Agent uses the enabled tools in the workspace. Open `/settings/connectors`, select a service and complete its authorization or credential form. Use the connector in Agent to restrict that request to its tools. GitHub has a dedicated authorization page. Other connectors describe their supported operations and required credentials in the catalog. External writes marked for consent pause for approval.

The composer shows **Thinking…** immediately and reports subsequent search and tool activity. New model configurations default to a 4,096-token output budget. To change an existing configuration, open `/settings/model` and set the output limit for the active mode. The selected model and provider must support that budget.

## Multi-model routing

NVIDIA NIM, official DeepSeek and Ollama chat requests use LiteLLM. Open Settings → Model to load model IDs advertised by the selected provider. Some advertised models serve other tasks and do not support chat or tools. A manual model ID is available if discovery fails.

For local inference, select Ollama and an installed model. Set `OLLAMA_BASE_URL` to an Ollama server reachable from the backend. Set `RESO_OLLAMA_FALLBACK_MODEL` to an installed model to retry eligible cloud availability and quota failures locally. Cloud calls use your provider account and can incur charges. For operation without metered cloud inference, select Ollama for both Chat and Agent.

## Run locally

Use Python 3.11 and Node.js 20, matching the project's container images. From a terminal on macOS or Linux:

```bash
git clone https://github.com/rriyansh/RAG-Assistant.git
cd RAG-Assistant
cp .env.example .env
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm --prefix frontend install
```

On Windows, create the environment with `py -3.11 -m venv .venv` and activate it in PowerShell with `.\.venv\Scripts\Activate.ps1`.

For hosted NVIDIA chat, put your `NVIDIA_API_KEY` in the root `.env` and keep `LLM_PROVIDER=nvidia`. This lets visitors use the backend operator's key, subject to its quota and billing. For a personal provider key, start the app and open **Settings → API Keys**.

Start the API in the activated Python environment:

```bash
uvicorn src.api.main:app --reload --port 8000
```

In a second terminal, from the repository root:

```bash
npm --prefix frontend run dev
```

Open the [workspace](http://localhost:3000), complete onboarding, and send a message. Check [API health](http://localhost:8000/health) or browse the [interactive API docs](http://localhost:8000/docs) if the frontend cannot reach the backend.

**Docker alternative.** After configuring `.env`, run `docker compose up --build api frontend`. The web app uses port 3000 and the API uses port 8000. Compose mounts the host's `data/` directory into the API container so its files survive container replacement.

## Working with Reso

| Task | Where to go | What happens |
| --- | --- | --- |
| Choose an identity | Onboarding or Settings → Profile | Pick a user portrait, name your assistant, and choose an agent mascot or upload an image. |
| Set up a model | Settings → API Keys and Model | Configure Chat and Agent separately. Recognizable key prefixes select a provider automatically, and you can select a provider yourself. |
| Connect an app | Settings → Connectors | Search the directory and choose **Connect**. Connected services appear first with controls to disconnect or use them in Agent mode. |
| Review agent work | Agent conversation | Follow tool activity, inspect proposed GitHub changes, and respond to approval prompts for actions that require consent. |
| Keep a response | Actions under an assistant message | Copy text, export a response, or download code extracted from fenced code blocks. |

The connector directory includes **35 entries across five categories**, including two built-in knowledge tools. Each entry describes the operations it exposes. For example, Vercel lists recent deployments, Linear reads assigned issues, and GitHub supports repository search, file reads, issues, and commits. A provider key enables model inference. Each external connector uses separate credentials for its service.

## Ask questions about your documents

1. Put your PDFs in `data/pdfs/`. You can also list source URLs in `data/urls.txt`.
2. Choose an embedding provider in `.env`. The default is Ollama with `nomic-embed-text`. With Ollama running locally, download the model using `ollama pull nomic-embed-text`. Alternatively, set `EMBEDDING_PROVIDER=openai` and supply `OPENAI_API_KEY`.
3. From the activated Python environment, run `python scripts/ingest.py`. The script reads the sources, splits their text into overlapping chunks, computes embeddings, and rebuilds the configured Chroma collection. Keep all sources you want indexed in the input set before rerunning it.
4. In Agent mode, try **“Search my PDFs for the cancellation policy and cite the relevant pages.”** Use the document names and page references to check the result.

Use the same embedding provider and model for indexing and retrieval. If the API runs in Docker and Ollama runs on the host, set `OLLAMA_BASE_URL` to an address reachable **from the container**.

## Technology stack

![Next.js](https://img.shields.io/badge/Next.js-141417?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232a?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-0f172a?logo=tailwindcss&logoColor=38BDF8)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-007E70?logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-086DD7?logo=docker&logoColor=white)

| Layer | Implementation |
| --- | --- |
| Web workspace | Next.js App Router, React, TypeScript, Tailwind CSS, and Lucide icons |
| HTTP API | Python, FastAPI, Pydantic, and Uvicorn |
| Document search | pypdf extraction, configurable chunking, OpenAI or Ollama embeddings, and persistent Chroma storage |
| Agent tools | Python tool registry, service-specific connector handlers, and GitHub change review |
| Model access | Hosted NVIDIA, user-configured providers, Ollama, and custom OpenAI-compatible endpoints |
| Deployment | Separate API and frontend containers, with shared application data persisted on the backend |

## Configuration and source guide

| Setting | Where to set it | Purpose |
| --- | --- | --- |
| `LLM_PROVIDER`, `NVIDIA_API_KEY`, `NVIDIA_MODEL` | Backend environment | Select the hosted inference provider and model. Keep the operator's key server-side. |
| `EMBEDDING_PROVIDER`, `CHROMA_PERSIST_DIR` | Backend and ingestion environment | Choose the embedding service and local index location. |
| `RAG_BACKEND_URL` | Frontend server environment | Point Next.js API requests at the FastAPI service when deploying separately. |
| `SITE_URL` | Frontend server environment | Set the public origin used in sharing metadata, robots.txt, and sitemap.xml when a canonical deployment URL is needed. |

See the [configuration template](.env.example) for model, retrieval, and chunking settings. The [web workspace](frontend/), [API routes](src/api/), [agent tools](src/agent/), and [ingestion script](scripts/ingest.py) are the main entry points for development. Run `npm --prefix frontend run build` to check the production frontend build.

## License

Released under the [MIT License](LICENSE).
