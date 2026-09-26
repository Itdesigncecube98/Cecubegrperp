# Bugfix Requirements Document

## Introduction

This document addresses critical issues in the Material Requisition → GRN → GTN workflow for site material management. The current implementation has three main defects:

1. GTN form uses text input for Material Name instead of a dropdown from the Material Library
2. Material Category dropdown uses hardcoded values instead of fetching from Material Library API
3. No workflow integration exists - materials from Material Requisitions don't flow through GRN to GTN

These defects prevent proper material tracking, testing workflow automation, and data consistency across the engineering site management system.

## Bug Analysis

### Current Behavior (Defect)

**Material Selection Issues:**

1.1 WHEN creating a GTN entry THEN the system displays Material Name as a free-text input field instead of a dropdown

1.2 WHEN selecting Material Category in GTN form THEN the system shows a hardcoded list instead of fetching categories from Material Library API

1.3 WHEN a Material Category is selected in GTN form THEN the system does not filter the Material Name options by category

**Workflow Integration Issues:**

1.4 WHEN a Material Requisition is created and approved THEN the system does not make those materials available for selection in GRN entries

1.5 WHEN creating a GRN entry THEN the system does not provide an option to mark materials as "Requires GTN Testing"

1.6 WHEN a GRN item is marked as requiring testing THEN the system does not auto-create or auto-populate a GTN entry for that material

1.7 WHEN viewing Material Requisitions, GRN, or GTN lists THEN the system does not show workflow links or status connections between related entries

**Data Source Issues:**

1.8 WHEN the GTN form loads THEN the system does not fetch material data from the Material Library API endpoint (`/api/engineering/material-library`)

1.9 WHEN the GRN form loads THEN the system does not fetch approved Material Requisitions from `/api/engineering/requisitions`

### Expected Behavior (Correct)

**Material Selection Fixes:**

2.1 WHEN creating a GTN entry THEN the system SHALL display Material Name as a searchable dropdown populated from the Material Library API

2.2 WHEN the GTN form loads THEN the system SHALL fetch Material Categories by calling `/api/engineering/material-library` and extracting unique category groups

2.3 WHEN a Material Category is selected in GTN form THEN the system SHALL filter the Material Name dropdown to show only materials belonging to that category

**Workflow Integration Fixes:**

2.4 WHEN creating a GRN entry THEN the system SHALL display a dropdown of materials from approved Material Requisitions linked to the current site

2.5 WHEN adding a material to GRN THEN the system SHALL provide a checkbox labeled "Requires GTN Testing?" for each material line item

2.6 WHEN a GRN is saved with materials marked "Requires GTN Testing" THEN the system SHALL automatically create GTN entries with those materials pre-populated in the form

2.7 WHEN viewing a Material Requisition THEN the system SHALL display links/badges showing which materials have associated GRN and GTN entries

**Data Source Fixes:**

2.8 WHEN the GTN form loads THEN the system SHALL call `/api/engineering/material-library` to populate material dropdowns with nested group and material data

2.9 WHEN the GRN form loads THEN the system SHALL call `/api/engineering/requisitions` with appropriate filters to fetch requisitioned materials for the current site

### Unchanged Behavior (Regression Prevention)

**GTN Entry Preservation:**

3.1 WHEN creating a standalone GTN entry (not from GRN) THEN the system SHALL CONTINUE TO allow manual entry of all GTN fields including test results, specifications, and remarks

3.2 WHEN viewing existing GTN entries THEN the system SHALL CONTINUE TO display all historical GTN records with their original data intact

3.3 WHEN editing an existing GTN entry THEN the system SHALL CONTINUE TO allow modification of test results, pass/fail status, and remarks

**GRN Entry Preservation:**

3.4 WHEN creating a GRN without marking any materials for testing THEN the system SHALL CONTINUE TO save the GRN normally without creating GTN entries

3.5 WHEN viewing existing GRN entries THEN the system SHALL CONTINUE TO display all GRN records with quantities, suppliers, and received dates

3.6 WHEN editing an existing GRN entry THEN the system SHALL CONTINUE TO allow modification of received quantities and supplier details

**Material Requisition Preservation:**

3.7 WHEN creating a Material Requisition THEN the system SHALL CONTINUE TO allow specification of materials, quantities, and justifications

3.8 WHEN approving/rejecting Material Requisitions THEN the system SHALL CONTINUE TO enforce supervisor approval workflows

3.9 WHEN viewing Material Requisition history THEN the system SHALL CONTINUE TO show approval status, timestamps, and approver details

**API and Database Preservation:**

3.10 WHEN the Material Library API is called THEN the system SHALL CONTINUE TO return the nested group structure with materials as currently implemented

3.11 WHEN saving GTN, GRN, or Material Requisition data THEN the system SHALL CONTINUE TO validate required fields and enforce data integrity constraints

3.12 WHEN filtering or searching existing records THEN the system SHALL CONTINUE TO support pagination, sorting, and search functionality
