#pragma once

#include <string>
#include <vector>
#include <chrono>
#include "top_k.hpp"

struct QueryJob {
    std::string id;
    std::string query;
    std::string mode;
    std::string ranking;
    int k;
    long long queuedAt;
    long long startedAt = 0;
    long long finishedAt = 0;
    double durationMs = 0.0;
    std::string status;
    std::vector<SearchResult> results;
};

template<typename T>
struct QueueNode {
    T data;
    QueueNode* next = nullptr;
    explicit QueueNode(const T& d) : data(d), next(nullptr) {}
};

class QueryQueue {
private:
    QueueNode<QueryJob>* head = nullptr;
    QueueNode<QueryJob>* tail = nullptr;
    size_t currentLength = 0;
    int requestCounter = 0;

public:
    QueryQueue() = default;

    ~QueryQueue() {
        while (head != nullptr) {
            QueueNode<QueryJob>* temp = head;
            head = head->next;
            delete temp;
        }
    }

    std::string enqueue(
        const std::string& query,
        const std::string& mode = "OR",
        const std::string& ranking = "BM25",
        int k = 5
    ) {
        requestCounter++;
        auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();

        std::string requestId = "req-" + std::to_string(now) + "-" + std::to_string(requestCounter);

        QueryJob job;
        job.id = requestId;
        job.query = query;
        job.mode = mode;
        job.ranking = ranking;
        job.k = k;
        job.queuedAt = now;
        job.status = "queued";

        auto* node = new QueueNode<QueryJob>(job);
        if (!head) {
            head = node;
            tail = node;
        } else {
            tail->next = node;
            tail = node;
        }

        currentLength++;
        return requestId;
    }

    bool dequeue(QueryJob& outJob) {
        if (!head) return false;

        QueueNode<QueryJob>* node = head;
        head = head->next;
        if (!head) {
            tail = nullptr;
        }

        currentLength--;
        outJob = node->data;
        outJob.status = "processing";
        outJob.startedAt = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();

        delete node;
        return true;
    }

    size_t length() const {
        return currentLength;
    }

    bool empty() const {
        return head == nullptr;
    }
};
