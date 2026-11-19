





# RAG Document Q&A Assistant

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)
![Chroma](https://img.shields.io/badge/Chroma-0.5+-FF6B4A?style=flat-square&logo=databricks&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=flat-square&logo=openai&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-Framework-1C3C3C?style=flat-square&logo=chainlink&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-UI-FF4B4B?style=flat-square&logo=streamlit&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Models-FFD21E?style=flat-square&logo=huggingface&logoColor=black)

A retrieval-augmented generation (RAG) system that answers questions from your own PDF collection. It extracts text, chunks documents, stores embeddings locally, and produces grounded answers with source citations. The design starts with PDF-only retrieval and is structured to accept web search and re-ranking as additive modules.

## Architecture


PDFs ──► Text Extraction ──► Cleaning ──► Chunking ──► Embeddings ──► Chroma (Local)
                                                                             │
User Query ──► Embed Query ──► Top-k Retrieval ──► Prompt Assembly ──► LLM ──► Answer + Citations


## Features

- **Local-first PDF retrieval** — Documents stay on your machine; only the query and retrieved chunks are sent to the LLM provider.
- **Page-level citations** — Every answer includes the source document name and page number so claims are verifiable.
- **Modular ingestion pipeline** — Swappable PDF loaders, chunkers, and embedders without touching downstream code.
- **Evaluation harness** — A golden-question set and scoring script to measure retrieval recall and answer faithfulness before adding complexity.
- **Extensible retrieval** — Pre-wired interfaces for adding a re-ranker and a web-search tool as a fallback retriever.
- **FastAPI backend** — A single `/ask` endpoint ready for integration with any frontend or agent.
- **Streamlit UI** — A minimal chat interface for non-technical users to query the document base.

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Language** | ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white) | Core implementation for ingestion, retrieval, and generation |
| **PDF Parsing** | ![pypdf](https://img.shields.io/badge/pypdf-Text_Extraction-2C3E50?style=flat-square&logo=adobeacrobatreader&logoColor=white) | Extract text from standard PDFs; Docling for complex layouts |
| **Embeddings** | ![OpenAI](https://img.shields.io/badge/OpenAI_Embeddings-412991?style=flat-square&logo=openai&logoColor=white) | Convert chunks and queries into dense vectors |
| **Vector Store** | ![Chroma](https://img.shields.io/badge/Chroma-Vector_DB-FF6B4A?style=flat-square&logo=databricks&logoColor=white) | Local, persistent storage for embeddings and metadata |
| **Orchestration** | ![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square&logo=chainlink&logoColor=white) | Chunking, retrieval chains, and prompt templates |
| **LLM** | ![OpenAI](https://img.shields.io/badge/OpenAI_GPT-412991?style=flat-square&logo=openai&logoColor=white) | Generate grounded answers from retrieved context |
| **Backend** | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) | REST API for question-answering |
| **Frontend** | ![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=flat-square&logo=streamlit&logoColor=white) | Minimal chat interface |
| **Deployment** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) | Containerized deployment for reproducibility |

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-username/rag-assistant.git
cd rag-assistant
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Set your API key and model preferences:

```env
NVIDIA_API_KEY=
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4o-mini
CHROMA_PERSIST_DIR=./data/chroma
```

Set `NVIDIA_API_KEY` on the backend to enable hosted NVIDIA chat for users without a personal key. Keep the value in the server environment or an uncommitted `.env` file; never expose it through frontend configuration. Users can also configure their own provider keys in Settings.

### 3. Add documents and build the index

Place your PDFs in `data/pdfs/`, then run:

```bash
python scripts/ingest.py
```

This extracts text, chunks each document, generates embeddings, and persists the vector store locally.

### 4. Ask a question

**Option A — CLI**

```bash
python scripts/query.py "What does the policy say about data retention?"
```

**Option B — API**

```bash
uvicorn src.api.main:app --reload
```

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What does the policy say about data retention?"}'
```

**Option C — Streamlit UI**

```bash
streamlit run ui/app.py
```

### Run the full local preview (macOS)

Install the backend and frontend dependencies once, then start both servers and open the browser:

```bash
uv venv .venv --python 3.11
uv pip install --python .venv/bin/python -r requirements.txt
npm --prefix frontend install
bash scripts/dev.sh
```

The preview opens at `http://127.0.0.1:3000`; the API health check is at `http://127.0.0.1:8000/health`. Press `Ctrl+C` to stop both servers. Web search uses free public metasearch with a Wikipedia fallback and needs no search API key.

## Project Structure

```text
rag-assistant/
├── data/
│   ├── pdfs/                  # Source documents
│   ├── processed/             # Extracted text and chunks
│   └── eval/golden_questions.json
├── src/
│   ├── ingestion/             # pdf_loader, cleaner, chunker
│   ├── embeddings/            # embedder, vector_store
│   ├── retrieval/             # retriever, reranker, web_search
│   ├── generation/            # prompt_builder, llm_client
│   ├── agent/                 # router (web-search decision)
│   └── api/                   # FastAPI application
├── scripts/
│   ├── ingest.py              # Build the vector index
│   ├── query.py               # CLI query interface
│   └── evaluate.py            # Score against golden questions
├── ui/app.py                  # Streamlit chat frontend
├── tests/
├── .env.example
├── requirements.txt
└── docker-compose.yml
```

## Evaluation

A RAG system without measurement is guesswork. Before tuning chunk size, retrieval depth, or model choice, establish a baseline:

1. Write 30–50 questions whose answers exist in your PDFs. Record the correct document and page for each.
2. Run `python scripts/evaluate.py`.
3. Track two metrics:
   - **Retrieval recall** — did the correct chunk appear in the top-k results?
   - **Answer faithfulness** — does the generated answer stay within the retrieved context?

Tune chunking and top-k first. Only add a re-ranker if retrieval recall is already high but answer quality remains low.

## Roadmap

- [x] PDF ingestion and chunking pipeline
- [x] Local Chroma vector store with metadata
- [x] Citation-aware answer generation
- [x] FastAPI endpoint and Streamlit UI
- [ ] Cross-encoder re-ranking for higher precision
- [ ] Web-search tool as a fallback retriever
- [ ] LLM-driven router for PDF-vs-web decision
- [ ] Docker Compose deployment profile

## License

MIT
