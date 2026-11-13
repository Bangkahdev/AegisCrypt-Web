# Security Policy

## Supported Scope

Security reports are welcome for this repository and its deployed surfaces:

- Web app: https://aegiscrypt.bangkah.tech
- Documentation: https://docs.aegiscrypt.bangkah.tech
- Source in this repository, including the web client, desktop core/CLI/app, and build tooling

The cryptographic core and file format are security-sensitive. Please report issues privately before public disclosure.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Report vulnerabilities by email to: **atha@bangkah.tech**

Please include, when available:
- A clear description of the issue and affected component/version/commit
- Reproduction steps or a proof of concept
- Expected vs. actual behavior and potential impact
- Any suggested mitigation

If the report involves sensitive material (keys, plaintext, personal data), share only the minimum necessary to reproduce the issue.

## Response Targets (best effort)

This project is maintained by a small team. Targets below are goals, not guarantees:

| Stage | Target |
|---|---|
| Acknowledgment | Within 3 business days |
| Initial triage / severity assessment | Within 7 business days |
| Status update | At least every 14 days while active |
| Fix and coordinated disclosure | As soon as practical, based on severity and complexity |

Critical issues (e.g. cryptographic break, key/secret exposure, authentication bypass in future services) are prioritized.

## Coordinated Disclosure

Please allow reasonable time to investigate and remediate before public disclosure. We will coordinate a disclosure timeline with you and credit reporters who want attribution (unless anonymity is requested).

## Security Notes

- **Decrypt-first principle:** decryption must remain possible without license/account/network dependencies for valid credentials and intact containers.
- **Secure delete (`shred`):** in-place overwrite does not guarantee physical erasure on SSD/flash media due to wear leveling; full-file encryption remains the primary protection.
- **Security claims:** claims such as "secure" or "zero-knowledge" should be treated as goals backed by design/tests/audits, not absolute guarantees until independently audited.

## Out of Scope (examples)

- Issues requiring a fully compromised client device/OS or physical access beyond stated threat assumptions
- Social engineering, spam, or denial of service without a concrete vulnerability
- Vulnerabilities only in unsupported/modified forks
- Missing best-practice headers on non-production or third-party infrastructure outside our control

If unsure whether something is in scope, please report it privately.
