'use client';

import React, { useState } from 'react';
import AdminBpmnFiles from './AdminBpmnFiles';
import AdminLatexFiles from './AdminLatexFiles';
import { ROLES } from '../utils/permissions';

interface AdminFileManagementProps {
  userRole?: string;
}

const AdminFileManagement: React.FC<AdminFileManagementProps> = ({ userRole = 'user' }) => {
  const [activeTab, setActiveTab] = useState<'bpmn' | 'latex'>('bpmn');

  const isAdmin = userRole === ROLES.ADMIN;
  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
          <p className="text-xl font-semibold text-red-600 mb-2">Access Denied</p>
          <p className="text-gray-600">Only admins can view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">File Management</h2>
        <div className="inline-flex rounded-lg overflow-hidden border">
          <button
            onClick={() => setActiveTab('bpmn')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'bpmn' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >BPMN Files</button>
          <button
            onClick={() => setActiveTab('latex')}
            className={`px-4 py-2 text-sm font-medium border-l ${activeTab === 'latex' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >LaTeX Files</button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'bpmn' ? (
          <AdminBpmnFiles userRole={userRole} />
        ) : (
          <AdminLatexFiles userRole={userRole} />
        )}
      </div>
    </div>
  );
};

export default AdminFileManagement;


