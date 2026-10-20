#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <cmath>
#include <algorithm>
#include "document_loader.hpp"
#include "inverted_index.hpp"
#include "ranker.hpp"

struct EdgeInfo {
    double weight;
    std::vector<std::string> sharedTerms;
};

struct RelatedDoc {
    int docId;
    std::string title;
    std::string filename;
    double similarity;
    std::vector<std::string> sharedTerms;
};

struct ReachableDoc {
    int docId;
    std::string title;
    std::string filename;
    double similarityToParent;
};

struct ReachableDepthLevel {
    int depth;
    std::vector<ReachableDoc> docs;
};

struct GraphEdgeExport {
    int source;
    int target;
    double weight;
    std::vector<std::string> sharedTerms;
};

class DocumentGraph {
private:
    std::unordered_map<int, std::unordered_map<int, EdgeInfo>> adjacencyList;
    std::unordered_map<int, Document> documents;
    double edgeThreshold;

public:
    explicit DocumentGraph(double threshold = 0.05) : edgeThreshold(threshold) {}

    void build(const std::vector<Document>& docs, const InvertedIndex& index) {
        adjacencyList.clear();
        documents.clear();

        for (const auto& doc : docs) {
            documents[doc.id] = doc;
            adjacencyList[doc.id] = {};
        }

        size_t totalDocs = docs.size();
        if (totalDocs <= 1) return;

        // 1. Compute TF-IDF vector & Euclidean norm for each document
        std::unordered_map<int, std::unordered_map<std::string, double>> tfidfVectors;
        std::unordered_map<int, double> vectorNorms;

        for (const auto& doc : docs) {
            std::unordered_map<std::string, int> termCounts;
            for (const auto& token : doc.tokens) {
                if (!TextProcessor::isStopWord(token)) {
                    termCounts[token]++;
                }
            }

            double sumSquares = 0.0;
            auto& vec = tfidfVectors[doc.id];

            for (const auto& [term, tf] : termCounts) {
                int df = index.getDocFrequency(term);
                double idf = Ranker::computeIDF(df, totalDocs);
                double weight = tf * idf;
                vec[term] = weight;
                sumSquares += weight * weight;
            }

            vectorNorms[doc.id] = std::sqrt(sumSquares);
        }

        // 2. Candidate pair discovery via shared terms (no blind all-pairs)
        std::unordered_set<std::string> evaluatedPairs;

        for (const auto& doc : docs) {
            int u = doc.id;
            const auto& uVec = tfidfVectors[u];
            double uNorm = vectorNorms[u];
            if (uNorm <= 0.0) continue;

            std::unordered_set<int> candidateDocs;
            for (const auto& [term, _] : uVec) {
                auto postings = index.getPostings(term);
                for (const auto& p : postings) {
                    if (p.docId != u) {
                        candidateDocs.insert(p.docId);
                    }
                }
            }

            for (int v : candidateDocs) {
                std::string pairKey = (u < v) ? std::to_string(u) + "-" + std::to_string(v)
                                              : std::to_string(v) + "-" + std::to_string(u);
                if (evaluatedPairs.find(pairKey) != evaluatedPairs.end()) continue;
                evaluatedPairs.insert(pairKey);

                const auto& vVec = tfidfVectors[v];
                double vNorm = vectorNorms[v];
                if (vNorm <= 0.0) continue;

                double dotProduct = 0.0;
                std::vector<std::pair<std::string, double>> termContributions;

                const auto& smaller = (uVec.size() <= vVec.size()) ? uVec : vVec;
                const auto& larger  = (uVec.size() <= vVec.size()) ? vVec : uVec;

                for (const auto& [term, weight1] : smaller) {
                    auto it = larger.find(term);
                    if (it != larger.end()) {
                        double prod = weight1 * it->second;
                        dotProduct += prod;
                        termContributions.push_back({term, prod});
                    }
                }

                double cosineSim = dotProduct / (uNorm * vNorm);
                if (cosineSim >= edgeThreshold) {
                    std::sort(termContributions.begin(), termContributions.end(), [](const auto& a, const auto& b) {
                        return a.second > b.second;
                    });

                    std::vector<std::string> topShared;
                    for (size_t i = 0; i < std::min<size_t>(6, termContributions.size()); ++i) {
                        topShared.push_back(termContributions[i].first);
                    }

                    adjacencyList[u][v] = {cosineSim, topShared};
                    adjacencyList[v][u] = {cosineSim, topShared};
                }
            }
        }
    }

    std::vector<RelatedDoc> getRelated(int docId, size_t limit = 5) const {
        auto it = adjacencyList.find(docId);
        if (it == adjacencyList.end() || it->second.empty()) return {};

        std::vector<RelatedDoc> list;
        for (const auto& [targetId, edge] : it->second) {
            auto docIt = documents.find(targetId);
            if (docIt != documents.end()) {
                list.push_back({
                    targetId,
                    docIt->second.title,
                    docIt->second.filename,
                    edge.weight,
                    edge.sharedTerms
                });
            }
        }

        std::sort(list.begin(), list.end(), [](const RelatedDoc& a, const RelatedDoc& b) {
            if (a.similarity != b.similarity) {
                return a.similarity > b.similarity;
            }
            return a.title < b.title;
        });

        if (list.size() > limit) list.resize(limit);
        return list;
    }

    std::vector<ReachableDepthLevel> getReachable(int startDocId, int maxDepth = 2) const {
        if (documents.find(startDocId) == documents.end()) return {};

        std::unordered_set<int> visited;
        visited.insert(startDocId);
        std::vector<ReachableDepthLevel> levels;
        std::vector<int> currentQueue = {startDocId};

        for (int depth = 1; depth <= maxDepth; ++depth) {
            std::vector<int> nextQueue;
            std::vector<ReachableDoc> levelDocs;

            for (int curr : currentQueue) {
                auto it = adjacencyList.find(curr);
                if (it == adjacencyList.end()) continue;

                for (const auto& [neighborId, edge] : it->second) {
                    if (visited.find(neighborId) == visited.end()) {
                        visited.insert(neighborId);
                        nextQueue.push_back(neighborId);
                        auto docIt = documents.find(neighborId);
                        if (docIt != documents.end()) {
                            levelDocs.push_back({
                                neighborId,
                                docIt->second.title,
                                docIt->second.filename,
                                edge.weight
                            });
                        }
                    }
                }
            }

            if (!levelDocs.empty()) {
                levels.push_back({depth, std::move(levelDocs)});
                currentQueue = std::move(nextQueue);
            } else {
                break;
            }
        }

        return levels;
    }

    size_t vertexCount() const { return documents.size(); }

    size_t edgeCount() const {
        size_t total = 0;
        for (const auto& [_, targets] : adjacencyList) {
            total += targets.size();
        }
        return total / 2;
    }

    std::vector<GraphEdgeExport> getAllEdges() const {
        std::vector<GraphEdgeExport> result;
        std::unordered_set<std::string> seen;

        for (const auto& [u, targets] : adjacencyList) {
            for (const auto& [v, edge] : targets) {
                std::string key = (u < v) ? std::to_string(u) + "-" + std::to_string(v)
                                          : std::to_string(v) + "-" + std::to_string(u);
                if (seen.find(key) == seen.end()) {
                    seen.insert(key);
                    result.push_back({u, v, edge.weight, edge.sharedTerms});
                }
            }
        }
        return result;
    }
};
