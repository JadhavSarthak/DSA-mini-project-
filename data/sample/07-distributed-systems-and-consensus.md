# Distributed Systems and Consensus Algorithms

Distributed systems coordinate multiple independent computational nodes communicating over asynchronous computer networks without a shared global memory clock.

Core challenges stem from network partitions, message loss, latency variances, and partial node failures, summarized by the CAP theorem stating that a distributed data store can guarantee at most two of Consistency, Availability, and Partition tolerance simultaneously.

Distributed consensus protocols enable a cluster of nodes to agree on a state machine log or shared value despite node crashes. Classical Paxos provides safety under asynchronous network conditions. Modern systems widely favor the Raft consensus algorithm due to its explicit leader election, log replication, and intuitive decomposition into comprehensible subproblems.

Byzantine Fault Tolerant (BFT) consensus algorithms, such as PBFT, further protect systems against adversarial nodes that may lie or act maliciously, forming the backbone of secure decentralized ledgers and distributed trust networks.
