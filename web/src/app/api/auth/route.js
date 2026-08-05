import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    // Check if admin exists
    let admin = await prisma.admin.findUnique({ where: { email } });
    
    // If no admin exists in DB, create default for demo purposes
    if (!admin) {
      if (email === 'admin@cecube.com' && password === 'password123') {
        admin = await prisma.admin.create({
          data: { 
            name: 'Super Admin',
            email: 'admin@cecube.com', 
            department: 'Management',
            password: 'password123' 
          }
        });
      } else {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }
    
    if (admin.password === password) {
      return NextResponse.json({ success: true, email: admin.email, name: admin.name });
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
