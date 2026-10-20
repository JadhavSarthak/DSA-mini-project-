#include <iostream>
#include <cassert>
#include <string>
#include <vector>
#include <random>
#include "../src/cpp/text_processor.hpp"
#include "../src/cpp/document_loader.hpp"
#include "../src/cpp/inverted_index.hpp"
#include "../src/cpp/autocomplete_trie.hpp"
#include "../src/cpp/ranker.hpp"
#include "../src/cpp/top_k.hpp"
#include "../src/cpp/document_graph.hpp"
#include "../src/cpp/query_queue.hpp"
#include "../src/cpp/search_service.hpp"

#define ASSERT_TRUE(cond, msg) \
    if (!(cond)) { \
        std::cerr << "FAIL: " << msg << " at line " << __LINE__ << std::endl; \
        std::exit(1); \
    }

#define ASSERT_EQUAL(a, b, msg) \
    if ((a) != (b)) { \
        std::cerr << "FAIL: " << msg << " (" << (a) << " != " << (b) << ") at line " << __LINE__ << std::endl; \
        std::exit(1); \
    }

void testPhase1_CorpusAndPreprocessing() {
    std::cout << "[Test Phase 1] Tokenizer & DocumentLoader...\n";

    // 1. Tokenizer determinism
    std::string sample = "Machine Learning & Neural Networks! What is BM25?";
    auto t1 = TextProcessor::tokenize(sample);
    auto t2 = TextProcessor::tokenize(sample);
    ASSERT_EQUAL(t1.size(), t2.size(), "Tokenizer must be deterministic");
    for (size_t i = 0; i < t1.size(); ++i) {
        ASSERT_EQUAL(t1[i], t2[i], "Token sequence mismatch");
    }

    // 2. Document Loader
    auto loadRes = DocumentLoader::loadFromDirectory("data/sample");
    ASSERT_TRUE(loadRes.documents.size() >= 12, "Must load 12 CC0 sample documents");
    ASSERT_EQUAL(loadRes.documents[0].id, 0, "Stable deterministic ID for first doc must be 0");

    // 3. Duplicate detection test
    ASSERT_EQUAL(loadRes.skippedDuplicates.size(), 0, "No initial duplicates in sample");
    std::cout << "  -> Phase 1 Passed: 12 docs loaded, tokenizer deterministic.\n";
}

void testPhase2_InvertedIndex() {
    std::cout << "[Test Phase 2] Inverted Index (Hash Map)...\n";
    auto loadRes = DocumentLoader::loadFromDirectory("data/sample");
    InvertedIndex index;
    index.build(loadRes.documents);

    ASSERT_EQUAL(index.documentCount(), loadRes.documents.size(), "Document count must match");
    ASSERT_TRUE(index.vocabularySize() > 500, "Vocabulary size should exceed 500");

    // Check postings for 'machine'
    int dfMachine = index.getDocFrequency("machine");
    ASSERT_TRUE(dfMachine >= 2, "Term 'machine' should appear in at least 2 docs");

    // OR vs AND queries
    auto orCandidates = index.getCandidates({"machine", "learning"}, "OR");
    auto andCandidates = index.getCandidates({"machine", "learning"}, "AND");
    ASSERT_TRUE(!orCandidates.empty(), "OR candidates should not be empty");
    ASSERT_TRUE(orCandidates.size() >= andCandidates.size(), "OR set size must be >= AND set size");
    std::cout << "  -> Phase 2 Passed: Inverted index built, candidate retrieval verified.\n";
}

void testPhase3_AutocompleteTrie() {
    std::cout << "[Test Phase 3] Autocomplete Trie...\n";
    AutocompleteTrie trie;
    trie.insert("machine", 7, false);
    trie.insert("machine learning", 4, true);
    trie.insert("machinery", 2, false);
    trie.insert("database", 5, false);

    // Empty prefix policy per plan decision 9: returns nothing
    auto emptySugg = trie.complete("", 5);
    ASSERT_EQUAL(emptySugg.size(), 0, "Empty prefix must return empty result per spec");

    // Prefix 'mach'
    auto sugg = trie.complete("mach", 5);
    ASSERT_EQUAL(sugg.size(), 3, "Prefix 'mach' should match 3 words");
    ASSERT_EQUAL(sugg[0].word, "machine", "Highest frequency word must come first");
    ASSERT_EQUAL(sugg[1].word, "machine learning", "Second highest frequency word must come second");
    ASSERT_EQUAL(sugg[2].word, "machinery", "Third highest frequency word must come third");
    std::cout << "  -> Phase 3 Passed: Trie prefix traversal and frequency ranking verified.\n";
}

void testPhase4_RankerAndHeap() {
    std::cout << "[Test Phase 4] BM25 Ranker & Top-K Bounded Heap...\n";
    auto loadRes = DocumentLoader::loadFromDirectory("data/sample");
    InvertedIndex index;
    index.build(loadRes.documents);

    // Score BM25 on doc 0
    auto expl = Ranker::scoreBM25(0, {"machine", "learning"}, index);
    ASSERT_TRUE(expl.totalScore > 0.0, "BM25 score must be positive");

    // Test Bounded Min-Heap equivalence with full sort baseline
    std::vector<SearchResult> candidates;
    for (int i = 0; i < 50; ++i) {
        SearchResult item;
        item.docId = i;
        item.title = "Doc " + std::to_string(i);
        item.score = (i * 37) % 100; // randomized scores with ties
        candidates.push_back(item);
    }

    size_t K = 5;
    TopKHeap heap(K);
    for (const auto& c : candidates) {
        heap.push(c);
    }
    auto heapResults = heap.extractSorted();
    auto sortResults = TopKHeap::fullSortBaseline(candidates, K);

    ASSERT_EQUAL(heapResults.size(), sortResults.size(), "Heap size must match sort baseline");
    for (size_t i = 0; i < K; ++i) {
        ASSERT_EQUAL(heapResults[i].docId, sortResults[i].docId, "Heap ordering must match full-sort baseline");
        ASSERT_EQUAL(heapResults[i].score, sortResults[i].score, "Heap scores must match baseline");
    }
    std::cout << "  -> Phase 4 Passed: BM25 calculated, bounded min-heap equals full-sort baseline.\n";
}

void testPhase5_DocumentGraph() {
    std::cout << "[Test Phase 5] Document Graph (TF-IDF Cosine Similarity & BFS)...\n";
    auto loadRes = DocumentLoader::loadFromDirectory("data/sample");
    InvertedIndex index;
    index.build(loadRes.documents);

    DocumentGraph graph(0.05);
    graph.build(loadRes.documents, index);

    ASSERT_EQUAL(graph.vertexCount(), 12, "Graph must contain 12 vertices");
    ASSERT_TRUE(graph.edgeCount() > 0, "Graph must have edges above threshold 0.05");

    // Related documents
    auto related = graph.getRelated(0, 3);
    ASSERT_TRUE(!related.empty(), "Doc 0 (ML basics) should have related documents");
    ASSERT_TRUE(related[0].similarity >= 0.05, "Edge weight must exceed threshold");

    // BFS Reachability
    auto levels = graph.getReachable(0, 2);
    ASSERT_TRUE(!levels.empty(), "BFS should discover reachable nodes");
    std::cout << "  -> Phase 5 Passed: Graph cosine similarity, neighbor ranking, and BFS verified.\n";
}

void testPhase6_QueryQueueAndIntegration() {
    std::cout << "[Test Phase 6] FIFO Query Queue & End-to-End Service...\n";
    SearchService service("data/sample");

    // FIFO queue test
    std::string id1 = service.enqueueQuery("machine learning", "OR", "BM25", 3);
    std::string id2 = service.enqueueQuery("virtual memory", "OR", "BM25", 3);

    QueryJob job1;
    ASSERT_TRUE(service.processNextQueueJob(job1), "Queue must have job 1");
    ASSERT_EQUAL(job1.id, id1, "Job 1 must match first enqueued request ID (FIFO order)");
    ASSERT_TRUE(!job1.results.empty(), "Job 1 should return results");

    QueryJob job2;
    ASSERT_TRUE(service.processNextQueueJob(job2), "Queue must have job 2");
    ASSERT_EQUAL(job2.id, id2, "Job 2 must match second enqueued request ID (FIFO order)");

    std::cout << "  -> Phase 6 Passed: FIFO ordering and end-to-end integration verified.\n";
}

int main() {
    std::cout << "========================================\n";
    std::cout << " Nexora (C++17) Test Suite\n";
    std::cout << "========================================\n";

    testPhase1_CorpusAndPreprocessing();
    testPhase2_InvertedIndex();
    testPhase3_AutocompleteTrie();
    testPhase4_RankerAndHeap();
    testPhase5_DocumentGraph();
    testPhase6_QueryQueueAndIntegration();

    std::cout << "========================================\n";
    std::cout << " ALL CHECKPOINTS PASSED SUCCESSFULLY!\n";
    std::cout << "========================================\n";
    return 0;
}
