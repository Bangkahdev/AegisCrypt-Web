# AegisCrypt-Web Use Case Documentation

> *Dokumentasi ini juga tersedia dalam versi bahasa Inggris di [docs/use_case.md](use_case.md).*

---

## 1. Overview

AegisCrypt-Web is a client-side, zero-knowledge encryption suite designed to provide military-grade file security directly within the web browser. Utilizing the Web Crypto API, all cryptographic operations occur locally in the user's device RAM, ensuring that raw data, passwords, and keys are never transmitted to any external server.

---

## 2. Use Case Scenarios

### Use Case 1: File Encryption (Data Confidentiality & Integrity)

* **Actor:** End User
* **Goal:** Secure sensitive local files or folders before storing them on public cloud providers or transmitting them over unsecured networks.
* **Preconditions:** The user has access to a modern web browser and a strong master password (with an optional physical keyfile).
* **Workflow:**
1. **Session Initialization:** The user enters a secure password and optionally uploads a designated secondary keyfile (photo, document, or binary file) to establish two-factor authentication (2FA).
2. **File Ingestion:** The user drags and drops target files into the application's processing queue.
3. **Execution:** Upon triggering the encryption action, the system streams the files in optimized 1MB blocks, outputting a hardened `.aegis` container file via automatic browser download.



### Use Case 2: File Decryption (Data Restoration)

* **Actor:** End User
* **Goal:** Restore previously encrypted `.aegis` files back to their original state.
* **Preconditions:** Possession of the exact master password and/or keyfile used during the original encryption process.
* **Workflow:**
1. **Authentication:** The user logs in using the exact credentials (password + keyfile) mapped to the target file.
2. **File Ingestion:** The user uploads the `.aegis` container file into the decryption interface.
3. **Execution:** The system validates the file format headers, derives the decryption key, and processes the authenticated blocks to restore the original file.



---

## 3. Behind the Scenes: Cryptographic Architecture

When a user initiates an operation, the browser executes the following cryptographic protocols under the hood:

* **Key Derivation (PBKDF2):**
The user's password (and the SHA-256 hash of the optional keyfile) is processed through **PBKDF2** using **100,000 iterations** combined with a cryptographically secure 32-byte random salt. This mitigates brute-force and rainbow table attacks.
* **Authenticated Encryption (AES-256-GCM):**
Data is secured using **AES-256-GCM** (Galois/Counter Mode). Unlike standard CBC modes, GCM provides built-in authentication. If a file is tampered with—or if incorrect credentials are supplied—decryption fails instantly, protecting against data corruption and tampering.
* **Streaming Chunk Architecture (v2):**
To handle multi-gigabyte files without exhausting browser memory, data is split into 1MB chunks. Each chunk is encrypted with a unique, randomly generated 12-byte **Initialization Vector (IV)**, preventing pattern analysis and IV reuse vulnerabilities.

---

## 4. Step-by-Step User Instructions

### Encrypting Files

1. Open the AegisCrypt-Web interface in your browser.
2. Enter a robust master password into the password field.
3. *(Optional)* Toggle **Use Keyfile (2FA)** and select a physical verification file.
4. Click **Start Session** to access the main dashboard.
5. Drag and drop your files or folders into the secure drop zone.
6. Click the **Lock** icon to begin processing.
7. Accept the browser download prompt when the `.aegis` container file is generated.

### Decrypting Files

1. Open the application and authenticate using the **exact same password and keyfile** used during encryption.
2. Drag and drop your `.aegis` file into the dashboard zone.
3. Click the **Unlock** icon to process the container.
4. Retrieve your restored original file automatically downloaded by your browser.