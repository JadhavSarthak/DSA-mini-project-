#pragma once

#include <string>
#include <vector>
#include <cmath>
#include <algorithm>
#include "inverted_index.hpp"

struct TermScoreBreakdown {
    std::string term;
    int tf;
    double idf;
    size_t docLength;
    double avgDocLength;
    double contribution;
};

struct ScoreExplanation {
    std::string method;
    double k1 = 1.2;
    double b = 0.75;
    std::vector<TermScoreBreakdown> terms;
    double totalScore = 0.0;
};

class Ranker {
public:
    static constexpr double DEFAULT_K1 = 1.2;
    static constexpr double DEFAULT_B = 0.75;

    // Robertson-Spärck Jones IDF: ln(1 + (N - df + 0.5) / (df + 0.5))
    static double computeIDF(int df, size_t totalDocs) {
        if (totalDocs == 0) return 0.0;
        double numerator = static_cast<double>(totalDocs) - df + 0.5;
        double denominator = static_cast<double>(df) + 0.5;
        double val = numerator / denominator;
        if (val < 0.0) val = 0.0;
        return std::log(1.0 + val);
    }

    static ScoreExplanation scoreBM25(
        int docId,
        const std::vector<std::string>& queryTerms,
        const InvertedIndex& index,
        double k1 = DEFAULT_K1,
        double b = DEFAULT_B
    ) {
        ScoreExplanation expl;
        expl.method = "BM25";
        expl.k1 = k1;
        expl.b = b;

        const Document* doc = index.getDocument(docId);
        if (!doc) return expl;

        size_t totalDocs = index.documentCount();
        double avgdl = index.avgDocLength();
        size_t docLength = doc->length;
        double totalScore = 0.0;

        for (const auto& term : queryTerms) {
            int tf = index.getTermFrequency(term, docId);
            if (tf <= 0) continue;

            int df = index.getDocFrequency(term);
            double idf = computeIDF(df, totalDocs);

            double lengthNorm = 1.0 - b + (b * (avgdl > 0.0 ? static_cast<double>(docLength) / avgdl : 1.0));
            double numerator = static_cast<double>(tf) * (k1 + 1.0);
            double denominator = static_cast<double>(tf) + (k1 * lengthNorm);
            double termScore = idf * (numerator / (denominator > 0.0 ? denominator : 1.0));

            totalScore += termScore;
            expl.terms.push_back({
                term,
                tf,
                idf,
                docLength,
                avgdl,
                termScore
            });
        }

        expl.totalScore = totalScore;
        return expl;
    }

    static ScoreExplanation scoreTF(
        int docId,
        const std::vector<std::string>& queryTerms,
        const InvertedIndex& index
    ) {
        ScoreExplanation expl;
        expl.method = "TF";

        const Document* doc = index.getDocument(docId);
        if (!doc) return expl;

        double avgdl = index.avgDocLength();
        double totalScore = 0.0;

        for (const auto& term : queryTerms) {
            int tf = index.getTermFrequency(term, docId);
            if (tf <= 0) continue;

            totalScore += tf;
            expl.terms.push_back({
                term,
                tf,
                1.0,
                doc->length,
                avgdl,
                static_cast<double>(tf)
            });
        }

        expl.totalScore = totalScore;
        return expl;
    }
};
