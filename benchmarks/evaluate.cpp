#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <vector>
#include <string>
#include <unordered_set>
#include "../src/cpp/search_service.hpp"

struct EvalQuery {
    std::string query;
    std::vector<std::string> expectedFiles;
};

int main(int argc, char* argv[]) {
    int K = 3;
    if (argc >= 2) {
        K = std::stoi(argv[1]);
    }

    std::cout << "========================================\n";
    std::cout << " Nexora (C++17) Information Retrieval Evaluation\n";
    std::cout << " Dataset: data/sample/queries.tsv (K=" << K << ")\n";
    std::cout << "========================================\n";

    SearchService service("data/sample");

    std::ifstream file("data/sample/queries.tsv");
    if (!file.is_open()) {
        std::cerr << "Error opening data/sample/queries.tsv\n";
        return 1;
    }

    std::vector<EvalQuery> testQueries;
    std::string line;
    bool isHeader = true;

    while (std::getline(file, line)) {
        if (line.empty()) continue;
        if (isHeader) {
            isHeader = false;
            continue;
        }

        std::stringstream ss(line);
        std::string q, filesStr, notes;
        if (std::getline(ss, q, '\t') && std::getline(ss, filesStr, '\t')) {
            std::stringstream fileStream(filesStr);
            std::string f;
            std::vector<std::string> expected;
            while (std::getline(fileStream, f, ',')) {
                // Trim
                while (!f.empty() && std::isspace(static_cast<unsigned char>(f.front()))) f.erase(f.begin());
                while (!f.empty() && std::isspace(static_cast<unsigned char>(f.back()))) f.pop_back();
                if (!f.empty()) expected.push_back(f);
            }
            if (!q.empty() && !expected.empty()) {
                testQueries.push_back({q, expected});
            }
        }
    }

    double totalP = 0.0;
    double totalR = 0.0;
    double totalRR = 0.0;

    std::cout << std::left << std::setw(28) << "Query"
              << std::setw(8) << "P@K"
              << std::setw(8) << "R@K"
              << std::setw(8) << "RR"
              << "Top Retrieved\n";
    std::cout << "----------------------------------------------------------------------\n";

    for (const auto& item : testQueries) {
        auto res = service.search(item.query, "OR", "BM25", K);

        std::unordered_set<std::string> expSet(item.expectedFiles.begin(), item.expectedFiles.end());
        int hits = 0;
        double rr = 0.0;
        std::string topHit = "(none)";

        for (size_t rank = 0; rank < res.results.size(); ++rank) {
            const auto& fn = res.results[rank].filename;
            if (rank == 0) topHit = fn;
            if (expSet.find(fn) != expSet.end()) {
                hits++;
                if (rr == 0.0) {
                    rr = 1.0 / static_cast<double>(rank + 1);
                }
            }
        }

        double p = (K > 0) ? static_cast<double>(hits) / K : 0.0;
        double r = (!item.expectedFiles.empty()) ? static_cast<double>(hits) / item.expectedFiles.size() : 0.0;

        totalP += p;
        totalR += r;
        totalRR += rr;

        std::cout << std::left << std::setw(28) << item.query
                  << std::setw(8) << std::fixed << std::setprecision(2) << p
                  << std::setw(8) << std::fixed << std::setprecision(2) << r
                  << std::setw(8) << std::fixed << std::setprecision(2) << rr
                  << topHit << "\n";
    }

    size_t N = testQueries.size();
    double meanP = (N > 0) ? totalP / N : 0.0;
    double meanR = (N > 0) ? totalR / N : 0.0;
    double mrr   = (N > 0) ? totalRR / N : 0.0;

    std::cout << "----------------------------------------------------------------------\n";
    std::cout << "Summary (" << N << " queries):\n";
    std::cout << "  Mean Precision@" << K << ": " << std::fixed << std::setprecision(3) << meanP << " (" << (meanP * 100.0) << "%)\n";
    std::cout << "  Mean Recall@" << K << ":    " << std::fixed << std::setprecision(3) << meanR << " (" << (meanR * 100.0) << "%)\n";
    std::cout << "  Mean Reciprocal Rank: " << std::fixed << std::setprecision(3) << mrr << "\n";
    std::cout << "========================================\n";

    return 0;
}
