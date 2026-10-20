#pragma once

#include <string>
#include <vector>
#include <algorithm>
#include "ranker.hpp"

struct SearchResult {
    int docId;
    std::string title;
    std::string path;
    std::string filename;
    double score;
    std::string snippet;
    std::vector<std::string> matchedTerms;
    ScoreExplanation explanation;
};

class TopKHeap {
private:
    std::vector<SearchResult> heap;
    size_t capacity;

    // Returns true if A is "worse" than B (belongs closer to the root of the min-heap)
    bool isWorse(const SearchResult& a, const SearchResult& b) const {
        if (a.score != b.score) {
            return a.score < b.score;
        }
        if (a.title != b.title) {
            return a.title > b.title; // worse title is lexicographically larger
        }
        return a.docId > b.docId;
    }

    void siftUp(size_t index) {
        size_t current = index;
        while (current > 0) {
            size_t parent = (current - 1) / 2;
            if (isWorse(heap[current], heap[parent])) {
                std::swap(heap[current], heap[parent]);
                current = parent;
            } else {
                break;
            }
        }
    }

    void siftDown(size_t index) {
        size_t current = index;
        size_t length = heap.size();

        while (true) {
            size_t worst = current;
            size_t left = 2 * current + 1;
            size_t right = 2 * current + 2;

            if (left < length && isWorse(heap[left], heap[worst])) {
                worst = left;
            }
            if (right < length && isWorse(heap[right], heap[worst])) {
                worst = right;
            }

            if (worst != current) {
                std::swap(heap[current], heap[worst]);
                current = worst;
            } else {
                break;
            }
        }
    }

public:
    explicit TopKHeap(size_t cap) : capacity(cap) {}

    void push(const SearchResult& item) {
        if (capacity == 0) return;

        if (heap.size() < capacity) {
            heap.push_back(item);
            siftUp(heap.size() - 1);
        } else {
            // Compare with the worst kept element at root
            if (isWorse(heap[0], item)) {
                heap[0] = item;
                siftDown(0);
            }
        }
    }

    // Final extracted and sorted list: score desc, title asc, docId asc
    std::vector<SearchResult> extractSorted() const {
        std::vector<SearchResult> list = heap;
        std::sort(list.begin(), list.end(), [](const SearchResult& a, const SearchResult& b) {
            if (a.score != b.score) {
                return a.score > b.score;
            }
            if (a.title != b.title) {
                return a.title < b.title;
            }
            return a.docId < b.docId;
        });
        return list;
    }

    size_t size() const { return heap.size(); }

    static std::vector<SearchResult> fullSortBaseline(std::vector<SearchResult> candidates, size_t k) {
        if (k == 0) return {};
        std::sort(candidates.begin(), candidates.end(), [](const SearchResult& a, const SearchResult& b) {
            if (a.score != b.score) {
                return a.score > b.score;
            }
            if (a.title != b.title) {
                return a.title < b.title;
            }
            return a.docId < b.docId;
        });
        if (candidates.size() > k) {
            candidates.resize(k);
        }
        return candidates;
    }
};
