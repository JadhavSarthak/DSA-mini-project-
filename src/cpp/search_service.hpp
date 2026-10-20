#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <iostream>
#include "document_loader.hpp"
#include "inverted_index.hpp"
#include "autocomplete_trie.hpp"
#include "ranker.hpp"
#include "top_k.hpp"
#include "document_graph.hpp"
#include "query_queue.hpp"

struct SearchOutput {
    std::string query;
    std::vector<std::string> normalizedQueryTokens;
    std::string mode;
    std::string ranking;
    int k;
    size_t totalCandidates;
    std::vector<SearchResult> results;
    double durationMs;
};

struct EngineStats {
    size_t documentCount;
    size_t vocabularySize;
    double avgDocLength;
    size_t trieWordCount;
    size_t trieNodeCount;
    size_t graphVertices;
    size_t graphEdges;
    size_t queueLength;
};

class SearchService {
private:
    InvertedIndex index;
    AutocompleteTrie trie;
    DocumentGraph graph;
    QueryQueue queue;
    std::vector<Document> documents;
    std::string currentDir;

public:
    explicit SearchService(const std::string& corpusDir = "data/sample") {
        reloadCorpus(corpusDir);
    }

    LoadResult reloadCorpus(const std::string& dirPath) {
        currentDir = dirPath;
        LoadResult loadResult = DocumentLoader::loadFromDirectory(dirPath);
        documents = loadResult.documents;

        // Build inverted index
        index.build(documents);

        // Build autocomplete trie
        trie.clear();
        std::unordered_map<std::string, int> termFreqs;
        for (const auto& doc : documents) {
            for (const auto& token : doc.tokens) {
                termFreqs[token]++;
            }
            auto phrases = TextProcessor::extractPhrases(doc.tokens);
            for (const auto& p : phrases) {
                trie.insert(p.first, p.second, true);
            }
        }
        for (const auto& [term, freq] : termFreqs) {
            trie.insert(term, freq, false);
        }

        // Build document graph
        graph = DocumentGraph(0.05);
        graph.build(documents, index);

        return loadResult;
    }

    std::vector<TrieSuggestion> getSuggestions(const std::string& prefix, size_t limit = 8) const {
        return trie.complete(prefix, limit);
    }

    SearchOutput search(
        const std::string& rawQuery,
        const std::string& mode = "OR",
        const std::string& ranking = "BM25",
        int k = 5
    ) const {
        auto t0 = std::chrono::high_resolution_clock::now();
        auto queryTokens = TextProcessor::tokenize(rawQuery);

        SearchOutput out;
        out.query = rawQuery;
        out.normalizedQueryTokens = queryTokens;
        out.mode = mode;
        out.ranking = ranking;
        out.k = k;
        out.totalCandidates = 0;

        if (queryTokens.empty()) {
            auto t1 = std::chrono::high_resolution_clock::now();
            out.durationMs = std::chrono::duration<double, std::milli>(t1 - t0).count();
            return out;
        }

        // 1. Retrieve candidate doc IDs from Inverted Index
        auto candidateIds = index.getCandidates(queryTokens, mode);
        out.totalCandidates = candidateIds.size();

        // 2. Score candidates and insert into Bounded Min-Heap
        TopKHeap heap(k);

        for (int docId : candidateIds) {
            const Document* doc = index.getDocument(docId);
            if (!doc) continue;

            ScoreExplanation expl = (ranking == "BM25")
                ? Ranker::scoreBM25(docId, queryTokens, index)
                : Ranker::scoreTF(docId, queryTokens, index);

            if (expl.totalScore <= 0.0) continue;

            std::vector<std::string> matched;
            for (const auto& tInfo : expl.terms) {
                matched.push_back(tInfo.term);
            }

            std::string snippet = TextProcessor::createSnippet(doc->text, queryTokens);

            SearchResult item;
            item.docId = doc->id;
            item.title = doc->title;
            item.path = doc->path;
            item.filename = doc->filename;
            item.score = expl.totalScore;
            item.snippet = snippet;
            item.matchedTerms = std::move(matched);
            item.explanation = std::move(expl);

            heap.push(item);
        }

        out.results = heap.extractSorted();
        auto t1 = std::chrono::high_resolution_clock::now();
        out.durationMs = std::chrono::duration<double, std::milli>(t1 - t0).count();

        return out;
    }

    std::string enqueueQuery(const std::string& query, const std::string& mode = "OR", const std::string& ranking = "BM25", int k = 5) {
        return queue.enqueue(query, mode, ranking, k);
    }

    bool processNextQueueJob(QueryJob& job) {
        if (!queue.dequeue(job)) return false;
        auto searchRes = search(job.query, job.mode, job.ranking, job.k);
        job.results = searchRes.results;
        job.finishedAt = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();
        job.durationMs = searchRes.durationMs;
        job.status = "completed";
        return true;
    }

    std::vector<RelatedDoc> getRelatedDocuments(int docId, size_t limit = 5) const {
        return graph.getRelated(docId, limit);
    }

    std::vector<ReachableDepthLevel> getReachableDocuments(int docId, int maxDepth = 2) const {
        return graph.getReachable(docId, maxDepth);
    }

    const DocumentGraph& getGraph() const { return graph; }
    const InvertedIndex& getIndex() const { return index; }
    const AutocompleteTrie& getTrie() const { return trie; }
    const QueryQueue& getQueue() const { return queue; }
    const std::vector<Document>& getDocuments() const { return documents; }

    EngineStats getStats() const {
        return {
            documents.size(),
            index.vocabularySize(),
            index.avgDocLength(),
            trie.wordCount(),
            trie.nodeCount(),
            graph.vertexCount(),
            graph.edgeCount(),
            queue.length()
        };
    }
};
