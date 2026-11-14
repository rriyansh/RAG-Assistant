"""Streamlit chat frontend for SecureDoc AI."""

import os
import streamlit as st
import requests
import json

# Configuration
API_URL = os.getenv("API_URL", "http://localhost:8000")

st.set_page_config(
    page_title="SecureDoc AI",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded"
)


def check_api_health():
    """Check if API is reachable."""
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        return response.status_code == 200, response.json()
    except Exception:
        return False, {}


def ingest_documents(pdf_dir: str):
    """Trigger document ingestion via API."""
    try:
        response = requests.post(
            f"{API_URL}/ingest",
            json={"pdf_dir": pdf_dir},
            timeout=300
        )
        return response.status_code == 200, response.json()
    except Exception as e:
        return False, {"error": str(e)}


def query_api(query: str, top_k: int = 8, use_reranker: bool = True, use_web_search: bool = True):
    """Query the RAG API."""
    try:
        response = requests.post(
            f"{API_URL}/query",
            json={
                "query": query,
                "top_k": top_k,
                "use_reranker": use_reranker,
                "use_web_search": use_web_search
            },
            timeout=60
        )
        return response.status_code == 200, response.json()
    except Exception as e:
        return False, {"error": str(e)}


def main():
    # Sidebar
    with st.sidebar:
        st.title("📄 SecureDoc AI")
        st.markdown("---")

        # API Health Check
        st.subheader("System Status")
        healthy, health_data = check_api_health()
        if healthy:
            st.success("✅ API Connected")
            stats = health_data.get("vector_store_stats", {})
            st.metric("Indexed Chunks", stats.get("total_chunks", 0))
        else:
            st.error("❌ API Disconnected")
            st.info(f"Expected at: {API_URL}")

        st.markdown("---")

        # Ingestion Section
        st.subheader("📥 Ingest Documents")
        pdf_dir = st.text_input("PDF Directory", value="./data/pdfs")
        if st.button("Start Ingestion", type="primary"):
            with st.spinner("Processing PDFs... This may take a while."):
                success, result = ingest_documents(pdf_dir)
                if success:
                    st.success(f"✅ Ingested {result.get('chunks_processed', 0)} chunks!")
                else:
                    st.error(f"❌ Failed: {result.get('error', 'Unknown error')}")

        st.markdown("---")

        # Settings
        st.subheader("⚙️ Query Settings")
        top_k = st.slider("Top K Results", 1, 20, 8)
        use_reranker = st.checkbox("Use Reranker", value=True)
        use_web_search = st.checkbox("Enable Web Search", value=True)

    # Main Chat Interface
    st.title("💬 Chat with your Documents")

    # Initialize chat history
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            if message["role"] == "assistant" and "sources" in message:
                with st.expander("📚 Sources"):
                    for src in message["sources"]:
                        st.markdown(f"- **{src['source']}** (p.{src['page']}) - Score: {src['score']:.3f}")
                        st.caption(src["text_preview"])
            if message["role"] == "assistant" and "web_results" in message and message["web_results"]:
                with st.expander("🌐 Web Search Results"):
                    for wr in message["web_results"]:
                        st.markdown(f"- [{wr['title']}]({wr['url']})")
                        st.caption(wr["content"][:200] + "...")

    # Chat input
    if prompt := st.chat_input("Ask a question about your documents..."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Get assistant response
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                success, result = query_api(
                    prompt,
                    top_k=top_k,
                    use_reranker=use_reranker,
                    use_web_search=use_web_search
                )

            if success:
                answer = result.get("answer", "No answer generated.")
                st.markdown(answer)

                # Store full message with metadata
                msg = {
                    "role": "assistant",
                    "content": answer,
                    "sources": result.get("sources", []),
                    "web_results": result.get("web_results", []),
                    "web_search_used": result.get("web_search_used", False)
                }
                st.session_state.messages.append(msg)

                # Show sources
                if result.get("sources"):
                    with st.expander("📚 Sources"):
                        for src in result["sources"]:
                            st.markdown(f"- **{src['source']}** (p.{src['page']}) - Score: {src['score']:.3f}")
                            st.caption(src["text_preview"])

                if result.get("web_search_used") and result.get("web_results"):
                    with st.expander("🌐 Web Search Results"):
                        for wr in result["web_results"]:
                            st.markdown(f"- [{wr['title']}]({wr['url']})")
                            st.caption(wr["content"][:200] + "...")
            else:
                error_msg = f"Error: {result.get('error', 'Unknown error')}"
                st.error(error_msg)
                st.session_state.messages.append({"role": "assistant", "content": error_msg})

    # Clear chat button
    if st.session_state.messages:
        if st.button("🗑️ Clear Chat"):
            st.session_state.messages = []
            st.rerun()


if __name__ == "__main__":
    main()