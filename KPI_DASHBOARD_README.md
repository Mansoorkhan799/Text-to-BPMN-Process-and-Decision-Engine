# KPI Dashboard - Enhanced Hierarchical Drag & Drop

## Overview

The KPI Dashboard has been enhanced with a sophisticated hierarchical drag-and-drop system that allows users to create parent-child relationships between KPIs by simply dragging and dropping rows. This creates a visual hierarchy that makes it easy to organize and structure KPIs in a logical manner.

## Key Features

### 🎯 Hierarchical Organization
- **Parent-Child Relationships**: KPIs can be organized into hierarchical structures
- **Visual Indentation**: Child KPIs are visually indented to show their relationship level
- **Collapsible Rows**: Parent rows can be collapsed/expanded to show/hide children
- **Clear Visual Indicators**: Different visual cues for parent vs child rows

### 🖱️ Intuitive Drag & Drop
- **Smart Positioning**: Drag to different areas to create different relationships:
  - **Top 20%** of row = Move above (same level)
  - **Bottom 20%** of row = Move below (same level)
  - **Middle 60%** = Make child (with right-drag preference)
- **Visual Feedback**: Real-time feedback showing drop position
- **Prevents Circular References**: System prevents invalid parent-child relationships

### 🎨 Enhanced Visual Design
- **Hierarchy Icons**: Chevron arrows for expandable parent rows
- **Level Indicators**: Blue dots for child rows, borders for hierarchy levels
- **Drag Feedback**: Visual indicators during drag operations
- **Responsive Layout**: Works on all screen sizes

## How to Use

### Creating Hierarchy

1. **Drag a KPI row** to another KPI row
2. **Position the cursor** in different areas:
   - **Top area** (20%): Makes the dragged KPI appear above the target
   - **Bottom area** (20%): Makes the dragged KPI appear below the target  
   - **Middle area** (60%): Makes the dragged KPI a child of the target
   - **Right drag**: Automatically makes it a child (more intuitive)

### Managing Hierarchy

- **Expand/Collapse**: Click the chevron arrow (▶️/▼) to show/hide child KPIs
- **Promote**: Use the ⬆️ button to move a child KPI up one level
- **Demote**: Use the ⬇️ button to make a KPI a child of the previous KPI
- **Delete**: Remove KPIs with the trash icon (🗑️)

### Visual Hierarchy Indicators

- **Parent Rows**: 
  - Chevron arrow (▶️ when collapsed, ▼ when expanded)
  - No left border
  - Level 0 indentation
  
- **Child Rows**:
  - Blue dot indicator (●)
  - Left blue border
  - Indented based on hierarchy level (24px per level)

## Technical Implementation

### State Management
```typescript
interface KPI {
  id: string;
  parentId?: string | null;  // References parent KPI
  level: number;              // Hierarchy depth (0 = top level)
  order: number;              // Position within level
  // ... other fields
}
```

### Drag & Drop Logic
- **Position Detection**: Calculates drop position based on mouse coordinates
- **Hierarchy Validation**: Prevents circular references
- **Order Management**: Maintains proper ordering within each level
- **Level Updates**: Automatically updates hierarchy levels after changes

### Performance Features
- **Efficient Rendering**: Only renders visible rows (collapsed state)
- **Optimized Updates**: Minimal re-renders during drag operations
- **Smooth Animations**: CSS transitions for better user experience

## Sample Data Structure

The dashboard comes with sample data demonstrating the hierarchy:

```
Effectiveness KPI: Number of Incidents Caused by Inadequate Capacity
├── Efficiency KPI: Response Time for Capacity Issues
└── Quality KPI: Capacity Planning Accuracy

Efficiency KPI: Total Expenses for Unplanned Capacity
└── Financial KPI: Cost per Capacity Unit

Effectiveness KPI: Percent of IT Costs for Unplanned Capacity Expenses

Productivity KPI: System Uptime Performance
└── Quality KPI: Response Time for System Issues
```

## Browser Compatibility

- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer (not supported)

## Accessibility Features

- **Keyboard Navigation**: All functions accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **High Contrast**: Clear visual indicators for all states
- **Focus Management**: Proper focus handling during drag operations

## Future Enhancements

- **Bulk Operations**: Select multiple KPIs for batch hierarchy changes
- **Export Hierarchy**: Export KPI structure as JSON/CSV
- **Template System**: Pre-defined hierarchy templates
- **Version Control**: Track changes to hierarchy over time
- **Collaboration**: Real-time collaborative editing

## Troubleshooting

### Common Issues

1. **Drag not working**: Ensure you're clicking and dragging on the row itself
2. **Can't make child**: Try dragging more to the right or to the middle area
3. **Circular reference error**: You cannot make a parent a child of its own descendant
4. **Visual glitches**: Refresh the page if drag operations become unresponsive

### Performance Tips

- **Large datasets**: Consider collapsing parent rows to improve performance
- **Frequent updates**: Use the promote/demote buttons for quick hierarchy changes
- **Search/Filter**: Use the search and filter functions to focus on specific KPIs

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

---

**Note**: This enhanced KPI Dashboard provides a powerful and intuitive way to organize and manage KPIs in hierarchical structures, making it easier to understand relationships and dependencies between different performance indicators.
