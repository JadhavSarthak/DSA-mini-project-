#pragma once

#include <string>
#include <vector>
#include <unordered_set>
#include <unordered_map>
#include <algorithm>
#include <cctype>
#include <sstream>

class TextProcessor {
public:
    static const std::unordered_set<std::string>& getStopWords() {
        static const std::unordered_set<std::string> STOP_WORDS = {
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any",
            "are", "aren", "arent", "as", "at", "be", "because", "been", "before", "being", "below",
            "between", "both", "but", "by", "can", "cannot", "could", "did", "do", "does", "doing",
            "down", "during", "each", "few", "for", "from", "further", "had", "has", "have", "having",
            "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in",
            "into", "is", "it", "its", "itself", "just", "me", "more", "most", "my", "myself", "no",
            "nor", "not", "of", "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves",
            "out", "over", "own", "same", "she", "should", "so", "some", "such", "than", "that", "the",
            "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those",
            "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when",
            "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours",
            "yourself", "yourselves"
        };
        return STOP_WORDS;
    }

    static bool isStopWord(const std::string& token) {
        std::string lower = toLower(token);
        return getStopWords().find(lower) != getStopWords().end();
    }

    static std::string toLower(const std::string& s) {
        std::string res = s;
        std::transform(res.begin(), res.end(), res.begin(), [](unsigned char c) {
            return std::tolower(c);
        });
        return res;
    }

    // Deterministic tokenization: lowercase, split on non-alphanumeric, filter empty
    static std::vector<std::string> tokenize(const std::string& text) {
        std::vector<std::string> tokens;
        std::string current;
        for (char ch : text) {
            if (std::isalnum(static_cast<unsigned char>(ch))) {
                current += std::tolower(static_cast<unsigned char>(ch));
            } else {
                if (!current.empty()) {
                    tokens.push_back(current);
                    current.clear();
                }
            }
        }
        if (!current.empty()) {
            tokens.push_back(current);
        }
        return tokens;
    }

    // Extract bigrams/trigrams for Trie phrases
    static std::vector<std::pair<std::string, int>> extractPhrases(const std::vector<std::string>& tokens) {
        std::unordered_map<std::string, int> phraseMap;
        if (tokens.size() < 2) return {};

        for (size_t i = 0; i < tokens.size() - 1; ++i) {
            const std::string& t1 = tokens[i];
            const std::string& t2 = tokens[i + 1];
            if (isStopWord(t1) && isStopWord(t2)) continue;

            std::string bigram = t1 + " " + t2;
            phraseMap[bigram]++;

            if (i + 2 < tokens.size()) {
                const std::string& t3 = tokens[i + 2];
                if (!isStopWord(t1) || !isStopWord(t3)) {
                    std::string trigram = t1 + " " + t2 + " " + t3;
                    phraseMap[trigram]++;
                }
            }
        }

        std::vector<std::pair<std::string, int>> res;
        for (const auto& kv : phraseMap) {
            res.push_back(kv);
        }
        return res;
    }

    // Highlight snippet surrounding query tokens
    static std::string createSnippet(const std::string& text, const std::vector<std::string>& queryTokens, size_t maxLen = 220) {
        if (text.empty()) return "";
        std::vector<std::string> cleanQuery;
        for (const auto& q : queryTokens) {
            if (!q.empty()) cleanQuery.push_back(toLower(q));
        }

        if (cleanQuery.empty()) {
            return text.substr(0, std::min(text.length(), maxLen));
        }

        // Split by newlines / periods into sentences
        std::vector<std::string> sentences;
        std::string cur;
        for (size_t i = 0; i < text.size(); ++i) {
            char c = text[i];
            cur += c;
            if (c == '.' || c == '\n' || c == '!' || c == '?') {
                if (!cur.empty()) {
                    sentences.push_back(cur);
                    cur.clear();
                }
            }
        }
        if (!cur.empty()) sentences.push_back(cur);

        std::string bestSentence;
        int maxHits = -1;

        for (const auto& sent : sentences) {
            auto tokens = tokenize(sent);
            int hits = 0;
            for (const auto& q : cleanQuery) {
                if (std::find(tokens.begin(), tokens.end(), q) != tokens.end()) {
                    hits++;
                }
            }
            if (hits > maxHits) {
                maxHits = hits;
                bestSentence = sent;
            }
        }

        if (bestSentence.empty() && !sentences.empty()) {
            bestSentence = sentences[0];
        }

        // Clean up whitespace
        std::string clean;
        bool inSpace = false;
        for (char c : bestSentence) {
            if (std::isspace(static_cast<unsigned char>(c))) {
                if (!inSpace) {
                    clean += ' ';
                    inSpace = true;
                }
            } else {
                clean += c;
                inSpace = false;
            }
        }

        if (clean.length() > maxLen) {
            clean = clean.substr(0, maxLen) + "...";
        }

        // Highlight with neo-brutalist hit mark
        for (const auto& q : cleanQuery) {
            std::string lowerClean = toLower(clean);
            size_t pos = 0;
            while ((pos = lowerClean.find(q, pos)) != std::string::npos) {
                // Word boundary check
                bool leftBoundary = (pos == 0 || !std::isalnum(static_cast<unsigned char>(clean[pos - 1])));
                bool rightBoundary = (pos + q.length() >= clean.length() || !std::isalnum(static_cast<unsigned char>(clean[pos + q.length()])));

                if (leftBoundary && rightBoundary) {
                    std::string matched = clean.substr(pos, q.length());
                    std::string replacement = "<mark class=\"hit-mark\" style=\"background-color: #FFD400; color: #0B0B0B; font-weight: 800; padding: 1px 6px; margin: 0 1.5px; border-radius: 6px; border: 1.5px solid #0B0B0B; box-shadow: 1.5px 1.5px 0 #0B0B0B; display: inline-block;\">" + matched + "</mark>";
                    clean.replace(pos, q.length(), replacement);
                    lowerClean = toLower(clean);
                    pos += replacement.length();
                } else {
                    pos += q.length();
                }
            }
        }

        return clean;
    }
};
