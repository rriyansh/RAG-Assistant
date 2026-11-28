from scripts.evaluate import answer_overlap, faithfulness, retrieval_scores

def test_retrieval_metrics_use_ranked_sources():
    recall, mrr = retrieval_scores(["README.md"], [{"source":"other.md"},{"source":"README.md"}], 8)
    assert recall == 1.0
    assert mrr == 0.5

def test_generation_metrics_are_bounded():
    assert 0 <= faithfulness("Chroma is the vector store", [{"text":"Chroma is the local vector store"}]) <= 1
    assert answer_overlap("Chroma vector store", "Uses Chroma as vector store") == 1.0
