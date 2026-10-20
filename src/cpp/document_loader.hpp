#pragma once

#include <string>
#include <vector>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <unordered_map>
#include "text_processor.hpp"

namespace fs = std::filesystem;

struct Document {
    int id;
    std::string path;
    std::string filename;
    std::string title;
    std::string text;
    size_t length;
    std::vector<std::string> tokens;
};

struct LoadResult {
    std::vector<Document> documents;
    std::vector<std::pair<std::string, std::string>> skippedDuplicates;
    std::vector<std::pair<std::string, std::string>> errors;
};

class DocumentLoader {
public:
    static LoadResult loadFromDirectory(const std::string& dirPath) {
        LoadResult result;

        if (!fs::exists(dirPath)) {
            result.errors.push_back({dirPath, "Directory does not exist"});
            return result;
        }

        std::vector<std::string> filePaths;
        for (const auto& entry : fs::directory_iterator(dirPath)) {
            if (entry.is_regular_file()) {
                std::string ext = entry.path().extension().string();
                if (ext == ".md" || ext == ".txt") {
                    filePaths.push_back(entry.path().string());
                }
            }
        }

        // Sort paths alphabetically to guarantee stable deterministic document IDs
        std::sort(filePaths.begin(), filePaths.end());

        std::unordered_map<std::string, std::string> seenFingerprints;
        int nextId = 0;

        for (const auto& pStr : filePaths) {
            fs::path p(pStr);
            std::string filename = p.filename().string();

            std::ifstream file(pStr);
            if (!file.is_open()) {
                result.errors.push_back({filename, "Could not open file"});
                continue;
            }

            std::stringstream buffer;
            buffer << file.rdbuf();
            std::string rawContent = buffer.str();

            if (rawContent.empty() || std::all_of(rawContent.begin(), rawContent.end(), [](char c) { return std::isspace(static_cast<unsigned char>(c)); })) {
                result.errors.push_back({filename, "File is empty"});
                continue;
            }

            auto tokens = TextProcessor::tokenize(rawContent);
            if (tokens.empty()) {
                result.errors.push_back({filename, "File contains no alphanumeric tokens"});
                continue;
            }

            // Fingerprint check: normalized token stream
            std::string fingerprint;
            for (size_t i = 0; i < tokens.size(); ++i) {
                if (i > 0) fingerprint += " ";
                fingerprint += tokens[i];
            }

            if (seenFingerprints.find(fingerprint) != seenFingerprints.end()) {
                result.skippedDuplicates.push_back({filename, seenFingerprints[fingerprint]});
                continue;
            }
            seenFingerprints[fingerprint] = filename;

            // Title extraction: first line starting with '# '
            std::string title;
            std::istringstream stream(rawContent);
            std::string line;
            while (std::getline(stream, line)) {
                size_t firstNonSpace = line.find_first_not_of(" \t\r\n");
                if (firstNonSpace != std::string::npos && line.compare(firstNonSpace, 2, "# ") == 0) {
                    title = line.substr(firstNonSpace + 2);
                    // Trim trailing whitespace
                    while (!title.empty() && std::isspace(static_cast<unsigned char>(title.back()))) {
                        title.pop_back();
                    }
                    break;
                }
            }

            if (title.empty()) {
                title = filename;
                if (title.length() > 3 && title.substr(title.length() - 3) == ".md") {
                    title = title.substr(0, title.length() - 3);
                }
                std::replace(title.begin(), title.end(), '-', ' ');
                std::replace(title.begin(), title.end(), '_', ' ');
            }

            Document doc;
            doc.id = nextId++;
            doc.path = pStr;
            doc.filename = filename;
            doc.title = title;
            doc.text = rawContent;
            doc.length = tokens.size();
            doc.tokens = std::move(tokens);

            result.documents.push_back(std::move(doc));
        }

        return result;
    }
};
