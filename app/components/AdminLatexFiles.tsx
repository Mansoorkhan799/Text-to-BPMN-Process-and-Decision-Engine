'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ROLES } from '../utils/permissions';
import { toast } from 'react-hot-toast';
import { HiRefresh, HiEye, HiDownload, HiTrash, HiArchive, HiUser, HiFilter } from 'react-icons/hi';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AdminLatexFileRow {
  id?: string;
  mongoId?: string;
  fileId?: string;
  name: string;
  author: string;
  createdAt: string | Date;
  archived?: boolean;
}

interface AdminLatexFilesProps {
  userRole?: string;
}

const AdminLatexFiles: React.FC<AdminLatexFilesProps> = ({ userRole = 'user' }) => {
  const [rows, setRows] = useState<AdminLatexFileRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [archivedRows, setArchivedRows] = useState<AdminLatexFileRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('latest');
  const [showSortMenu, setShowSortMenu] = useState<boolean>(false);

  const isAdmin = useMemo(() => userRole === ROLES.ADMIN, [userRole]);

  const fetchAll = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/latex-files', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load files');
      }
      const data = await res.json();
      setRows(data.files || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load LaTeX files');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handlePreview = async (row: AdminLatexFileRow) => {
    try {
      const id = encodeURIComponent(row.mongoId || row.fileId || '');
      const res = await fetch(`/api/admin/latex-files/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPreviewData(data.file);
      setShowPreview(true);
      // Trigger compile in the background for PDF preview
      try {
        setCompileError(null);
        setIsCompiling(true);
        const pdfRes = await fetch(`/api/admin/latex-files/compile?id=${id}`, { credentials: 'include' });
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        } else {
          let details = '';
          try { const j = await pdfRes.json(); details = j?.details || j?.error || ''; } catch {}
          setCompileError(details || 'Compile failed');
          setPdfBlobUrl(null);
        }
      } catch (e) {
        setCompileError('Compile error');
        setPdfBlobUrl(null);
      } finally {
        setIsCompiling(false);
      }
    } catch {
      toast.error('Failed to load preview');
    }
  };

  const handleDownload = async (row: AdminLatexFileRow) => {
    try {
      const id = encodeURIComponent(row.mongoId || row.fileId || '');
      const res = await fetch(`/api/admin/latex-files/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const blob = new Blob([data.file?.content || ''], { type: 'text/x-tex' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.name || row.fileId || row.mongoId}.tex`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (row: AdminLatexFileRow) => {
    if (!confirm(`Delete ${row.name}?`)) return;
    try {
      const id = encodeURIComponent(row.mongoId || row.fileId || '');
      const res = await fetch(`/api/admin/latex-files/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Deleted');
      fetchAll();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleToggleArchive = async (row: AdminLatexFileRow) => {
    try {
      const id = encodeURIComponent(row.mongoId || row.fileId || '');
      const res = await fetch(`/api/admin/latex-files/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !row.archived }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchAll();
    } catch {
      toast.error('Archive toggle failed');
    }
  };

  const handleReassign = async (row: AdminLatexFileRow) => {
    const newOwner = prompt('Enter new owner userId');
    if (!newOwner) return;
    try {
      const id = encodeURIComponent(row.mongoId || row.fileId || '');
      const res = await fetch(`/api/admin/latex-files/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newOwner, ownerUserId: newOwner }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Reassigned');
      fetchAll();
    } catch {
      toast.error('Reassign failed');
    }
  };

  const displayedRows = useMemo(() => {
    let list = [...rows];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.author || '').toLowerCase().includes(q)
      );
    }
    switch (sortOption) {
      case 'latest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'a-z':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'z-a':
        list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'updated':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        break;
    }
    return list;
  }, [rows, searchQuery, sortOption]);

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
    <div className="h-full overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">LaTeX Files</h2>
            <p className="text-gray-600">List of all LaTeX files across all users</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-80 md:w-96 px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => setShowSortMenu((s) => !s)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm shadow-sm"
              title="Filter"
            >
              <HiFilter className="h-5 w-5" />
              <span>Filter</span>
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-11 z-10 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                <div className="px-2 py-1 text-xs uppercase tracking-wider text-gray-500">Sort by</div>
                <ul className="py-1">
                  {[
                    { id: 'latest', label: 'Latest' },
                    { id: 'oldest', label: 'Oldest' },
                    { id: 'a-z', label: 'A–Z' },
                    { id: 'z-a', label: 'Z–A' },
                    { id: 'updated', label: 'Recently updated' },
                  ].map(opt => (
                    <li key={opt.id}>
                      <button
                        onClick={() => { setSortOption(opt.id); setShowSortMenu(false); }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 ${sortOption === opt.id ? 'bg-gray-100 font-medium' : ''}`}
                      >{opt.label}</button>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end gap-2 px-2 pb-2">
                  <button onClick={() => { setSortOption('latest'); setShowSortMenu(false); }} className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Reset</button>
                  <button onClick={() => setShowSortMenu(false)} className="px-3 py-1 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Done</button>
                </div>
              </div>
            )}
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/latex-files/archived', { credentials: 'include' });
                  if (!res.ok) throw new Error('Failed');
                  const data = await res.json();
                  setArchivedRows(data.files || []);
                  setShowArchived(true);
                } catch {
                  toast.error('Failed to load archived files');
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
              title="View archived"
            >
              <HiArchive className="h-5 w-5 text-amber-600" />
              <span>Archived</span>
            </button>
            <button
              onClick={fetchAll}
              disabled={isLoading}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium ${isLoading ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}`}
              title="Refresh"
            >
              <HiRefresh className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            </div>
            <div className="text-xs text-gray-500">Total files: {rows.length}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By (Author)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading && (
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-500" colSpan={4}>Loading...</td>
                  </tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-500" colSpan={4}>No files found</td>
                  </tr>
                )}
                {!isLoading && displayedRows.map((row, idx) => (
                  <tr key={`${row.name}-${idx}`} className={`hover:bg-gray-50 ${row.archived ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.author || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-2 text-sm text-gray-700">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handlePreview(row)} className="p-2 rounded hover:bg-gray-100" title="Preview">
                          <HiEye className="h-5 w-5 text-gray-600" />
                        </button>
                        <button onClick={() => handleDownload(row)} className="p-2 rounded hover:bg-gray-100" title="Download">
                          <HiDownload className="h-5 w-5 text-gray-600" />
                        </button>
                        <button onClick={() => handleToggleArchive(row)} className="p-2 rounded hover:bg-gray-100" title={row.archived ? 'Unarchive' : 'Archive'}>
                          <HiArchive className={`h-5 w-5 ${row.archived ? 'text-amber-600' : 'text-gray-600'}`} />
                        </button>
                        <button onClick={() => handleReassign(row)} className="p-2 rounded hover:bg-gray-100" title="Reassign owner">
                          <HiUser className="h-5 w-5 text-gray-600" />
                        </button>
                        <button onClick={() => handleDelete(row)} className="p-2 rounded hover:bg-red-50" title="Delete">
                          <HiTrash className="h-5 w-5 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showPreview && previewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-6xl h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-lg font-semibold truncate">Preview: {previewData?.name || ''}</h3>
                <button onClick={() => { setShowPreview(false); setPreviewData(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="flex-1 overflow-hidden p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border rounded overflow-auto">
                  <div className="p-3">
                    <h4 className="font-semibold text-gray-800 mb-2">LaTeX Source</h4>
                    <pre className="text-sm whitespace-pre-wrap break-words bg-gray-50 p-3 rounded border" style={{ maxHeight: '65vh' }}>
{previewData?.content || ''}
                    </pre>
                  </div>
                </div>
                <div className="border rounded overflow-auto flex items-center justify-center bg-gray-50">
                  {!pdfBlobUrl && isCompiling && (
                    <div className="text-gray-600 text-sm p-4">Compiling PDF...</div>
                  )}
                  {!pdfBlobUrl && !isCompiling && (
                    <div className="text-gray-600 text-sm p-4 text-center">
                      <div>PDF preview unavailable</div>
                      {compileError && (
                        <details className="mt-2 text-xs text-red-600 whitespace-pre-wrap break-words max-w-full">
                          <summary>Show compiler output</summary>
                          {compileError}
                        </details>
                      )}
                    </div>
                  )}
                  {pdfBlobUrl && (
                    <iframe title="PDF Preview" src={pdfBlobUrl} className="w-full h-[70vh]" />
                  )}
                </div>
              </div>
              <div className="px-4 py-3 border-t flex justify-end gap-2">
                {pdfBlobUrl && (
                  <a href={pdfBlobUrl} download={`${previewData?.name || 'document'}.pdf`} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white">Download PDF</a>
                )}
                {!pdfBlobUrl && !isCompiling && (
                  <button
                    onClick={async () => {
                      const id = encodeURIComponent(previewData?._id || previewData?.fileId || '');
                      setIsCompiling(true);
                      setCompileError(null);
                      try {
                        const pdfRes = await fetch(`/api/admin/latex-files/compile?id=${id}`, { credentials: 'include' });
                        if (pdfRes.ok) {
                          const blob = await pdfRes.blob();
                          setPdfBlobUrl(URL.createObjectURL(blob));
                        } else {
                          let details = '';
                          try { const j = await pdfRes.json(); details = j?.details || j?.error || ''; } catch {}
                          setCompileError(details || 'Compile failed');
                        }
                      } finally {
                        setIsCompiling(false);
                      }
                    }}
                    className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                  >Recompile</button>
                )}
                <button onClick={() => { setShowPreview(false); setPreviewData(null); setPdfBlobUrl(null); }} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800">Close</button>
              </div>
            </div>
          </div>
        )}

        {showArchived && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-lg font-semibold">Archived LaTeX Files</h3>
                <button onClick={() => setShowArchived(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="max-h-[60vh] overflow-auto p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {archivedRows.length === 0 && (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={4}>No archived files found</td>
                      </tr>
                    )}
                    {archivedRows.map((row, idx) => (
                      <tr key={`${row.name}-${idx}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.author || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleToggleArchive(row)}
                              className="px-3 py-1 rounded-md border text-sm bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                            >Unarchive</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t flex justify-end">
                <button onClick={() => setShowArchived(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLatexFiles;


