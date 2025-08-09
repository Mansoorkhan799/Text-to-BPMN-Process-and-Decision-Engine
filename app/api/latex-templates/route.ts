import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LatexTemplate from '@/models/LatexTemplate';

// GET: Fetch all LaTeX templates
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const templates = await LatexTemplate.find({}).sort({ category: 1, name: 1 });
    
    return NextResponse.json({ 
      success: true, 
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        content: template.content,
        isDefault: template.isDefault,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      }))
    });
  } catch (error) {
    console.error('Error fetching LaTeX templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST: Create a new template (for seeding initial templates)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, description, category, content, isDefault = false } = body;
    
    if (!name || !description || !category || !content) {
      return NextResponse.json({ error: 'name, description, category, and content are required' }, { status: 400 });
    }
    
    const template = new LatexTemplate({
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      content,
      isDefault,
    });

    await template.save();
    
    return NextResponse.json({ 
      success: true, 
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        content: template.content,
        isDefault: template.isDefault,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error creating LaTeX template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// DELETE: Clear all templates (for seeding)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    await LatexTemplate.deleteMany({});
    
    return NextResponse.json({ 
      success: true, 
      message: 'All templates cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing LaTeX templates:', error);
    return NextResponse.json({ error: 'Failed to clear templates' }, { status: 500 });
  }
} 