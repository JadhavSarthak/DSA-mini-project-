# Database Storage Engines and Indexing Techniques

Database storage engines govern how structured records and documents are physically arranged, retrieved, and updated on non-volatile persistent storage media.

B-Trees and B+ Trees serve as the predominant indexing structure for relational database systems like PostgreSQL and MySQL InnoDB. Because disk and solid-state block access incurs significant physical latency, B+ Trees feature wide branching factors that keep tree heights low (typically 3 to 4 levels) while keeping leaf node sequences linked for rapid range scans.

Log-Structured Merge-Trees (LSM-trees) prioritize heavy write workloads by appending updates to an in-memory memtable (often implemented as a skip list) and a sequential Write-Ahead Log (WAL) before flushing sorted string tables (SSTables) to disk and periodically merging them via background compaction.

Hash indexes offer constant-time point queries for exact key lookups but lack support for range iteration. Modern search database engines combine inverted indices with column-oriented formats to accelerate analytical aggregations and full-text keyword scans.
