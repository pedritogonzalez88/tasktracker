# Firebase Security Specification

## 1. Data Invariants
- A `Task` cannot exist without a valid `ownerId` matching the authenticated user.
- A `Note` cannot exist without a valid `ownerId` matching the authenticated user.
- System fields like `createdAt` are immutable after creation.
- Fields like `title` and `content` have strict size limits to prevent 'Denial of Wallet' attacks.
- Only the owner of a document is allowed to do read/write operations.

## 2. "Dirty Dozen" Payloads
1. **Missing Owner**: Create a task omitting `ownerId`.
2. **Spoof Owner**: Create a task with someone else's `ownerId`.
3. **Ghost Field**: Create a note with extra properties.
4. **Invalid Type**: Set `title` to an integer.
5. **No Timestamps**: Omitting `createdAt` or `updatedAt`.
6. **Denial of Wallet**: Note content string size exceeding 10000 characters.
7. **Client Timestamp**: Setting `createdAt` to a timestamp not matching `.time`.
8. **Immortal Edit**: Mutating `createdAt` during update.
9. **Lockout Subversion**: Mutating `ownerId` during update.
10. **Query Theft**: Query list without explicitly asserting `resource.data.ownerId == request.auth.uid`.
11. **Id Poisoning**: Document id > 128 chars.
12. **Id Mismatch**: Document id payload injection containing invalid characters.

## 3. Test Runner
We implement tests targeting the standard assertions.
