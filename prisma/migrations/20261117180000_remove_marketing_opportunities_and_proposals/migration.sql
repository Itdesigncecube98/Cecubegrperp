DELETE FROM "public"."RolePermission"
WHERE "permissionId" IN (
  SELECT "id"
  FROM "public"."Permission"
  WHERE "module" = 'Marketing' AND "subModule" = 'Opportunities'
);

DELETE FROM "public"."Permission"
WHERE "module" = 'Marketing' AND "subModule" = 'Opportunities';

DELETE FROM "public"."RoleToolAccess"
WHERE "toolId" IN (
  SELECT "id"
  FROM "public"."AdminTool"
  WHERE "module" = 'Marketing' AND "name" IN ('Opportunity Pipeline', 'Tender & Proposal')
);

DELETE FROM "public"."EmployeeProjectToolAccess"
WHERE "toolId" IN (
  SELECT "id"
  FROM "public"."AdminTool"
  WHERE "module" = 'Marketing' AND "name" IN ('Opportunity Pipeline', 'Tender & Proposal')
);

DELETE FROM "public"."AdminTool"
WHERE "module" = 'Marketing' AND "name" IN ('Opportunity Pipeline', 'Tender & Proposal');

DELETE FROM "public"."MarketingFollowup"
WHERE "opportunityId" IS NOT NULL;

ALTER TABLE "public"."MarketingFollowup"
  DROP CONSTRAINT IF EXISTS "MarketingFollowup_opportunityId_fkey",
  DROP COLUMN IF EXISTS "opportunityId";

DROP TABLE IF EXISTS "public"."MarketingNegotiation";
DROP TABLE IF EXISTS "public"."MarketingProposal";
DROP TABLE IF EXISTS "public"."MarketingTender";
DROP TABLE IF EXISTS "public"."MarketingOpportunity";
