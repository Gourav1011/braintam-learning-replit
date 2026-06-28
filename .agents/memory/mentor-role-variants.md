---
name: Mentor role variants require middleware update
description: When new mentor role values are added (sales_mentor, academic_mentor), every requireRole() call that includes "mentor" must also be updated, or those users get 403s.
---

## Rule
Whenever a new mentor-flavoured role is added to the DB (e.g. `sales_mentor`, `academic_mentor`), every `requireRole(...)` call that included `"mentor"` must be updated to also include the new variants. Forgetting even one file causes a 403 for those users on that route.

**Why:** The `requireRole` middleware does an exact role string match. The DB stores the specific sub-role (`sales_mentor`, not `mentor`). There is no role hierarchy — each variant must be listed explicitly.

**How to apply:** Before marking a new mentor role as production-ready, grep every route file:
```
grep -rn "requireRole.*\"mentor\"" artifacts/api-server/src/routes/
```
Any line missing the new role variants must be updated. Files to check (as of June 2026):
- `mentor.ts` → `mentorAuth`
- `mentorExtended.ts` → `mentorAuth`
- `longTermPayments.ts` → `mentorAuth`
- `masteryRetention.ts` → `allStaff`
- `masteryNotifications.ts` → `allStaff`
- `masteryPayments.ts` → `allStaff`
- `masteryDeployment.ts` → `allStaff`
- `admin.ts` → `allStaffAuth`
- `checkins.ts` → `staffAuth`
- `staff.ts` → `staffAuth`
- `permissions.ts` → inline requireRole
- `masteryStudents.ts` → `allStaff`
