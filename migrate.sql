-- Migration script to copy data from old to new database
-- This script will be executed against the new database

-- Disable foreign key constraints temporarily
ALTER TABLE "Leave" DISABLE TRIGGER ALL;
ALTER TABLE "Trip" DISABLE TRIGGER ALL;
ALTER TABLE "LocationRequest" DISABLE TRIGGER ALL;
ALTER TABLE "EmployeeDocument" DISABLE TRIGGER ALL;
ALTER TABLE "EmailLog" DISABLE TRIGGER ALL;

-- Copy Admin data
INSERT INTO "Admin" 
SELECT * FROM postgres_fdw.public."Admin" 
ON CONFLICT DO NOTHING;

-- Copy Employee data
INSERT INTO "Employee" 
SELECT * FROM postgres_fdw.public."Employee" 
ON CONFLICT DO NOTHING;

-- Copy Holiday data
INSERT INTO "Holiday" 
SELECT * FROM postgres_fdw.public."Holiday" 
ON CONFLICT DO NOTHING;

-- Copy Location data
INSERT INTO "Location" 
SELECT * FROM postgres_fdw.public."Location" 
ON CONFLICT DO NOTHING;

-- Copy Vehicle data
INSERT INTO "Vehicle" 
SELECT * FROM postgres_fdw.public."Vehicle" 
ON CONFLICT DO NOTHING;

-- Copy Trip data
INSERT INTO "Trip" 
SELECT * FROM postgres_fdw.public."Trip" 
ON CONFLICT DO NOTHING;

-- Copy LocationRequest data
INSERT INTO "LocationRequest" 
SELECT * FROM postgres_fdw.public."LocationRequest" 
ON CONFLICT DO NOTHING;

-- Copy EmployeeDocument data
INSERT INTO "EmployeeDocument" 
SELECT * FROM postgres_fdw.public."EmployeeDocument" 
ON CONFLICT DO NOTHING;

-- Copy EmailLog data
INSERT INTO "EmailLog" 
SELECT * FROM postgres_fdw.public."EmailLog" 
ON CONFLICT DO NOTHING;

-- Copy Leave data
INSERT INTO "Leave" 
SELECT * FROM postgres_fdw.public."Leave" 
ON CONFLICT DO NOTHING;

-- Copy Announcement data
INSERT INTO "Announcement" 
SELECT * FROM postgres_fdw.public."Announcement" 
ON CONFLICT DO NOTHING;

-- Copy Setting data
INSERT INTO "Setting" 
SELECT * FROM postgres_fdw.public."Setting" 
ON CONFLICT DO NOTHING;

-- Re-enable foreign key constraints
ALTER TABLE "Leave" ENABLE TRIGGER ALL;
ALTER TABLE "Trip" ENABLE TRIGGER ALL;
ALTER TABLE "LocationRequest" ENABLE TRIGGER ALL;
ALTER TABLE "EmployeeDocument" ENABLE TRIGGER ALL;
ALTER TABLE "EmailLog" ENABLE TRIGGER ALL;

-- Verify data counts
SELECT 'Admin' as table_name, COUNT(*) as record_count FROM "Admin"
UNION ALL
SELECT 'Employee', COUNT(*) FROM "Employee"
UNION ALL
SELECT 'Holiday', COUNT(*) FROM "Holiday"
UNION ALL
SELECT 'Location', COUNT(*) FROM "Location"
UNION ALL
SELECT 'Vehicle', COUNT(*) FROM "Vehicle"
UNION ALL
SELECT 'Trip', COUNT(*) FROM "Trip"
UNION ALL
SELECT 'LocationRequest', COUNT(*) FROM "LocationRequest"
UNION ALL
SELECT 'EmployeeDocument', COUNT(*) FROM "EmployeeDocument"
UNION ALL
SELECT 'EmailLog', COUNT(*) FROM "EmailLog"
UNION ALL
SELECT 'Leave', COUNT(*) FROM "Leave"
UNION ALL
SELECT 'Announcement', COUNT(*) FROM "Announcement"
UNION ALL
SELECT 'Setting', COUNT(*) FROM "Setting";
