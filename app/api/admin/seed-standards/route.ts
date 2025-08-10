import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Standard from '@/models/Standard';

const standards = [
  {
    name: 'ISO 20000',
    code: 'ISO20000',
    description: 'Information technology - Service management',
    category: 'IT Service Management',
    isActive: true
  },
  {
    name: 'ISO 27001',
    code: 'ISO27001',
    description: 'Information security management systems',
    category: 'Information Security',
    isActive: true
  },
  {
    name: 'CoBIT 2019',
    code: 'COBIT2019',
    description: 'Control Objectives for Information and Related Technologies',
    category: 'IT Governance',
    isActive: true
  },
  {
    name: 'COSO',
    code: 'COSO',
    description: 'Committee of Sponsoring Organizations of the Treadway Commission',
    category: 'Internal Control',
    isActive: true
  },
  {
    name: 'ITIL 4',
    code: 'ITIL4',
    description: 'Information Technology Infrastructure Library',
    category: 'IT Service Management',
    isActive: true
  },
  {
    name: 'ISO 9001',
    code: 'ISO9001',
    description: 'Quality management systems',
    category: 'Quality Management',
    isActive: true
  },
  {
    name: 'ISO 14001',
    code: 'ISO14001',
    description: 'Environmental management systems',
    category: 'Environmental Management',
    isActive: true
  },
  {
    name: 'ISO 45001',
    code: 'ISO45001',
    description: 'Occupational health and safety management systems',
    category: 'Health & Safety',
    isActive: true
  },
  {
    name: 'TOGAF 9.2',
    code: 'TOGAF92',
    description: 'The Open Group Architecture Framework',
    category: 'Enterprise Architecture',
    isActive: true
  },
  {
    name: 'PMBOK 7',
    code: 'PMBOK7',
    description: 'Project Management Body of Knowledge',
    category: 'Project Management',
    isActive: true
  },
  {
    name: 'Six Sigma',
    code: 'SIXSIGMA',
    description: 'Data-driven methodology for process improvement',
    category: 'Process Improvement',
    isActive: true
  },
  {
    name: 'Lean Management',
    code: 'LEAN',
    description: 'Methodology focused on minimizing waste',
    category: 'Process Improvement',
    isActive: true
  }
];

export async function POST() {
  try {
    await connectDB();
    
    // Clear existing standards
    await Standard.deleteMany({});
    console.log('Cleared existing standards');

    // Insert new standards
    const result = await Standard.insertMany(standards);
    console.log(`Inserted ${result.length} standards`);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${result.length} standards`,
      standards: result 
    });
  } catch (error) {
    console.error('Error seeding standards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed standards' },
      { status: 500 }
    );
  }
}
