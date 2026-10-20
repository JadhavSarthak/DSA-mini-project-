#include <iostream>
#include <iomanip>
#include <chrono>
#include <vector>
#include <algorithm>
#include "../src/cpp/search_service.hpp"
#include "../src/cpp/top_k.hpp"

int main() {
    std::cout << "========================================\n";
    std::cout << " Nexora (C++17) Latency & System Benchmarks\n";
    std::cout << "========================================\n";

    auto t0 = std::chrono::high_resolution_clock::now();
    SearchService service("data/sample");
    auto t1 = std::chrono::high_resolution_clock::now();
    double initTimeMs = std::chrono::duration<double, std::milli>(t1 - t0).count();

    auto stats = service.getStats();
    std::cout << "Environment:\n";
    std::cout << "  Compiler: g++ (C++17)\n";
    std::cout << "  Corpus:   " << stats.documentCount << " docs, " << stats.vocabularySize << " terms\n";
    std::cout << "  Build ms: " << std::fixed << std::setprecision(2) << initTimeMs << " ms\n\n";

    // 1. Autocomplete Latency Benchmark (100 runs)
    std::vector<std::string> testPrefixes = {
        "m", "ma", "mach", "machi", "machine", "d", "de", "deep", "s", "se", "search",
        "n", "ne", "net", "netw", "g", "gr", "graph", "c", "co", "comp", "t", "tr", "p", "pr"
    };
    std::vector<double> acLatencies;

    for (int i = 0; i < 200; ++i) {
        const auto& p = testPrefixes[i % testPrefixes.size()];
        auto start = std::chrono::high_resolution_clock::now();
        auto res = service.getSuggestions(p, 5);
        auto end = std::chrono::high_resolution_clock::now();
        acLatencies.push_back(std::chrono::duration<double, std::micro>(end - start).count());
    }
    std::sort(acLatencies.begin(), acLatencies.end());
    double acP50 = acLatencies[acLatencies.size() / 2];
    double acP95 = acLatencies[static_cast<size_t>(acLatencies.size() * 0.95)];

    std::cout << "Autocomplete Latency (Trie O(L)):\n";
    std::cout << "  Median (p50): " << std::fixed << std::setprecision(2) << acP50 << " µs\n";
    std::cout << "  95th % (p95): " << std::fixed << std::setprecision(2) << acP95 << " µs\n\n";

    // 2. Search Latency Benchmark (50 queries)
    std::vector<std::string> testQueries = {
        "machine learning", "deep learning neural networks", "inverted index bm25",
        "graph traversal breadth first search", "operating system virtual memory paging",
        "distributed consensus raft paxos", "database storage b tree",
        "compiler optimization intermediate representation", "cryptography public key encryption"
    };
    std::vector<double> searchLatencies;

    for (int i = 0; i < 100; ++i) {
        const auto& q = testQueries[i % testQueries.size()];
        auto start = std::chrono::high_resolution_clock::now();
        auto res = service.search(q, "OR", "BM25", 5);
        auto end = std::chrono::high_resolution_clock::now();
        searchLatencies.push_back(std::chrono::duration<double, std::milli>(end - start).count());
    }
    std::sort(searchLatencies.begin(), searchLatencies.end());
    double searchP50 = searchLatencies[searchLatencies.size() / 2];
    double searchP95 = searchLatencies[static_cast<size_t>(searchLatencies.size() * 0.95)];

    std::cout << "Search Latency (BM25 + Bounded Min-Heap):\n";
    std::cout << "  Median (p50): " << std::fixed << std::setprecision(3) << searchP50 << " ms\n";
    std::cout << "  95th % (p95): " << std::fixed << std::setprecision(3) << searchP95 << " ms\n\n";

    // 3. Top-K Heap vs Full Sort Benchmark
    const size_t poolSize = 500;
    const size_t K = 5;
    std::vector<SearchResult> candidates;
    for (size_t i = 0; i < poolSize; ++i) {
        SearchResult item;
        item.docId = static_cast<int>(i);
        item.title = "Doc " + std::to_string(i);
        item.score = std::sin(static_cast<double>(i) * 0.77) * 50.0 + 50.0;
        candidates.push_back(item);
    }

    auto startHeap = std::chrono::high_resolution_clock::now();
    for (int iter = 0; iter < 1000; ++iter) {
        TopKHeap heap(K);
        for (const auto& c : candidates) {
            heap.push(c);
        }
        auto top = heap.extractSorted();
    }
    auto endHeap = std::chrono::high_resolution_clock::now();
    double heapUs = std::chrono::duration<double, std::micro>(endHeap - startHeap).count() / 1000.0;

    auto startSort = std::chrono::high_resolution_clock::now();
    for (int iter = 0; iter < 1000; ++iter) {
        auto top = TopKHeap::fullSortBaseline(candidates, K);
    }
    auto endSort = std::chrono::high_resolution_clock::now();
    double sortUs = std::chrono::duration<double, std::micro>(endSort - startSort).count() / 1000.0;

    std::cout << "Top-K Heap vs Full Sort (" << poolSize << " candidates, K=" << K << "):\n";
    std::cout << "  Bounded Min-Heap O(M log K): " << std::fixed << std::setprecision(2) << heapUs << " µs\n";
    std::cout << "  Full Sort Baseline O(M log M): " << std::fixed << std::setprecision(2) << sortUs << " µs\n";
    std::cout << "  Speedup Ratio: " << std::fixed << std::setprecision(2) << (sortUs / (heapUs > 0.001 ? heapUs : 0.001)) << "x faster with Heap\n";
    std::cout << "========================================\n";

    return 0;
}
