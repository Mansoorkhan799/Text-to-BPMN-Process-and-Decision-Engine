'use client';

import { useState, useEffect, useRef } from 'react';
import { HiChevronUp, HiChevronDown, HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  displayName: string;
  email: string;
  address: string;
  city: string;
  contact: string;
}

type SortField = keyof Omit<User, 'id'>;
type SortOrder = 'asc' | 'desc';

interface FormErrors {
  displayName?: string;
  email?: string;
  contact?: string;
}

// Initial users data


const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('displayName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    displayName: boolean;
    email: boolean;
    address: boolean;
    city: boolean;
    contact: boolean;
  }>({
    displayName: true,
    email: true,
    address: true,
    city: true,
    contact: true,
  });
  const [pendingFilters, setPendingFilters] = useState<{
    displayName: boolean;
    email: boolean;
    address: boolean;
    city: boolean;
    contact: boolean;
  }>({
    displayName: true,
    email: true,
    address: true,
    city: true,
    contact: true,
  });
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({
    displayName: '',
    email: '',
    address: '',
    city: '',
    contact: ''
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  const usersPerPage = 7;
  const totalPages = Math.ceil(users.length / usersPerPage);

  const filterRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterModal(false);
      }
    }

    if (showFilterModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterModal]);

  // Add new filter function
  const filterUsers = (users: User[]) => {
    if (!searchQuery) return users;

    const searchTerm = searchQuery.toLowerCase();

    // Determine which fields to search
    const searchFields = Object.entries(activeFilters)
      .filter(([_, isActive]) => isActive)
      .map(([field]) => field as keyof User);

    // If no fields are active, default to all fields
    const fieldsToSearch = searchFields.length > 0 ? searchFields : Object.keys(users[0]) as (keyof User)[];

    return users.filter((user) => {
      return fieldsToSearch.some((field) => {
        const fieldValue = user[field].toLowerCase();
        return fieldValue.startsWith(searchTerm);
      });
    }).sort((a, b) => {
      // Prioritize items where display name starts with search term
      const aStartsWithSearch = a.displayName.toLowerCase().startsWith(searchTerm);
      const bStartsWithSearch = b.displayName.toLowerCase().startsWith(searchTerm);

      if (aStartsWithSearch && !bStartsWithSearch) return -1;
      if (!aStartsWithSearch && bStartsWithSearch) return 1;

      // If both or neither start with search term, maintain original sort
      return a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase());
    });
  };

  // Modify the sorting logic to include filtering
  const sortedAndFilteredUsers = filterUsers([...users]).sort((a, b) => {
    const aValue = a[sortField].toLowerCase();
    const bValue = b[sortField].toLowerCase();
    return sortOrder === 'asc' 
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  // Update the current users calculation
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = sortedAndFilteredUsers.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!newUser.displayName.trim()) {
      errors.displayName = 'Name is required';
    }

    if (!newUser.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(newUser.email)) {
      errors.email = 'Invalid email address';
    }

    if (newUser.contact && !/^[+]?\d{10,}$/.test(newUser.contact.replace(/\s/g, ''))) {
      errors.contact = 'Invalid contact number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async () => {
    setIsSubmitting(true);
    
    if (validateForm()) {
      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newUser),
        });

        if (!response.ok) throw new Error('Failed to add user');

        const addedUser = await response.json();
        setUsers([...users, addedUser]);
        setNewUser({
          displayName: '',
          email: '',
          address: '',
          city: '',
          contact: ''
        });
        setShowAddModal(false);
        toast.success('User added successfully!');
      } catch (error) {
        console.error('Failed to add user:', error);
        toast.error('Failed to add user');
      }
    }
    
    setIsSubmitting(false);
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete user');

      const updatedUsers = users.filter(user => user.id !== id);
      setUsers(updatedUsers);
      
      // Adjust current page if necessary
      const newTotalPages = Math.ceil(updatedUsers.length / usersPerPage);
      if (currentPage > newTotalPages) {
        setCurrentPage(Math.max(1, newTotalPages));
      }
      
      toast.success('User deleted successfully!');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleUpdateUser = async () => {
    setIsSubmitting(true);
    
    if (validateForm() && editingUser) {
      try {
        const updatedUserData = { ...editingUser, ...newUser };
        const response = await fetch('/api/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedUserData),
        });

        if (!response.ok) throw new Error('Failed to update user');

        const updatedUser = await response.json();
        setUsers(users.map(user => 
          user.id === updatedUser.id ? updatedUser : user
        ));
        setNewUser({
          displayName: '',
          email: '',
          address: '',
          city: '',
          contact: ''
        });
        setEditingUser(null);
        setShowUpdateModal(false);
        toast.success('User updated successfully!');
      } catch (error) {
        console.error('Failed to update user:', error);
        toast.error('Failed to update user');
      }
    }
    
    setIsSubmitting(false);
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setNewUser({
      displayName: user.displayName,
      email: user.email,
      address: user.address,
      city: user.city,
      contact: user.contact
    });
    setFormErrors({});
    setShowUpdateModal(true);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <span className="ml-2 text-gray-400">
          <HiChevronUp className="w-4 h-4" />
        </span>
      );
    }
    return (
      <span className="ml-2 text-indigo-600">
        {sortOrder === 'asc' ? (
          <HiChevronUp className="w-4 h-4" />
        ) : (
          <HiChevronDown className="w-4 h-4" />
        )}
      </span>
    );
  };

  const renderTableHeader = (field: SortField, label: string) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        {renderSortIcon(field)}
      </div>
    </th>
  );

  const renderInput = (
    field: keyof Omit<User, 'id'>,
    label: string,
    type: string = 'text',
    required: boolean = false
  ) => (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative rounded-md shadow-sm">
        <input
          type={type}
          value={newUser[field]}
          onChange={(e) => {
            setNewUser({ ...newUser, [field]: e.target.value });
            if (formErrors[field as keyof FormErrors]) {
              setFormErrors({ ...formErrors, [field]: undefined });
            }
          }}
          className={`
            block w-full px-4 py-3 text-base rounded-md
            ${formErrors[field as keyof FormErrors]
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }
            transition-colors duration-200
            placeholder:text-gray-400
          `}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        {formErrors[field as keyof FormErrors] && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <HiX className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      {formErrors[field as keyof FormErrors] && (
        <p className="mt-2 text-sm text-red-600">
          {formErrors[field as keyof FormErrors]}
        </p>
      )}
    </div>
  );

  // Modify the search and filter UI elements
  const renderSearchAndFilter = () => (
    <div className="mb-4 flex items-center justify-end space-x-2">
      <div className="relative flex items-center flex-1 max-w-2xl space-x-1">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
        
        <div 
          className="relative"
          ref={filterRef}
          onMouseEnter={() => {
            setShowFilterModal(true);
            setPendingFilters({...activeFilters});
          }}
        > 
          <button
            className="h-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>Filter</span>
          </button>

          {showFilterModal && (
            <div 
              className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50 border border-gray-200"
              onMouseLeave={() => setShowFilterModal(false)}
            >
              <div className="p-4">
                <div className="border-b pb-2 mb-2">
                  <div className="flex items-center hover:bg-gray-50 p-2 rounded-md transition-colors">
                    <input
                      type="checkbox"
                      id="selectAll"
                      checked={Object.values(pendingFilters).every(value => value === true)}
                      onChange={() => {
                        const allSelected = Object.values(pendingFilters).every(value => value === true);
                        setPendingFilters({
                          displayName: !allSelected,
                          email: !allSelected,
                          address: !allSelected,
                          city: !allSelected,
                          contact: !allSelected,
                        });
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <label 
                      htmlFor="selectAll" 
                      className="ml-2 text-gray-700 font-medium cursor-pointer flex-1"
                    >
                      Select All
                    </label>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(pendingFilters).map(([field, isActive]) => (
                    <div key={field} className="flex items-center hover:bg-gray-50 p-2 rounded-md transition-colors">
                      <input
                        type="checkbox"
                        id={field}
                        checked={isActive}
                        onChange={() =>
                          setPendingFilters((prev) => ({
                            ...prev,
                            [field]: !prev[field as keyof typeof pendingFilters],
                          }))
                        }
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <label 
                        htmlFor={field} 
                        className="ml-2 text-gray-700 capitalize cursor-pointer flex-1"
                      >
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => {
                      setActiveFilters({...pendingFilters});
                      setShowFilterModal(false);
                    }}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setPendingFilters({
                        displayName: false,
                        email: false,
                        address: false,
                        city: false,
                        contact: false,
                      });
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setShowAddModal(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2 transition-colors"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        <span>Add User</span>
      </button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {renderSearchAndFilter()}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow mx-6">
          <div className="flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {renderTableHeader('displayName', 'Display Name')}
                  {renderTableHeader('email', 'Email')}
                  {renderTableHeader('address', 'Address')}
                  {renderTableHeader('city', 'City')}
                  {renderTableHeader('contact', 'Contact')}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.displayName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.contact}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedAndFilteredUsers.length)} of {sortedAndFilteredUsers.length} results
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
                className={`px-3 py-1 border rounded text-sm ${
                  currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                First
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 border rounded text-sm ${
                  currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button className="px-3 py-1 border rounded text-sm text-gray-600 bg-white">
                Page {currentPage} of {totalPages}
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 border rounded text-sm ${
                  currentPage === totalPages 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 border rounded text-sm ${
                  currentPage === totalPages 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update User Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Update User</h2>
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <HiX className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-5">
              {renderInput('displayName', 'Name', 'text', true)}
              {renderInput('email', 'Email', 'email', true)}
              {renderInput('contact', 'Contact')}
              {renderInput('address', 'Address')}
              {renderInput('city', 'City')}
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-lg transition-colors ${
                  isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-indigo-700'
                }`}
              >
                {isSubmitting ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Add New User</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <HiX className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-5">
              {renderInput('displayName', 'Name', 'text', true)}
              {renderInput('email', 'Email', 'email', true)}
              {renderInput('contact', 'Contact')}
              {renderInput('address', 'Address')}
              {renderInput('city', 'City')}
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-lg transition-colors ${
                  isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-indigo-700'
                }`}
              >
                {isSubmitting ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users; 