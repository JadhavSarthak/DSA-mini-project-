#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include "search_service.hpp"

void printUsage() {
    std::cout << "Nexora (C++17) Information Retrieval Engine\n"
              << "Usage: ./nexora <command> [options]\n\n"
              << "Commands:\n"
              << "  suggest <prefix>                      Get Trie autocomplete suggestions\n"
              << "  search <query> [--mode or|and] [--ranking bm25|tf] [-k <num>]  Search documents\n"
              << "  related <doc_id>                      List related documents from graph\n"
              << "  queue-demo                            Demonstrate FIFO Queue processing\n"
              << "  stats                                 Print engine and DSA statistics\n"
              << "  demo                                  Run full end-to-end demonstration\n";
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printUsage();
        return 1;
    }

    std::string cmd = argv[1];
    SearchService service("data/sample");

    if (cmd == "suggest") {
        if (argc < 3) {
            std::cerr << "Error: provide prefix for suggest\n";
            return 1;
        }
        std::string prefix = argv[2];
        auto suggestions = service.getSuggestions(prefix, 8);
        std::cout << "Trie Autocomplete for prefix '" << prefix << "':\n";
        if (suggestions.empty()) {
            std::cout << "  (no suggestions - empty prefix or unknown)\n";
        }
        for (const auto& s : suggestions) {
            std::cout << "  - " << s.word << " (freq: " << s.frequency << (s.isPhrase ? ", phrase" : "") << ")\n";
        }
    } else if (cmd == "search") {
        if (argc < 3) {
            std::cerr << "Error: provide search query\n";
            return 1;
        }
        std::string query = argv[2];
        std::string mode = "OR";
        std::string ranking = "BM25";
        int k = 5;

        for (int i = 3; i < argc; ++i) {
            std::string arg = argv[i];
            if (arg == "--mode" && i + 1 < argc) {
                mode = argv[++i];
                for (auto& c : mode) c = std::toupper(c);
            } else if (arg == "--ranking" && i + 1 < argc) {
                ranking = argv[++i];
                for (auto& c : ranking) c = std::toupper(c);
            } else if (arg == "-k" && i + 1 < argc) {
                k = std::stoi(argv[++i]);
            }
        }

        auto res = service.search(query, mode, ranking, k);
        std::cout << "Search Results for '" << query << "' (" << res.ranking << ", " << res.mode << " mode):\n";
        std::cout << "  Candidates evaluated: " << res.totalCandidates << " in " << res.durationMs << " ms\n";
        std::cout << "  Top-" << k << " (Bounded Min-Heap):\n";

        if (res.results.empty()) {
            std::cout << "  (no documents matched)\n";
        }

        for (size_t i = 0; i < res.results.size(); ++i) {
            const auto& item = res.results[i];
            std::cout << "  [" << (i + 1) << "] " << item.title << " (Doc ID: " << item.docId << ")\n";
            std::cout << "      Score: " << std::fixed << std::setprecision(4) << item.score << " | File: " << item.filename << "\n";
            std::cout << "      Snippet: " << item.snippet << "\n";
        }
    } else if (cmd == "related") {
        if (argc < 3) {
            std::cerr << "Error: provide doc_id\n";
            return 1;
        }
        int docId = std::stoi(argv[2]);
        auto related = service.getRelatedDocuments(docId, 5);
        std::cout << "Graph Neighbors for Doc #" << docId << " (Cosine Similarity >= 0.05):\n";
        for (const auto& r : related) {
            std::cout << "  - Doc #" << r.docId << " " << r.title << "\n";
            std::cout << "    Similarity: " << std::fixed << std::setprecision(4) << r.similarity << " | Shared: ";
            for (const auto& t : r.sharedTerms) std::cout << t << " ";
            std::cout << "\n";
        }
    } else if (cmd == "queue-demo") {
        std::cout << "Demonstrating FIFO Queue Processing:\n";
        std::vector<std::string> queries = {"machine learning", "virtual memory", "consensus raft", "compiler optimization"};
        std::vector<std::string> reqIds;

        for (const auto& q : queries) {
            std::string id = service.enqueueQuery(q, "OR", "BM25", 3);
            std::cout << "  Enqueued query '" << q << "' -> Request ID: " << id << "\n";
            reqIds.push_back(id);
        }

        std::cout << "\nProcessing queue in arrival order (FIFO):\n";
        QueryJob job;
        while (service.processNextQueueJob(job)) {
            std::cout << "  Dequeued " << job.id << " ('" << job.query << "'): found "
                      << job.results.size() << " results in " << job.durationMs << " ms\n";
        }
    } else if (cmd == "stats") {
        auto stats = service.getStats();
        std::cout << "Nexora Engine Statistics:\n"
                  << "  Documents loaded: " << stats.documentCount << "\n"
                  << "  Vocabulary size:  " << stats.vocabularySize << " unique terms\n"
                  << "  Average doc len:  " << std::fixed << std::setprecision(2) << stats.avgDocLength << " tokens\n"
                  << "  Trie words:       " << stats.trieWordCount << "\n"
                  << "  Trie nodes:       " << stats.trieNodeCount << "\n"
                  << "  Graph vertices:   " << stats.graphVertices << "\n"
                  << "  Graph edges:      " << stats.graphEdges << " (TF-IDF Cosine >= 0.05)\n";
    } else if (cmd == "demo") {
        std::cout << "=== Nexora Specification Walkthrough Demo ===\n\n";
        std::cout << "1. Engine Stats:\n";
        auto stats = service.getStats();
        std::cout << "   " << stats.documentCount << " docs, " << stats.vocabularySize << " terms, "
                  << stats.trieWordCount << " trie entries, " << stats.graphEdges << " graph edges\n\n";

        std::cout << "2. Typing prefix 'mach':\n";
        auto sugg = service.getSuggestions("mach", 5);
        for (const auto& s : sugg) {
            std::cout << "   -> " << s.word << " (freq: " << s.frequency << ")\n";
        }

        std::cout << "\n3. Searching for 'machine learning' (Top-K=3, BM25):\n";
        auto res = service.search("machine learning", "OR", "BM25", 3);
        for (size_t i = 0; i < res.results.size(); ++i) {
            std::cout << "   #" << (i + 1) << " " << res.results[i].title << " (Score: " << res.results[i].score << ")\n";
        }

        std::cout << "\n4. Knowledge Graph for top result (Doc #" << res.results[0].docId << "):\n";
        auto rel = service.getRelatedDocuments(res.results[0].docId, 3);
        for (const auto& r : rel) {
            std::cout << "   Connected: Doc #" << r.docId << " " << r.title << " (sim: " << r.similarity << ")\n";
        }

        std::cout << "\n5. FIFO Queue demo:\n";
        std::string id = service.enqueueQuery("deep learning neural", "OR", "BM25", 2);
        std::cout << "   Enqueued " << id << "\n";
        QueryJob job;
        service.processNextQueueJob(job);
        std::cout << "   Dequeued and completed in " << job.durationMs << " ms with " << job.results.size() << " results.\n";
        std::cout << "\n=== Demo Completed Successfully ===\n";
    } else {
        std::cerr << "Unknown command: " << cmd << "\n";
        printUsage();
        return 1;
    }

    return 0;
}
