# Operating Systems Architecture and Virtual Memory

Operating systems act as the intermediary abstraction layer managing physical computer hardware and orchestrating running processes and threads.

Virtual memory decouples a process's logical address space from physical RAM, providing process isolation and memory protection. Hardware Memory Management Units (MMUs) translate virtual addresses to physical frames using multi-level page tables, assisted by Translation Lookaside Buffers (TLBs) acting as high-speed hardware caches. When a page is absent from RAM, the CPU triggers a page fault exception, causing the kernel to swap the missing frame from disk into memory using replacement policies like LRU (Least Recently Used).

CPU process scheduling algorithms balance throughput, turnaround time, and latency using preemptive strategies such as Round Robin, Multi-Level Feedback Queues (MLFQ), and completely fair scheduling. Concurrency primitives including mutexes, spinlocks, condition variables, and semaphores prevent data races in multi-threaded execution environments.
