import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch items by type
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
    }

    let items = [];

    switch (type) {
      case 'departments':
        items = await prisma.department.findMany({
          orderBy: { name: 'asc' }
        });
        break;
      case 'branches':
        items = await prisma.branch.findMany({
          orderBy: { name: 'asc' }
        });
        break;
      case 'siteoffices':
        items = await prisma.siteOffice.findMany({
          orderBy: { name: 'asc' }
        });
        break;
      case 'organizations':
        items = await prisma.organization.findMany({
          orderBy: { name: 'asc' }
        });
        break;
      case 'imprestheads':
        items = await prisma.$queryRaw`SELECT id, name, "createdAt" FROM "ImprestHead" ORDER BY name ASC`;
        break;
      case 'grades':
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "GradeConfig" (id SERIAL PRIMARY KEY, designation TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, description TEXT, "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(designation, name))`;
        await prisma.$executeRaw`ALTER TABLE "GradeConfig" ADD COLUMN IF NOT EXISTS designation TEXT NOT NULL DEFAULT ''`;
        items = await prisma.$queryRaw`SELECT id, designation, name, description, "createdAt" FROM "GradeConfig" ORDER BY designation ASC, name ASC`;
        break;
      case 'designations':
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "DesignationConfig" (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT, "createdAt" TIMESTAMP NOT NULL DEFAULT NOW())`;
        items = await prisma.$queryRaw`SELECT id, name, description, "createdAt" FROM "DesignationConfig" ORDER BY name ASC`;
        break;
      case 'impresttypes':
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "ImprestTypeConfig" (id SERIAL PRIMARY KEY, "imprestHead" TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, description TEXT, "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE("imprestHead", name))`;
        items = await prisma.$queryRaw`SELECT id, "imprestHead", name, description, "createdAt" FROM "ImprestTypeConfig" ORDER BY "imprestHead" ASC, name ASC`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

// POST - Create new item
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, name, organization, description, textColor, bgColor, department, grade, designation, imprestHead } = body;

    if (!type || !name) {
      return NextResponse.json({ error: 'Type and name are required' }, { status: 400 });
    }

    let item = null;
    const data = {
      name,
      organization: organization || null,
      description: description || null
    };

    switch (type) {
      case 'departments':
        item = await prisma.department.create({ data });
        break;
      case 'branches':
        item = await prisma.branch.create({ data });
        break;
      case 'siteoffices':
        item = await prisma.siteOffice.create({ data });
        break;
      case 'organizations':
        // Organizations don't need the organization field
        item = await prisma.organization.create({
          data: {
            name,
            description: description || null,
            textColor: textColor || '#1f2937',
            bgColor: bgColor || '#f3f4f6'
          }
        });
        break;
      case 'imprestheads':
        const insertResult = await prisma.$queryRaw`INSERT INTO "ImprestHead" (name, "createdAt") VALUES (${name}, NOW()) RETURNING id, name, "createdAt"`;
        item = insertResult[0];
        break;
      case 'grades': {
        const desig = designation || '';
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "GradeConfig" (id SERIAL PRIMARY KEY, designation TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, description TEXT, "createdAt" TIMESTAMP NOT NULL DEFAULT NOW())`;
        await prisma.$executeRaw`ALTER TABLE "GradeConfig" ADD COLUMN IF NOT EXISTS designation TEXT NOT NULL DEFAULT ''`;
        const gRes = await prisma.$queryRaw`INSERT INTO "GradeConfig" (designation, name, description, "createdAt") VALUES (${desig}, ${name}, ${description || null}, NOW()) RETURNING id, designation, name, description, "createdAt"`;
        item = gRes[0];
        break;
      }
      case 'designations': {
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "DesignationConfig" (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT, "createdAt" TIMESTAMP NOT NULL DEFAULT NOW())`;
        const dRes = await prisma.$queryRaw`INSERT INTO "DesignationConfig" (name, description, "createdAt") VALUES (${name}, ${description || null}, NOW()) RETURNING id, name, description, "createdAt"`;
        item = dRes[0];
        break;
      }
      case 'impresttypes': {
        const iHead = imprestHead || '';
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "ImprestTypeConfig" (id SERIAL PRIMARY KEY, "imprestHead" TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, description TEXT, "createdAt" TIMESTAMP NOT NULL DEFAULT NOW())`;
        const itRes = await prisma.$queryRaw`INSERT INTO "ImprestTypeConfig" ("imprestHead", name, description, "createdAt") VALUES (${iHead}, ${name}, ${description || null}, NOW()) RETURNING id, "imprestHead", name, description, "createdAt"`;
        item = itRes[0];
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

// PUT - Update item
export async function PUT(request) {
  try {
    const body = await request.json();
    const { type, id, name, organization, description, textColor, bgColor, department, grade, designation, imprestHead } = body;

    if (!type || !id || !name) {
      return NextResponse.json({ error: 'Type, id, and name are required' }, { status: 400 });
    }

    let item = null;
    const data = {
      name,
      organization: organization || null,
      description: description || null
    };

    switch (type) {
      case 'departments': {
        const oldItem = await prisma.department.findUnique({ where: { id } });
        item = await prisma.department.update({ where: { id }, data });
        if (oldItem && oldItem.name !== name) await cascadeRename('department', oldItem.name, name);
        break;
      }
      case 'branches': {
        const oldItem = await prisma.branch.findUnique({ where: { id } });
        item = await prisma.branch.update({ where: { id }, data });
        if (oldItem && oldItem.name !== name) await cascadeRename('branch', oldItem.name, name);
        break;
      }
      case 'siteoffices': {
        const oldItem = await prisma.siteOffice.findUnique({ where: { id } });
        item = await prisma.siteOffice.update({ where: { id }, data });
        if (oldItem && oldItem.name !== name) await cascadeRename('siteOffice', oldItem.name, name);
        break;
      }
      case 'organizations': {
        const oldItem = await prisma.organization.findUnique({ where: { id } });
        item = await prisma.organization.update({
          where: { id },
          data: { 
            name, 
            description: description || null,
            textColor: textColor || '#1f2937',
            bgColor: bgColor || '#f3f4f6'
          }
        });
        if (oldItem && oldItem.name !== name) await cascadeOrganizationRename(oldItem.name, name);
        break;
      }
      case 'imprestheads': {
        const oldItems = await prisma.$queryRaw`SELECT * FROM "ImprestHead" WHERE id = ${parseInt(id)}`;
        if (oldItems && oldItems.length > 0) {
          await prisma.$queryRaw`UPDATE "ImprestHead" SET name = ${name} WHERE id = ${parseInt(id)}`;
          item = { id: parseInt(id), name };
          if (oldItems[0].name !== name) await cascadeRename('imprestHead', oldItems[0].name, name);
        }
        break;
      }
      case 'grades': {
        const desig = designation || '';
        const oldGrades = await prisma.$queryRaw`SELECT * FROM "GradeConfig" WHERE id = ${parseInt(id)}`;
        if (oldGrades && oldGrades.length > 0) {
          await prisma.$queryRaw`UPDATE "GradeConfig" SET designation = ${desig}, name = ${name}, description = ${description || null} WHERE id = ${parseInt(id)}`;
          item = { id: parseInt(id), designation: desig, name, description };
          if (oldGrades[0].name !== name) await cascadeRename('grade', oldGrades[0].name, name);
        }
        break;
      }
      case 'designations': {
        const oldDesignations = await prisma.$queryRaw`SELECT * FROM "DesignationConfig" WHERE id = ${parseInt(id)}`;
        if (oldDesignations && oldDesignations.length > 0) {
          await prisma.$queryRaw`UPDATE "DesignationConfig" SET name = ${name}, description = ${description || null} WHERE id = ${parseInt(id)}`;
          item = { id: parseInt(id), name, description };
          // Cascade rename in Employee.designation field if name changed
          if (oldDesignations[0].name !== name) await cascadeRename('designation', oldDesignations[0].name, name);
        }
        break;
      }
      case 'impresttypes': {
        const iHead = imprestHead || '';
        const oldTypes = await prisma.$queryRaw`SELECT * FROM "ImprestTypeConfig" WHERE id = ${parseInt(id)}`;
        if (oldTypes && oldTypes.length > 0) {
          await prisma.$queryRaw`UPDATE "ImprestTypeConfig" SET "imprestHead" = ${iHead}, name = ${name}, description = ${description || null} WHERE id = ${parseInt(id)}`;
          item = { id: parseInt(id), imprestHead: iHead, name, description };
        }
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE - Delete item
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and id are required' }, { status: 400 });
    }

    switch (type) {
      case 'departments':
        await prisma.department.delete({ where: { id } });
        break;
      case 'branches':
        await prisma.branch.delete({ where: { id } });
        break;
      case 'siteoffices':
        await prisma.siteOffice.delete({ where: { id } });
        break;
      case 'organizations':
        await prisma.organization.delete({ where: { id } });
        break;
      case 'imprestheads':
        await prisma.$queryRaw`DELETE FROM "ImprestHead" WHERE id = ${parseInt(id)}`;
        break;
      case 'grades':
        await prisma.$queryRaw`DELETE FROM "GradeConfig" WHERE id = ${parseInt(id)}`;
        break;
      case 'designations':
        await prisma.$queryRaw`DELETE FROM "DesignationConfig" WHERE id = ${parseInt(id)}`;
        break;
      case 'impresttypes':
        await prisma.$queryRaw`DELETE FROM "ImprestTypeConfig" WHERE id = ${parseInt(id)}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}

// Helpers for cascading renames across comma-separated string fields
async function cascadeRename(field, oldName, newName) {
  if (oldName === newName) return;

  const employees = await prisma.employee.findMany({
    where: { [field]: { contains: oldName } }
  });

  for (const emp of employees) {
    if (!emp[field]) continue;
    const items = emp[field].split(',').map(s => s.trim());
    if (items.includes(oldName)) {
      const updatedItems = items.map(s => s === oldName ? newName : s);
      await prisma.employee.update({
        where: { id: emp.id },
        data: { [field]: updatedItems.join(', ') }
      });
    }
  }
}

async function cascadeOrganizationRename(oldName, newName) {
  if (oldName === newName) return;

  // 1. Employee (field is 'organisation')
  const employees = await prisma.employee.findMany({
    where: { organisation: { contains: oldName } }
  });
  for (const emp of employees) {
    if (!emp.organisation) continue;
    const items = emp.organisation.split(',').map(s => s.trim());
    if (items.includes(oldName)) {
      const updatedItems = items.map(s => s === oldName ? newName : s);
      await prisma.employee.update({
        where: { id: emp.id },
        data: { organisation: updatedItems.join(', ') }
      });
    }
  }

  // 2. Department
  const depts = await prisma.department.findMany({
    where: { organization: { contains: oldName } }
  });
  for (const d of depts) {
    if (!d.organization) continue;
    const items = d.organization.split(',').map(s => s.trim());
    if (items.includes(oldName)) {
      const updatedItems = items.map(s => s === oldName ? newName : s);
      await prisma.department.update({
        where: { id: d.id },
        data: { organization: updatedItems.join(', ') }
      });
    }
  }

  // 3. Branch
  const branches = await prisma.branch.findMany({
    where: { organization: { contains: oldName } }
  });
  for (const b of branches) {
    if (!b.organization) continue;
    const items = b.organization.split(',').map(s => s.trim());
    if (items.includes(oldName)) {
      const updatedItems = items.map(s => s === oldName ? newName : s);
      await prisma.branch.update({
        where: { id: b.id },
        data: { organization: updatedItems.join(', ') }
      });
    }
  }

  // 4. SiteOffice
  const sites = await prisma.siteOffice.findMany({
    where: { organization: { contains: oldName } }
  });
  for (const s of sites) {
    if (!s.organization) continue;
    const items = s.organization.split(',').map(s => s.trim());
    if (items.includes(oldName)) {
      const updatedItems = items.map(s => s === oldName ? newName : s);
      await prisma.siteOffice.update({
        where: { id: s.id },
        data: { organization: updatedItems.join(', ') }
      });
    }
  }
}

