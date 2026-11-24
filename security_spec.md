# Security Specification — Seja Mais Odontologia (3-Role RBAC)

## 1. Roles & Permissions Matrix
- **`gestao` (Gestão)**: Bootstrapped admin (`thallespborba@gmail.com`) or promoted/invited by Gestão. Full access to all clinic collections, financial DRE, history, and Access Management (`members` + `invites`).
- **`dentista` (Dentista)**: Active clinic dentist. Can view doctors & schedule, update own linked doctor stats, log own revenue procedures, and access operational tools. Cannot read clinic financial history, DRE, goals, or manage user roles.
- **`funcionario` (Funcionário)**: Default role for newly self-registered Google accounts without an invite. Can manage dental supplies/stock (`supplies`), record material purchase expenses (`transactions` create-only for `despesa/Materiais`), and view doctors for clinic scheduling. Cannot read financial transactions, DRE, goals, or manage user roles.

## 2. Core Data Invariants
1. **Master Gate**: Every write to `/clinics/{clinicId}/...` verifies parent clinic existence and active member role via `get(/databases/$(database)/documents/clinics/$(clinicId)/members/$(request.auth.uid))`.
2. **Prevent Self-Assigned Roles**: On registration (`create` of `/users/{uid}` and `/clinics/{clinicId}/members/{uid}`), a user can ONLY assign `role: "funcionario"` unless they are the verified bootstrapped admin (`thallespborba@gmail.com`) OR their role strictly matches a trusted invite document at `/clinics/{clinicId}/invites/{inviteId}` whose `email == request.auth.token.email.lower()`.
3. **Immutable Self-Role**: Non-Gestão users cannot modify `role`, `active`, or `linkedDoctorId` on `/users/{uid}` or `/clinics/{clinicId}/members/{uid}`.
4. **PII Isolation**: Emails and phones are strictly isolated inside `/users/{uid}/private/info` (owner or Gestão only) and `/clinics/{clinicId}/invites/{inviteId}` (Gestão or matching verified email only).
5. **Temporal Integrity & Strict Schema**: All `create` writes enforce `createdAt == request.time && updatedAt == request.time`, `hasAll`/`hasOnly`, and explicit string `.size()` bounds; all `update` writes enforce `affectedKeys().hasOnly(...)` and immutable `createdAt`/`clinicId`/`uid`.

## 3. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read on `/clinics/sejamais-principal/transactions`.
2. Unverified email spoof with `email: "thallespborba@gmail.com"` and `email_verified: false`.
3. Self-assigned `role: "gestao"` on user registration without an invite.
4. Self-assigned `role: "dentista"` without matching invite email.
5. `funcionario` updating own `/clinics/sejamais-principal/members/{uid}` to set `role: "gestao"`.
6. `funcionario` attempting `LIST` or `GET` on `/clinics/sejamais-principal/transactions`.
7. `dentista` attempting `DELETE` on `/clinics/sejamais-principal/supplies/sup-1`.
8. Deactivated user (`active: false`) attempting to read or write any clinic collection.
9. Shadow field injection (`{ isSuperAdmin: true }`) on member or transaction create/update.
10. Cross-user PII read (`GET /users/otherUid/private/info`) by a `dentista` or `funcionario`.
11. Backdated timestamp forgery (`createdAt` != `request.time`).
12. `funcionario` attempting to create a `receita` transaction (only `despesa` with `category == 'Materiais'` is allowed).
