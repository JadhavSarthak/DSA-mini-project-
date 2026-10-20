#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include "document_loader.hpp"

struct PostingsEntry {
    int docId;
    int tf;
};

class InvertedIndex {
private:
    // term -> { docId -> tf }
    std::unordered_map<std::string, std::unordered_map<int, int>> index;
    // docId -> Document
    std::unordered_map<int, Document> documents;
    size_t totalTokens = 0;

public:
    void build(const std::vector<Document>& docs) {
        index.clear();
        documents.clear();
        totalTokens = 0;

        for (const auto& doc : docs) {
            documents[doc.id] = doc;
            totalTokens += doc.length;

            std::unordered_map<std::string, int> docTermFreqs;
            for (const auto& token : doc.tokens) {
                docTermFreqs[token]++;
            }

            for (const auto& [term, tf] : docTermFreqs) {
                index[term][doc.id] = tf;
            }
        }
    }

    size_t documentCount() const {
        return documents.size();
    }

    size_t vocabularySize() const {
        return index.size();
    }

    double avgDocLength() const {
        if (documents.empty()) return 0.0;
        return static_cast<double>(totalTokens) / documents.size();
    }

    const Document* getDocument(int docId) const {
        auto it = documents.find(docId);
        if (it != documents.end()) {
            return &(it->second);
        }
        return nullptr;
    }

    std::vector<Document> getAllDocuments() const {
        std::vector<Document> list;
        for (const auto& kv : documents) {
            list.push_back(kv.second);
        }
        std::sort(list.begin(), list.end(), [](const Document& a, const Document& b) {
            return a.id < b.id;
        });
        return list;
    }

    int getDocFrequency(const std::string& term) const {
        auto it = index.find(term);
        if (it != index.end()) {
            return static_cast<int>(it->second.size());
        }
        return 0;
    }

    int getTermFrequency(const std::string& term, int docId) const {
        auto it = index.find(term);
        if (it != index.end()) {
            auto docIt = it->second.find(docId);
            if (docIt != it->second.end()) {
                return docIt->second;
            }
        }
        return 0;
    }

    std::vector<PostingsEntry> getPostings(const std::string& term) const {
        std::vector<PostingsEntry> list;
        auto it = index.find(term);
        if (it != index.end()) {
            for (const auto& [docId, tf] : it->second) {
                list.push_back({docId, tf});
            }
        }
        return list;
    }

    std::vector<int> getCandidates(const std::vector<std::string>& queryTerms, const std::string& mode = "OR") const {
        if (queryTerms.empty()) return {};

        std::vector<std::unordered_set<int>> postingsList;
        for (const auto& term : queryTerms) {
            auto it = index.find(term);
            if (it != index.end() && !it->second.empty()) {
                std::unordered_set<int> docSet;
                for (const auto& [docId, _] : it->second) {
                    docSet.insert(docId);
                }
                postingsList.push_back(std::move(docSet));
            } else if (mode == "AND") {
                return {};
            }
        }

        if (postingsList.empty()) return {};

        std::vector<int> candidateDocs;
        if (mode == "OR") {
            std::unordered_set<int> unionSet;
            for (const auto& set : postingsList) {
                for (int id : set) {
                    unionSet.insert(id);
                }
            }
            candidateDocs.assign(unionSet.begin(), unionSet.end());
        } else {
            // AND mode: intersect
            std::sort(postingsList.begin(), postingsList.end(), [](const auto& a, const auto& b) {
                return a.size() < b.size();
            });

            for (int id : postingsList[0]) {
                bool inAll = true;
                for (size_t i = 1; i < postingsList.size(); ++i) {
                    if (postingsList[i].find(id) == postingsList[i].end()) {
                        inAll = false;
                        break;
                    }
                }
                if (inAll) {
                    candidateDocs.push_back(id);
                }
            }
        }

        std::sort(candidateDocs.begin(), candidateDocs.end());
        return candidateDocs;
    }
};
