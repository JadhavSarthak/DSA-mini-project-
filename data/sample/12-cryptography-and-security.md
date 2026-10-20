# Cryptography and Information Security Foundations

Modern cryptography guarantees information confidentiality, data integrity, non-repudiation, and mutual authentication across open communication channels and computer systems.

Symmetric key cryptography uses identical shared secret keys for both encryption and decryption. Block ciphers like the Advanced Encryption Standard (AES) encrypt fixed-size blocks (128 bits) using substitution-permutation networks across modes of operation such as Galois/Counter Mode (GCM), which provides authenticated encryption with associated data (AEAD).

Asymmetric or public-key cryptography utilizes mathematically matched key pairs where a public key encrypts data or verifies signatures, and a private key decrypts ciphertext or generates digital signatures. Classical asymmetric systems rely on computationally intractable mathematical problems, such as integer factorization in RSA and the discrete logarithm problem over elliptic curves (ECC).

Cryptographic hash functions such as SHA-256 and SHA-3 map arbitrary-length messages to fixed-length digests with pre-image resistance, second pre-image resistance, and collision resistance, securing digital certificates, blockchain transactions, and message authentication codes (HMAC).
