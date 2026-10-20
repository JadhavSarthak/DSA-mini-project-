# Search Engines and Information Retrieval Systems

Information retrieval systems and web search engines index massive corpora of unstructured documents to satisfy information needs expressed as user queries.

The core data structure is the inverted index, a hash map mapping each normalized vocabulary term to a postings list of document identifiers and term frequencies. Tokenization breaks raw text into normalized words, while stop word removal filters frequent non-discriminative terms like prepositions and articles.

Relevance ranking assesses which candidate documents best match a query. While raw term frequency provides a simple baseline, modern lexical retrieval relies on probabilistic scoring functions such as BM25 (Best Matching 25) and TF-IDF (Term Frequency-Inverse Document Frequency). BM25 applies term frequency saturation through parameter k1 and penalizes document length with parameter b relative to average collection document length.

Retrieval systems evaluate performance using benchmark metrics including Precision@K, Recall@K, and Mean Reciprocal Rank (MRR), ensuring top-ranked documents are maximally relevant.
