#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>
#include <memory>

struct TrieSuggestion {
    std::string word;
    int frequency;
    bool isPhrase;
};

class TrieNode {
public:
    std::unordered_map<char, std::unique_ptr<TrieNode>> children;
    bool isEndOfWord = false;
    int frequency = 0;
    std::string word;
    bool isPhrase = false;
};

class AutocompleteTrie {
private:
    std::unique_ptr<TrieNode> root;
    size_t totalWords = 0;
    size_t totalNodes = 1;

    void collectWords(const TrieNode* node, std::vector<TrieSuggestion>& results) const {
        if (!node) return;
        if (node->isEndOfWord) {
            results.push_back({node->word, node->frequency, node->isPhrase});
        }
        for (const auto& [ch, child] : node->children) {
            collectWords(child.get(), results);
        }
    }

public:
    AutocompleteTrie() {
        root = std::make_unique<TrieNode>();
    }

    // Move operations
    AutocompleteTrie(AutocompleteTrie&& other) noexcept = default;
    AutocompleteTrie& operator=(AutocompleteTrie&& other) noexcept = default;

    // Disallow accidental shallow copying
    AutocompleteTrie(const AutocompleteTrie&) = delete;
    AutocompleteTrie& operator=(const AutocompleteTrie&) = delete;

    void clear() {
        root = std::make_unique<TrieNode>();
        totalWords = 0;
        totalNodes = 1;
    }

    void insert(const std::string& term, int frequency = 1, bool isPhrase = false) {
        if (term.empty()) return;

        TrieNode* current = root.get();
        for (char c : term) {
            char lowerC = std::tolower(static_cast<unsigned char>(c));
            if (current->children.find(lowerC) == current->children.end()) {
                current->children[lowerC] = std::make_unique<TrieNode>();
                totalNodes++;
            }
            current = current->children[lowerC].get();
        }

        if (!current->isEndOfWord) {
            totalWords++;
        }
        current->isEndOfWord = true;
        current->frequency += frequency;
        current->word = term;
        current->isPhrase = isPhrase;
    }

    // Empty-prefix policy: returns empty vector {} per PLAN.md decision 9 & spec 3.1
    std::vector<TrieSuggestion> complete(const std::string& prefix, size_t limit = 8) const {
        if (prefix.empty()) {
            return {};
        }

        const TrieNode* current = root.get();
        for (char c : prefix) {
            char lowerC = std::tolower(static_cast<unsigned char>(c));
            auto it = current->children.find(lowerC);
            if (it == current->children.end()) {
                return {};
            }
            current = it->second.get();
        }

        std::vector<TrieSuggestion> matches;
        collectWords(current, matches);

        // Sort: frequency descending, tie-break alphabetical ascending
        std::sort(matches.begin(), matches.end(), [](const TrieSuggestion& a, const TrieSuggestion& b) {
            if (a.frequency != b.frequency) {
                return a.frequency > b.frequency;
            }
            return a.word < b.word;
        });

        if (matches.size() > limit) {
            matches.resize(limit);
        }
        return matches;
    }

    size_t wordCount() const { return totalWords; }
    size_t nodeCount() const { return totalNodes; }
};
