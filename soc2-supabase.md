# SOC 2 Evidence Statement: Supabase PITR Configuration

**Date:** Monday, November 10, 2025  
**Platform:** SUPABASE  
**Scope:** SOC 2 Compliance Evidence

---

## Statement of Scope

For the purposes of SOC 2 compliance, **only the "valyu-exchange" project is in scope**. All other Supabase projects in our account are hosted versions of open-source applications and do **not** require SOC 2 controls or Point-in-Time Recovery (PITR).

---

## Evidence of PITR Configuration

- **Project:** valyu-exchange  
  - **PITR Status:** Enabled  
  - **SOC 2 Scope:** In scope (main platform)

- **Other Projects:**  
  - **PITR Status:** Not enabled  
  - **SOC 2 Scope:** Out of scope (non-critical, open-source hosted apps)

---

## Rationale

- **valyu-exchange** is our primary production platform and the only project handling sensitive customer data subject to SOC 2 requirements.
- All other Supabase projects are non-critical, do not process sensitive data, and are not included in our SOC 2 scope.

---

## Supporting Supabase Compliance Controls

- Supabase is **SOC 2 Type 2 compliant** and regularly audited. All projects are governed by the same set of compliance controls, but additional controls (such as PITR) are applied only where required by our internal risk assessment and compliance obligations[[4]](https://supabase.com/docs/guides/security)[[5]](https://supabase.com/security)[[1]](https://supabase.com/blog/supabase-soc2)[[3]](https://supabase.com/features/soc-2-compliance).
- Our configuration aligns with Supabase’s shared responsibility model and best practices for minimizing risk and cost[[8]](https://supabase.com/docs/guides/deployment/shared-responsibility-model)[[4]](https://supabase.com/docs/guides/security).

---

## Summary Table

| Project Name      | SOC 2 Scope | PITR Enabled | Notes                                 |
|-------------------|-------------|--------------|---------------------------------------|
| valyu-exchange    | In scope    | Yes          | Main platform, SOC 2 controls applied |
| All others        | Out of scope| No           | Hosted open-source, not in SOC 2 scope|

---

## Attestation

This document provides evidence that **PITR is enabled only for the "valyu-exchange" project**, which is the sole Supabase project in our SOC 2 compliance scope. All other projects are excluded from SOC 2 and do not require PITR.

