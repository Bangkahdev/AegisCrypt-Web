---
sidebar_position: 1
slug: /
title: "Overview"
description: "Introduction to AegisCrypt, its zero-knowledge model, key capabilities, and documentation map."
---

<div className="doc-hero">
  <div className="doc-hero__eyebrow">Official Documentation</div>
  <h1>AegisCrypt Documentation</h1>
  <p className="lead">
    AegisCrypt is a browser-based file encryption tool built on a <strong>zero-knowledge</strong> principle.
    Encryption, decryption, and key handling run locally on the user's device through the Web Crypto API.
    Files, passwords, keyfiles, and keys are never sent to a server.
  </p>
  <div className="doc-hero__actions">
    <a className="btn-doc btn-doc--primary" href="/mulai-cepat">Quick Start</a>
    <a className="btn-doc" href="https://aegiscrypt.bangkah.tech" target="_blank" rel="noopener noreferrer">Open App</a>
    <a className="btn-doc" href="https://github.com/Bangkahdev/AegisCrypt-Web" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
  </div>
</div>

## Start here

<div className="doc-grid">
  <a className="doc-card" href="/mulai-cepat">
    <div className="doc-card__label">Introduction</div>
    <h3>Quick Start</h3>
    <p>Open the app, start a session, and encrypt and decrypt your first file in a few steps.</p>
  </a>
  <a className="doc-card" href="/panduan-pengguna">
    <div className="doc-card__label">Guide</div>
    <h3>User Guide</h3>
    <p>Complete workflows: keyfiles, recovery keys, password rewrap, batch processing, and offline mode.</p>
  </a>
  <a className="doc-card" href="/arsitektur">
    <div className="doc-card__label">Concepts</div>
    <h3>Architecture & Security</h3>
    <p>How data is processed on the client, trust boundaries, Web Workers, temporary storage, and the threat model.</p>
  </a>
  <a className="doc-card" href="/format-file">
    <div className="doc-card__label">Reference</div>
    <h3>.aegis v3 Format</h3>
    <p>Container specification: header, DEK/KEK envelope, authenticated records, filename metadata, and recovery slot.</p>
  </a>
</div>

## Key capabilities

| Capability | Description |
| --- | --- |
| **Authenticated encryption** | AES-256-GCM for payload, filename metadata, and DEK wrapping. Tampering is detected and operations fail safely. |
| **Envelope encryption** | Each file uses a random 256-bit DEK wrapped by a credential-derived KEK, allowing credentials to be changed without re-encrypting the payload. |
| **Password + keyfile** | Key material: `UTF8(password) \|\| SHA-256(keyfile bytes)` (keyfile optional). |
| **Recovery key** | Optional recovery slot (256-bit key stored offline by the user) to open files that include a recovery slot. |
| **Credential rewrap** | Change password/keyfile/iterations by rewriting the header; the payload remains intact. |
| **Streaming & responsiveness** | Chunk/record processing in a Web Worker; decryption can use OPFS when available. |
| **Offline / PWA** | App assets can be cached for offline use; user files are never stored in cache. |
| **Web & Desktop parity** | The `.aegis` v3 format and test vectors are shared across Web and .NET 8 implementations. |

## Security properties (summary)

- **Local to the device:** cryptography runs in the browser; there is no file upload or server-side key management.
- **KDF:** PBKDF2-HMAC-SHA256, default 600,000 iterations (range 600,000-5,000,000, stored in the header).
- **Integrity:** AAD binds the header, record indices, filename metadata, and recovery domain; truncated or modified containers are rejected.
- **Session control:** session keys live in memory while active; the app provides lock/auto-lock and best-effort cleanup in the UI.

:::warning Important limitations
AegisCrypt cannot protect data on a compromised device, OS, or browser. Losing the password, keyfile, and recovery key can make files unrecoverable. Temporary-file deletion is not a guaranteed secure erase on all storage media. The v3 format is a frozen candidate and has not yet undergone an independent cryptographic audit.
:::

## Sites & sources

| Resource | URL | Description |
| --- | --- | --- |
| Web app | [aegiscrypt.bangkah.tech](https://aegiscrypt.bangkah.tech) | Encrypt/decrypt files in the browser |
| Documentation | [docs.aegiscrypt.bangkah.tech](https://docs.aegiscrypt.bangkah.tech) | This site |
| Source code | [GitHub](https://github.com/Bangkahdev/AegisCrypt-Web) | Monorepo for Web, Desktop, and documentation |

## Documentation map

<div className="doc-grid doc-grid-3">
  <a className="doc-card" href="/mulai-cepat"><h3>Quick Start</h3><p>First steps to use the app.</p></a>
  <a className="doc-card" href="/panduan-pengguna"><h3>User Guide</h3><p>Features and everyday workflows.</p></a>
  <a className="doc-card" href="/keamanan"><h3>Security Model</h3><p>Threats, mitigations, and user responsibilities.</p></a>
  <a className="doc-card" href="/format-file"><h3>.aegis v3 Format</h3><p>Binary structure and validation rules.</p></a>
  <a className="doc-card" href="/referensi-api"><h3>Web API Reference</h3><p>Web cryptography API (<code>cryptoService</code>).</p></a>
  <a className="doc-card" href="/troubleshooting"><h3>Troubleshooting</h3><p>Common symptoms and fixes.</p></a>
</div>
