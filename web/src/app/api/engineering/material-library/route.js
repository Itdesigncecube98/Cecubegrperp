export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Auto-seed default library hierarchy if empty
async function seedDefaultMaterialTreeIfNeeded() {
  try {
    const count = await prisma.materialLibraryGroup.count();
    if (count > 0) return;

    // Find or create 'Electrical Work Library'
    let electricalLib = await prisma.library.findFirst({
      where: { name: { contains: 'electrical', mode: 'insensitive' } }
    });

    if (!electricalLib) {
      electricalLib = await prisma.library.create({
        data: {
          name: 'Electrical Work Library',
          type: 'Material',
          desc: 'Electrical materials master library',
          status: 'Active'
        }
      });
    }

    const libId = electricalLib.id;

    // 1. Group: CeCube Electrical Materials
    const ceCubeGroup = await prisma.materialLibraryGroup.create({
      data: {
        libraryId: libId,
        name: 'CeCube Electrical Materials',
        description: 'Primary electrical installation and wiring materials'
      }
    });

    // Subgroup: Wires & Cables
    const wiresSub = await prisma.materialLibraryGroup.create({
      data: {
        libraryId: libId,
        parentId: ceCubeGroup.id,
        name: 'Wires & Cables',
        description: 'Building wires, single core and multi-strand copper cables'
      }
    });

    await prisma.materialLibraryItem.createMany({
      data: [
        {
          groupId: wiresSub.id,
          name: 'Copper Wire 1.5mm',
          unit: 'Coil',
          specification: 'ISI marked flame retardant (FR) multi-strand copper',
          description: 'Standard 1.5mm flame retardant copper wire for indoor point wiring.',
          usedIn: ['Chintels 7.9Acre Sec-109 SITC', 'Rehmat Reality 100KW']
        },
        {
          groupId: wiresSub.id,
          name: 'Copper Wire 2.5mm',
          unit: 'Coil',
          specification: 'ISI marked flame retardant (FR) heavy load',
          description: 'Power circuit wiring for 16A/20A sockets and AC points.',
          usedIn: ['Indiabulls SEL_ATH_CIT Sec 111 GGN']
        }
      ]
    });

    // Subgroup: Switches & Accessories
    const switchesSub = await prisma.materialLibraryGroup.create({
      data: {
        libraryId: libId,
        parentId: ceCubeGroup.id,
        name: 'Switches & Accessories',
        description: 'Modular plates, switches, sockets and gang boxes'
      }
    });

    await prisma.materialLibraryItem.createMany({
      data: [
        {
          groupId: switchesSub.id,
          name: '5A Modular Switch',
          unit: 'Nos',
          specification: 'Polycarbonate white finish 1-way',
          description: 'White 5A modular switch, polycarbonate front.',
          usedIn: ['Indiabulls SEL_ATH_CIT Sec 111 GGN']
        },
        {
          groupId: switchesSub.id,
          name: '15A Modular Socket with Shutter',
          unit: 'Nos',
          specification: '3-pin combined with safety shutter',
          description: 'Heavy appliance power socket.',
          usedIn: ['Chintels 7.9Acre Sec-109 SITC']
        }
      ]
    });

    // Direct Material in CeCube Electrical Materials
    await prisma.materialLibraryItem.create({
      data: {
        groupId: ceCubeGroup.id,
        name: '25mm Medium Duty PVC Conduit Pipe',
        unit: 'Mtr',
        specification: 'ISI marked 2mm wall thickness',
        description: 'Rigid PVC conduit for slab and wall concealed piping.',
        usedIn: ['Chintels 7.9Acre Sec-109 SITC']
      }
    });

    // 2. Group: DG Repair Work
    const dgGroup = await prisma.materialLibraryGroup.create({
      data: {
        libraryId: libId,
        name: 'DG Repair Work',
        description: 'Diesel Generator maintenance, consumables and spare parts'
      }
    });

    const lubricantsSub = await prisma.materialLibraryGroup.create({
      data: {
        libraryId: libId,
        parentId: dgGroup.id,
        name: 'Lubricants & Consumables',
        description: 'Oils, grease, and coolants for DG sets'
      }
    });

    await prisma.materialLibraryItem.create({
      data: {
        groupId: lubricantsSub.id,
        name: 'Engine Oil 15W40',
        unit: 'Litre',
        specification: 'API CI-4 heavy duty diesel engine oil',
        description: 'Heavy duty diesel engine oil for 125kVA to 500kVA DG sets.',
        usedIn: ['Reliance METL Sec 2A & 3 Jhajjar']
      }
    });

    // 3. Group: cable
    const cableGroup = await prisma.materialLibraryGroup.create({
      data: {
        libraryId: libId,
        name: 'cable',
        description: 'Underground armoured and HT transmission cables'
      }
    });

    const htSub = await prisma.materialLibraryGroup.create({
      data: {
        libraryId: libId,
        parentId: cableGroup.id,
        name: 'HT Transmission Cables',
        description: '11kV to 33kV grade armoured cables'
      }
    });

    await prisma.materialLibraryItem.create({
      data: {
        groupId: htSub.id,
        name: '11kv cable',
        unit: 'Mtr',
        specification: '11kV 3C x 300 sq.mm XLPE insulated aluminium armoured',
        description: 'HT incoming underground feeder cable.',
        usedIn: ['Reliance METL Sec 2A & 3 Jhajjar', 'Chintels 7.9Acre']
      }
    });

    console.log('Successfully auto-seeded Material Library hierarchical tree.');
  } catch (err) {
    console.error('Error in seedDefaultMaterialTreeIfNeeded:', err);
  }
}

export async function GET(req) {
  try {
    await seedDefaultMaterialTreeIfNeeded();

    const { searchParams } = new URL(req.url);
    const libraryId = searchParams.get('libraryId');
    const search = searchParams.get('search');
    const resourceType = searchParams.get('resourceType') || 'Material';

    const where = {
      parentId: null // Root groups only
    };

    if (libraryId) {
      where.libraryId = libraryId;
    }
    where.resourceType = resourceType;

    // Recursive include definition up to 5 levels deep
    const includeLevel = {
      materials: { orderBy: { createdAt: 'asc' } },
      subgroups: {
        include: {
          materials: { orderBy: { createdAt: 'asc' } },
          subgroups: {
            include: {
              materials: { orderBy: { createdAt: 'asc' } },
              subgroups: {
                include: {
                  materials: { orderBy: { createdAt: 'asc' } }
                },
                orderBy: { createdAt: 'asc' }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    };

    const groups = await prisma.materialLibraryGroup.findMany({
      where,
      include: includeLevel,
      orderBy: { createdAt: 'asc' }
    });

    const response = NextResponse.json(groups);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error) {
    console.error('Error fetching material library tree:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch material library' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { type } = body;

    // 1. Create Material (Leaf Item)
    if (type === 'material') {
      const { groupId, name, unit, specification, description, usedIn, resourceType = 'Material' } = body;
      if (!groupId) return NextResponse.json({ error: 'Group/Subgroup ID is required' }, { status: 400 });
      if (!name || !name.trim()) return NextResponse.json({ error: 'Material name is required' }, { status: 400 });

      const item = await prisma.materialLibraryItem.create({
        data: {
          groupId,
          resourceType,
          name: name.trim(),
          unit: unit ? unit.trim() : 'Nos',
          specification: specification ? specification.trim() : null,
          description: description ? description.trim() : null,
          usedIn: Array.isArray(usedIn) ? usedIn : []
        }
      });
      return NextResponse.json(item, { status: 201 });
    }

    // 2. Create Root Group or Subgroup (Folder)
    const { libraryId, parentId, name, description, resourceType = 'Material' } = body;
    if (!name || !name.trim()) return NextResponse.json({ error: 'Group/Subgroup name is required' }, { status: 400 });

    let finalLibId = libraryId;
    if (!finalLibId && parentId) {
      const parent = await prisma.materialLibraryGroup.findUnique({ where: { id: parentId } });
      if (parent) finalLibId = parent.libraryId;
    }

    const group = await prisma.materialLibraryGroup.create({
      data: {
        libraryId: finalLibId || null,
        parentId: parentId || null,
        resourceType,
        name: name.trim(),
        description: description ? description.trim() : null
      },
      include: {
        materials: true,
        subgroups: true
      }
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating material library node:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create item' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, type } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    if (type === 'material') {
      const { name, unit, specification, description, usedIn } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (unit !== undefined) updateData.unit = unit ? unit.trim() : 'Nos';
      if (specification !== undefined) updateData.specification = specification ? specification.trim() : null;
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (usedIn !== undefined && Array.isArray(usedIn)) updateData.usedIn = usedIn;

      const item = await prisma.materialLibraryItem.update({
        where: { id },
        data: updateData
      });
      return NextResponse.json(item);
    }

    // Update Group / Subgroup
    const { name, description } = body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;

    const group = await prisma.materialLibraryGroup.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating material library node:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    let id = null;
    let type = null;
    try {
      const body = await req.json();
      id = body?.id;
      type = body?.type;
    } catch (e) {}

    if (!id) {
      const { searchParams } = new URL(req.url);
      id = searchParams.get('id');
      type = searchParams.get('type');
    }

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    if (type === 'material') {
      await prisma.materialLibraryItem.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Material deleted successfully' });
    }

    // Delete group / subgroup (cascades all children)
    try {
      await prisma.materialLibraryGroup.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Group deleted successfully' });
    } catch (e) {
      // Fallback if was a material
      await prisma.materialLibraryItem.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Item deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting material library node:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete item' }, { status: 500 });
  }
}
