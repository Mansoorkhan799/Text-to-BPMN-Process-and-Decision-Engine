'use client';

import React, { useState, useEffect } from 'react';
import { KPI } from '../types';
import { HiPlus, HiPencil, HiTrash, HiEye, HiEyeOff, HiCheck, HiX, HiChevronDown, HiChevronRight } from 'react-icons/hi';

const KPIDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isAddingKPI, setIsAddingKPI] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [editingCell, setEditingCell] = useState<{kpiId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Drag and drop hierarchy state
  const [draggedKPI, setDraggedKPI] = useState<KPI | null>(null);
  const [dragOverKPI, setDragOverKPI] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{kpiId: string, position: 'before' | 'after' | 'child'} | null>(null);
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  
  // Form state for Add/Edit modal
  const [formData, setFormData] = useState<Partial<KPI>>({
    typeOfKPI: 'Effectiveness KPI',
    kpi: '',
    formula: '',
    kpiDirection: 'down',
    targetValue: '',
    frequency: 'Monthly',
    receiver: '',
    source: '',
    active: false,
    mode: 'Manual',
    tag: '',
    category: 'IT Operations'
  });

  // Sample data based on the image with hierarchy
  useEffect(() => {
    const sampleKPIs: KPI[] = [
      {
        id: '1',
        typeOfKPI: 'Effectiveness KPI',
        kpi: 'Number of Incidents Caused by Inadequate Capacity',
        formula: 'Number of Incidents Caused by Inadequate Capacity',
        kpiDirection: 'down',
        targetValue: '<5',
        frequency: 'Monthly',
        receiver: 'Capacity Manager',
        source: 'ITSM Tool',
        active: false,
        mode: 'Manual',
        tag: 'Capacity',
        category: 'IT Operations',
        parentId: null,
        level: 0,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '1.1',
        typeOfKPI: 'Efficiency KPI',
        kpi: 'Response Time for Capacity Issues',
        formula: 'Average time to resolve capacity incidents',
        kpiDirection: 'down',
        targetValue: '<2 hours',
        frequency: 'Daily',
        receiver: 'Capacity Manager',
        source: 'ITSM Tool',
        active: true,
        mode: 'Automatic',
        tag: 'Capacity',
        category: 'IT Operations',
        parentId: '1',
        level: 1,
        order: 1.1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '1.2',
        typeOfKPI: 'Quality KPI',
        kpi: 'Capacity Planning Accuracy',
        formula: 'Planned vs Actual capacity usage',
        kpiDirection: 'up',
        targetValue: '>90%',
        frequency: 'Monthly',
        receiver: 'Capacity Manager',
        source: 'Capacity Planning Tool',
        active: true,
        mode: 'Semi-Automatic',
        tag: 'Capacity',
        category: 'IT Operations',
        parentId: '1',
        level: 1,
        order: 1.2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        typeOfKPI: 'Efficiency KPI',
        kpi: 'Total Expenses for Unplanned Capacity',
        formula: 'Total Expenses for Unplanned Capacity',
        kpiDirection: 'down',
        targetValue: 'As Is',
        frequency: 'Monthly',
        receiver: 'Capacity Manager',
        source: 'Expenses Report',
        active: false,
        mode: 'Manual',
        tag: 'Cost',
        category: 'Financial',
        parentId: null,
        level: 0,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2.1',
        typeOfKPI: 'Financial KPI',
        kpi: 'Cost per Capacity Unit',
        formula: 'Total cost / Total capacity units',
        kpiDirection: 'down',
        targetValue: '<$100/unit',
        frequency: 'Monthly',
        receiver: 'Financial Manager',
        source: 'Financial System',
        active: true,
        mode: 'Automatic',
        tag: 'Cost',
        category: 'Financial',
        parentId: '2',
        level: 1,
        order: 2.1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    setKpis(sampleKPIs);
  }, []);

  const filteredKPIs = kpis.filter(kpi => {
      const matchesSearch = kpi.kpi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           kpi.typeOfKPI.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           kpi.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || kpi.category === filterCategory;
      const matchesType = filterType === 'all' || kpi.typeOfKPI === filterType;
      
      return matchesSearch && matchesCategory && matchesType;
    });

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'neutral':
        return '→';
      default:
        return '→';
    }
  };

  const getStatusColor = (active: boolean) => {
    return active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Automatic':
        return 'bg-blue-100 text-blue-800';
      case 'Semi-Automatic':
        return 'bg-yellow-100 text-yellow-800';
      case 'Manual':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle cell editing
  const handleCellClick = (kpiId: string, field: string, currentValue: string) => {
    setEditingCell({ kpiId, field });
    setEditValue(currentValue);
  };

  const handleCellSave = () => {
    if (editingCell) {
      setKpis(kpis.map(kpi => {
        if (kpi.id === editingCell.kpiId) {
          let processedValue: any = editValue;
          
          // Handle boolean fields
          if (editingCell.field === 'active') {
            processedValue = editValue === 'true';
          }
          
          return {
            ...kpi,
            [editingCell.field]: processedValue,
            updatedAt: new Date()
          };
        }
        return kpi;
      }));
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle form operations
  const handleAddKPI = () => {
    setIsAddingKPI(true);
    setFormData({
      typeOfKPI: 'Effectiveness KPI',
      kpi: '',
      formula: '',
      kpiDirection: 'down',
      targetValue: '',
      frequency: 'Monthly',
      receiver: '',
      source: '',
      active: false,
      mode: 'Manual',
      tag: '',
      category: 'IT Operations'
    });
  };

  const handleEditKPI = (kpi: KPI) => {
    setEditingKPI(kpi);
    setFormData({
      typeOfKPI: kpi.typeOfKPI,
      kpi: kpi.kpi,
      formula: kpi.formula,
      kpiDirection: kpi.kpiDirection,
      targetValue: kpi.targetValue,
      frequency: kpi.frequency,
      receiver: kpi.receiver,
      source: kpi.source,
      active: kpi.active,
      mode: kpi.mode,
      tag: kpi.tag,
      category: kpi.category
    });
  };

  const handleFormSubmit = () => {
    if (!formData.kpi || !formData.formula || !formData.receiver || !formData.source || !formData.tag || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    if (isAddingKPI) {
      // Add new KPI
      const newKPI: KPI = {
        id: Date.now().toString(),
        ...formData as Omit<KPI, 'id' | 'createdAt' | 'updatedAt'>,
        parentId: null,
        level: 0,
        order: kpis.length + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setKpis([...kpis, newKPI]);
      setIsAddingKPI(false);
    } else if (editingKPI) {
      // Update existing KPI
      setKpis(kpis.map(kpi => 
        kpi.id === editingKPI.id 
          ? { ...kpi, ...formData, updatedAt: new Date() }
          : kpi
      ));
      setEditingKPI(null);
    }
    
    setFormData({
      typeOfKPI: 'Effectiveness KPI',
      kpi: '',
      formula: '',
      kpiDirection: 'down',
      targetValue: '',
      frequency: 'Monthly',
      receiver: '',
      source: '',
      active: false,
      mode: 'Manual',
      tag: '',
      category: 'IT Operations'
    });
  };

  const handleFormCancel = () => {
    setIsAddingKPI(false);
    setEditingKPI(null);
    setFormData({
      typeOfKPI: 'Effectiveness KPI',
      kpi: '',
      formula: '',
      kpiDirection: 'down',
      targetValue: '',
      frequency: 'Monthly',
      receiver: '',
      source: '',
      active: false,
      mode: 'Manual',
      tag: '',
      category: 'IT Operations'
    });
  };

  // Enhanced drag and drop hierarchy handlers
  const handleDragStart = (e: React.DragEvent, kpi: KPI) => {
    setDraggedKPI(kpi);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', kpi.id);
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
      e.currentTarget.style.transform = 'rotate(2deg)';
    }
  };

  const handleDragOver = (e: React.DragEvent, targetKPI: KPI) => {
    e.preventDefault();
    if (!draggedKPI || draggedKPI.id === targetKPI.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    const height = rect.height;
    const width = rect.width;
    
    // Determine drop position based on vertical and horizontal position
    let position: 'before' | 'after' | 'child';
    
    // More intuitive positioning:
    // - Top 20% = above (same level)
    // - Bottom 20% = below (same level)  
    // - Middle 60% = child (with right drag preference)
    if (y < height * 0.2) {
      position = 'before'; // Drop above the target
    } else if (y > height * 0.8) {
      position = 'after'; // Drop below the target
    } else {
      // For middle area, check if dragging right to make it a child
      if (x > width * 0.7) {
        position = 'child'; // Dragging right = make child
      } else {
        position = 'child'; // Default to child for middle area
      }
    }
    
    setDragTarget({ kpiId: targetKPI.id, position });
    setDragOverKPI(targetKPI.id);
  };

  const handleDrop = (e: React.DragEvent, targetKPI: KPI) => {
    e.preventDefault();
    if (!draggedKPI || draggedKPI.id === targetKPI.id || !dragTarget) return;

    let newKpis = [...kpis];
    const draggedIndex = newKpis.findIndex(k => k.id === draggedKPI.id);
    const targetIndex = newKpis.findIndex(k => k.id === targetKPI.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const draggedItem = { ...newKpis[draggedIndex] };
    const targetItem = { ...newKpis[targetIndex] };

    // Prevent circular references
    if (dragTarget.position === 'child' && isDescendant(draggedItem.id, targetItem.id, newKpis)) {
      alert('Cannot make a parent a child of its own descendant!');
      return;
    }

    if (dragTarget.position === 'child') {
      // Make dragged item a child of target
      console.log(`Making ${draggedItem.kpi} a child of ${targetItem.kpi}`);
      draggedItem.parentId = targetItem.id;
      draggedItem.level = targetItem.level + 1;
      // Update order to be after target
      draggedItem.order = targetItem.order + 0.5;
      
      // Also update any existing children of the dragged item to maintain hierarchy
      newKpis.forEach(kpi => {
        if (kpi.parentId === draggedItem.id) {
          kpi.parentId = targetItem.id;
          kpi.level = targetItem.level + 2;
        }
      });
    } else if (dragTarget.position === 'before') {
      // Move above target at same level
      draggedItem.parentId = targetItem.parentId;
      draggedItem.level = targetItem.level;
      draggedItem.order = targetItem.order - 0.5;
    } else if (dragTarget.position === 'after') {
      // Move below target at same level
      draggedItem.parentId = targetItem.parentId;
      draggedItem.level = targetItem.level;
      draggedItem.order = targetItem.order + 0.5;
    }

    // Remove dragged item from current position
    newKpis.splice(draggedIndex, 1);
    
    // Insert at new position
    newKpis.splice(targetIndex, 0, draggedItem);
    
    // Sort by order and update levels
    newKpis.sort((a, b) => a.order - b.order);
    newKpis = updateHierarchyLevels(newKpis);
    
    setKpis(newKpis);
    setDraggedKPI(null);
    setDragOverKPI(null);
    setDragTarget(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '';
      e.currentTarget.style.transform = '';
    }
    
    setDraggedKPI(null);
    setDragOverKPI(null);
    setDragTarget(null);
  };

  // Helper function to check if an item is a descendant of another
  const isDescendant = (itemId: string, potentialAncestorId: string, kpis: KPI[]): boolean => {
    const item = kpis.find(k => k.id === itemId);
    if (!item || !item.parentId) return false;
    
    if (item.parentId === potentialAncestorId) return true;
    
    const parent = kpis.find(k => k.id === item.parentId);
    if (!parent) return false;
    
    return isDescendant(parent.id, potentialAncestorId, kpis);
  };

  // Helper function to update hierarchy levels
  const updateHierarchyLevels = (kpis: KPI[]): KPI[] => {
    return kpis.map(kpi => {
      if (kpi.parentId) {
        const parent = kpis.find(p => p.id === kpi.parentId);
        return { ...kpi, level: parent ? parent.level + 1 : 0 };
      }
      return { ...kpi, level: 0 };
    });
  };

  // Get sorted KPIs with proper hierarchy
  const getHierarchicalKPIs = (): KPI[] => {
    return kpis
      .sort((a, b) => a.order - b.order)
      .filter(kpi => kpi.parentId === null); // Only return top-level KPIs
  };

  // Get children of a specific KPI
  const getChildren = (parentId: string): KPI[] => {
    return kpis
      .filter(kpi => kpi.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  // Toggle row collapse/expand
  const toggleRowCollapse = (kpiId: string) => {
    const newCollapsed = new Set(collapsedRows);
    if (newCollapsed.has(kpiId)) {
      newCollapsed.delete(kpiId);
    } else {
      newCollapsed.add(kpiId);
    }
    setCollapsedRows(newCollapsed);
  };

  // Helper functions for hierarchy management
  const promoteKPI = (kpiId: string) => {
    const kpi = kpis.find(k => k.id === kpiId);
    if (!kpi || !kpi.parentId) return;

    const parent = kpis.find(k => k.id === kpi.parentId);
    if (!parent) return;

    setKpis(kpis.map(k => {
      if (k.id === kpiId) {
        return {
          ...k,
          parentId: parent.parentId,
          level: parent.level,
          order: parent.order + 0.5
        };
      }
      return k;
    }));
  };

  const demoteKPI = (kpiId: string, targetParentId: string) => {
    const kpi = kpis.find(k => k.id === kpiId);
    const targetParent = kpis.find(k => k.id === targetParentId);
    if (!kpi || !targetParent) return;

    setKpis(kpis.map(k => {
      if (k.id === kpiId) {
        return {
          ...k,
          parentId: targetParentId,
          level: targetParent.level + 1,
          order: targetParent.order + 0.5
        };
      }
      return k;
    }));
  };

  // Render KPI row with enhanced drag and drop support and hierarchy visualization
  const renderKPIRow = (kpi: KPI, isChild: boolean = false): JSX.Element => {
    const children = getChildren(kpi.id);
    const indentLevel = kpi.level * 24; // 24px per level for better visibility
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedRows.has(kpi.id);

    return (
      <>
        <tr 
          key={kpi.id} 
          className={`hover:bg-gray-50 hover:shadow-lg transition-all duration-200 ${
            isChild ? 'bg-gray-25' : ''
          } ${
            draggedKPI?.id === kpi.id ? 'opacity-50' : ''
          } ${
            dragOverKPI === kpi.id ? 'bg-blue-100 ring-2 ring-blue-300' : ''
          } ${
            kpi.level > 0 ? 'border-l-4 border-l-blue-200' : ''
          }`}
          style={{
            borderRadius: kpi.level === 0 ? '12px' : '8px',
            marginBottom: kpi.level === 0 ? '16px' : '8px',
            boxShadow: kpi.level === 0 ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)'
          }}
          draggable
          onDragStart={(e) => handleDragStart(e, kpi)}
          onDragOver={(e) => handleDragOver(e, kpi)}
          onDrop={(e) => handleDrop(e, kpi)}
          onDragEnd={handleDragEnd}
        >
          {/* Type of KPI */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            <div className="flex items-center">
              <div style={{ marginLeft: `${indentLevel}px` }} className="flex items-center">
                {hasChildren && (
                  <button
                    onClick={() => toggleRowCollapse(kpi.id)}
                    className="mr-2 text-blue-600 hover:text-blue-800 transition-colors p-1"
                    title={isCollapsed ? "Expand" : "Collapse"}
                  >
                    {isCollapsed ? <HiChevronRight className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
                  </button>
                )}
                {!hasChildren && kpi.level > 0 && (
                  <div className="mr-2 w-4 h-4 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              </div>
                )}
                {renderSelectableCell(
                  kpi, 
                  'typeOfKPI', 
                  kpi.typeOfKPI, 
                  ['Effectiveness KPI', 'Efficiency KPI', 'Productivity KPI', 'Quality KPI', 'Timeliness KPI', 'Financial KPI'],
                  editingCell?.kpiId === kpi.id && editingCell?.field === 'typeOfKPI'
                )}
              </div>
            </div>
          </td>
          
          {/* KPI Name */}
          <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 max-w-xs">
            {renderEditableCell(kpi, 'kpi', kpi.kpi, editingCell?.kpiId === kpi.id && editingCell?.field === 'kpi')}
          </td>
          
          {/* Formula */}
          <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 max-w-xs">
            {renderEditableCell(kpi, 'formula', kpi.formula, editingCell?.kpiId === kpi.id && editingCell?.field === 'formula')}
          </td>
          
          {/* KPI Direction */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {editingCell?.kpiId === kpi.id && editingCell?.field === 'kpiDirection' ? (
              renderSelectableCell(
                kpi, 
                'kpiDirection', 
                kpi.kpiDirection, 
                ['up', 'down', 'neutral'],
                true
              )
            ) : (
              <div
                className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center"
                onClick={() => handleCellClick(kpi.id, 'kpiDirection', kpi.kpiDirection)}
                title="Click to edit"
              >
                <span className="text-lg mr-2">{getDirectionIcon(kpi.kpiDirection)}</span>
                <span className="text-xs text-gray-500 capitalize">{kpi.kpiDirection}</span>
                </div>
              )}
          </td>
          
          {/* Target Value */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'targetValue', kpi.targetValue, editingCell?.kpiId === kpi.id && editingCell?.field === 'targetValue')}
          </td>
          
          {/* Frequency */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderSelectableCell(
              kpi, 
              'frequency', 
              kpi.frequency, 
              ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Real-time'],
              editingCell?.kpiId === kpi.id && editingCell?.field === 'frequency'
            )}
          </td>
          
          {/* Receiver */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'receiver', kpi.receiver, editingCell?.kpiId === kpi.id && editingCell?.field === 'receiver')}
          </td>
          
          {/* Source */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'source', kpi.source, editingCell?.kpiId === kpi.id && editingCell?.field === 'source')}
          </td>
          
          {/* Active Status */}
          <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-gray-200">
            {editingCell?.kpiId === kpi.id && editingCell?.field === 'active' ? (
              <div className="flex items-center space-x-1">
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCellSave();
                    if (e.key === 'Escape') handleCellCancel();
                  }}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                <button
                  onClick={handleCellSave}
                  className="p-1 text-green-600 hover:text-green-800"
                  title="Save"
                >
                  <HiCheck className="w-3 h-3" />
                </button>
                <button
                  onClick={handleCellCancel}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Cancel"
                >
                  <HiX className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                onClick={() => handleCellClick(kpi.id, 'active', kpi.active.toString())}
                title="Click to edit"
              >
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(kpi.active)}`}>
                  {kpi.active ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </td>
          
          {/* Mode */}
          <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-gray-200">
            {renderSelectableCell(
              kpi, 
              'mode', 
              kpi.mode, 
              ['Manual', 'Automatic', 'Semi-Automatic'],
              editingCell?.kpiId === kpi.id && editingCell?.field === 'mode'
            )}
          </td>
          
          {/* Tag */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'tag', kpi.tag, editingCell?.kpiId === kpi.id && editingCell?.field === 'tag')}
          </td>
          
          {/* Category */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'category', kpi.category, editingCell?.kpiId === kpi.id && editingCell?.field === 'category')}
          </td>
          
          {/* Actions */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditKPI(kpi)}
                className="text-blue-600 hover:text-blue-900"
                title="Edit KPI"
              >
                <HiPencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setKpis(kpis.map(k => 
                    k.id === kpi.id ? { ...k, active: !k.active } : k
                  ));
                }}
                className="text-gray-600 hover:text-gray-900"
                title={kpi.active ? "Deactivate KPI" : "Activate KPI"}
              >
                {kpi.active ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
              </button>
              {/* Hierarchy Controls */}
              {kpi.parentId && (
                <button
                  onClick={() => promoteKPI(kpi.id)}
                  className="text-green-600 hover:text-green-900"
                  title="Promote (move up one level)"
                >
                  ⬆️
                </button>
              )}
              {kpi.level === 0 && (
                <button
                  onClick={() => {
                    // Find a suitable parent (first KPI above this one)
                    const currentIndex = kpis.findIndex(k => k.id === kpi.id);
                    const potentialParent = kpis.slice(0, currentIndex).reverse().find(k => k.level === 0);
                    if (potentialParent) {
                      demoteKPI(kpi.id, potentialParent.id);
                    }
                  }}
                  className="text-purple-600 hover:text-purple-900"
                  title="Demote (make child of previous KPI)"
                >
                  ⬇️
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this KPI?')) {
                    setKpis(kpis.filter(k => k.id !== kpi.id));
                  }
                }}
                className="text-red-600 hover:text-red-900"
                title="Delete KPI"
              >
                <HiTrash className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
        
        {/* Render children recursively if not collapsed */}
        {!isCollapsed && children.map((child, childIndex) => (
          <React.Fragment key={child.id}>
            {/* Add spacing before child records */}
            <tr>
              <td colSpan={13} className="h-2"></td>
            </tr>
            {renderKPIRow(child, true)}
            {/* Add spacing after child records */}
            {childIndex < children.length - 1 && (
              <tr>
                <td colSpan={13} className="h-2"></td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  // Render editable cell
  const renderEditableCell = (kpi: KPI, field: string, value: string, isEditing: boolean) => {
    if (isEditing && editingCell?.kpiId === kpi.id && editingCell?.field === field) {
      return (
        <div className="flex items-center space-x-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
          />
          <button
            onClick={handleCellSave}
            className="p-1 text-green-600 hover:text-green-800"
            title="Save"
          >
            <HiCheck className="w-3 h-3" />
          </button>
          <button
            onClick={handleCellCancel}
            className="p-1 text-red-600 hover:text-red-800"
            title="Cancel"
          >
            <HiX className="w-3 h-3" />
          </button>
            </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
        onClick={() => handleCellClick(kpi.id, field, value)}
        title="Click to edit"
      >
        {value}
            </div>
    );
  };

  // Render selectable cell for dropdown fields
  const renderSelectableCell = (kpi: KPI, field: string, value: string, options: string[], isEditing: boolean) => {
    if (isEditing && editingCell?.kpiId === kpi.id && editingCell?.field === field) {
      return (
        <div className="flex items-center space-x-1">
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
          >
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            onClick={handleCellSave}
            className="p-1 text-green-600 hover:text-green-800"
            title="Save"
          >
            <HiCheck className="w-3 h-3" />
          </button>
          <button
            onClick={handleCellCancel}
            className="p-1 text-red-600 hover:text-red-800"
            title="Cancel"
          >
            <HiX className="w-3 h-3" />
          </button>
            </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
        onClick={() => handleCellClick(kpi.id, field, value)}
        title="Click to edit"
      >
        {value}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
            <h2 className="text-xl font-semibold text-gray-900">KPI Dashboard</h2>
            <p className="text-sm text-gray-600">Manage and monitor your Key Performance Indicators</p>
            <p className="text-xs text-blue-600 mt-1">💡 Click on any cell to edit values directly | 🖱️ Drag rows to create hierarchy: Top=Above, Middle=Child, Bottom=Below | ➡️ Drag right to make child</p>
            </div>
            <button
              onClick={handleAddKPI}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <HiPlus className="w-4 h-4 mr-2" />
              Add KPI
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search KPIs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="IT Operations">IT Operations</option>
              <option value="Financial">Financial</option>
              <option value="Customer Service">Customer Service</option>
              <option value="Operations">Operations</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="Effectiveness KPI">Effectiveness KPI</option>
              <option value="Efficiency KPI">Efficiency KPI</option>
              <option value="Productivity KPI">Productivity KPI</option>
              <option value="Quality KPI">Quality KPI</option>
              <option value="Timeliness KPI">Timeliness KPI</option>
              <option value="Financial KPI">Financial KPI</option>
            </select>
        </div>
      </div>

      {/* Drag Target Indicator */}
      {dragTarget && (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-2 text-sm text-blue-700">
            <span className="font-medium">Drop Position:</span>
            {dragTarget.position === 'before' && <span>⬆️ Drop above target (same level)</span>}
            {dragTarget.position === 'after' && <span>⬇️ Drop below target (same level)</span>}
            {dragTarget.position === 'child' && <span>➡️ Drop as child of target</span>}
                </div>
          </div>
      )}

      {/* KPI Grid Table */}
      <div className="overflow-x-auto bg-gray-50 p-4 rounded-lg">
        <table className="min-w-full">
          <thead className="bg-blue-50 rounded-t-lg shadow-sm border-b-2 border-blue-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Type of KPI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                KPI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Formula
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                KPI Direction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Target Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Receiver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Active
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Tag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {/* Add top spacing for the first record */}
            <tr>
              <td colSpan={13} className="h-6"></td>
            </tr>
            {getHierarchicalKPIs().map((kpi, index) => (
              <React.Fragment key={kpi.id}>
                {renderKPIRow(kpi)}
                {/* Add spacing between parent records */}
                {kpi.level === 0 && index < getHierarchicalKPIs().length - 1 && (
                  <tr>
                    <td colSpan={13} className="h-6"></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
                    </div>

        {/* Empty State */}
        {filteredKPIs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No KPIs found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm || filterCategory !== 'all' || filterType !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Get started by creating your first KPI.'}
            </p>
            {!searchTerm && filterCategory === 'all' && filterType === 'all' && (
              <button
                onClick={handleAddKPI}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <HiPlus className="w-4 h-4 mr-2" />
                Add KPI
              </button>
            )}
          </div>
        )}

      {/* Comprehensive Add/Edit KPI Modal */}
      {(isAddingKPI || editingKPI) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isAddingKPI ? 'Add New KPI' : 'Edit KPI'}
              </h3>
              <p className="text-sm text-gray-600">
                {isAddingKPI 
                  ? 'Create a new Key Performance Indicator with all required details' 
                  : 'Update the existing KPI details'}
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Type of KPI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of KPI <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.typeOfKPI}
                  onChange={(e) => setFormData({...formData, typeOfKPI: e.target.value as 'Effectiveness KPI' | 'Efficiency KPI' | 'Productivity KPI' | 'Quality KPI' | 'Timeliness KPI' | 'Financial KPI'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Effectiveness KPI">Effectiveness KPI</option>
                  <option value="Efficiency KPI">Efficiency KPI</option>
                  <option value="Productivity KPI">Productivity KPI</option>
                  <option value="Quality KPI">Quality KPI</option>
                  <option value="Timeliness KPI">Timeliness KPI</option>
                  <option value="Financial KPI">Financial KPI</option>
                </select>
              </div>

              {/* KPI Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KPI Direction <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.kpiDirection}
                  onChange={(e) => setFormData({...formData, kpiDirection: e.target.value as 'up' | 'down' | 'neutral'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="up">Up ↗️</option>
                  <option value="down">Down ↘️</option>
                  <option value="neutral">Neutral →</option>
                </select>
              </div>

              {/* KPI Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KPI Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.kpi}
                  onChange={(e) => setFormData({...formData, kpi: e.target.value})}
                  placeholder="Enter KPI name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Formula */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formula <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.formula}
                  onChange={(e) => setFormData({...formData, formula: e.target.value})}
                  placeholder="Enter KPI formula"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Target Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({...formData, targetValue: e.target.value})}
                  placeholder="e.g., <5, 10%, As Is"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: e.target.value as 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Real-time'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Real-time">Real-time</option>
                </select>
              </div>

              {/* Receiver */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receiver <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.receiver}
                  onChange={(e) => setFormData({...formData, receiver: e.target.value})}
                  placeholder="e.g., Capacity Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                  placeholder="e.g., ITSM Tool, Expenses Report"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active Status
                </label>
                <select
                  value={formData.active?.toString() || 'false'}
                  onChange={(e) => setFormData({...formData, active: e.target.value === 'true'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode
                </label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({...formData, mode: e.target.value as 'Manual' | 'Automatic' | 'Semi-Automatic'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                  <option value="Semi-Automatic">Semi-Automatic</option>
                </select>
              </div>

              {/* Tag */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tag <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({...formData, tag: e.target.value})}
                  placeholder="e.g., Capacity, Cost"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="IT Operations">IT Operations</option>
                  <option value="Financial">Financial</option>
                  <option value="Customer Service">Customer Service</option>
                  <option value="Operations">Operations</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Research & Development">Research & Development</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleFormCancel}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFormSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {isAddingKPI ? 'Create KPI' : 'Update KPI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIDashboard;
