import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Upload, 
  Loader2, 
  Edit2, 
  Save, 
  X, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Users,
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ManageTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'initial', direction: 'asc' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });
  const [newTeacherData, setNewTeacherData] = useState({
    initial: '',
    name: '',
    email: '',
    department: '',
    faculty_type: 'Permanent'
  });
  const [selectedIds, setSelectedIds] = useState([]);
  
  const fileInputRef = useRef(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchTeachers(1, sortConfig, searchQuery);
  }, [sortConfig, searchQuery]);

  const downloadPDF = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10000 }
      });
      const allTeachers = response.data.items || [];

      const doc = new jsPDF();
      doc.text("Teachers List", 14, 10);
      
      const tableColumn = ["Initial", "Name", "Department", "Faculty Type", "Contact"];
      const tableRows = [];

      allTeachers.forEach(teacher => {
        const teacherData = [
          teacher.initial,
          teacher.name,
          teacher.department || 'N/A',
          teacher.faculty_type || 'N/A',
          teacher.email || teacher.contact_details || 'N/A'
        ];
        tableRows.push(teacherData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      doc.save("teachers.pdf");
    } catch (error) {
      console.error("Failed to download PDF", error);
      setStatus({ type: 'error', message: 'Failed to download PDF.' });
    }
  };

  const downloadCSV = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10000 }
      });
      const allTeachers = response.data.items || [];

      const headers = ["Initial,Name,Department,Faculty Type,Contact"];
      const rows = allTeachers.map(teacher => 
        `${teacher.initial},"${teacher.name}",${teacher.department || ''},${teacher.faculty_type || ''},"${teacher.email || teacher.contact_details || ''}"`
      );

      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "teachers.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download CSV", error);
      setStatus({ type: 'error', message: 'Failed to download CSV.' });
    }
  };

  const fetchTeachers = async (page = 1, currentSort = sortConfig, currentSearch = searchQuery) => {
    try {
      const response = await axios.get('http://localhost:8000/admin/teachers', {
        params: {
          page,
          limit: pagination.limit,
          search: currentSearch,
          sort_by: currentSort.key,
          sort_order: currentSort.direction,
          _t: Date.now()
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data.items);
      setPagination(prev => ({ ...prev, page, total: response.data.total }));
    } catch (error) {
      console.error('Failed to fetch teachers', error);
      setStatus({ type: 'error', message: 'Failed to load teachers.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.limit)) {
      fetchTeachers(newPage, sortConfig, searchQuery);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/admin/teachers', newTeacherData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Teacher created successfully.' });
      setIsModalOpen(false);
      setNewTeacherData({ initial: '', name: '', email: '', department: '', faculty_type: 'Permanent' });
      fetchTeachers();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to create teacher.' });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:8000/admin/upload-teachers', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setStatus({ type: 'success', message: 'Teachers uploaded successfully.' });
      fetchTeachers();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Upload failed.' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEditClick = (teacher) => {
    setEditingId(teacher.id);
    setEditFormData({ ...teacher });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSave = async (id) => {
    try {
      await axios.put(`http://localhost:8000/admin/teachers/${id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Teacher updated successfully.' });
      setEditingId(null);
      fetchTeachers(pagination.page);
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to update teacher.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This will also delete their user account.')) return;
    
    try {
      await axios.delete(`http://localhost:8000/admin/teachers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Teacher deleted successfully.' });
      fetchTeachers(pagination.page);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete teacher.' });
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(teachers.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} teachers? This will also delete their user accounts.`)) return;

    try {
      await axios.post('http://localhost:8000/admin/teachers/bulk-delete', 
        { ids: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: 'success', message: 'Selected teachers deleted successfully.' });
      setSelectedIds([]);
      fetchTeachers(pagination.page);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete selected teachers.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Teachers</h1>
          <p className="text-slate-500">View, upload, and manage faculty members.</p>
        </div>
        
        <div>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm mr-3"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors shadow-sm mr-3"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Teacher
          </button>
          <button
            onClick={downloadPDF}
            className="inline-flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors shadow-sm mr-3"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </button>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors shadow-sm mr-3"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload CSV
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {status.message}
        </div>
      )}

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by initial or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-900 placeholder-slate-400 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={teachers.length > 0 && selectedIds.length === teachers.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('initial')}
                >
                  <div className="flex items-center gap-2">
                    Initial
                    {sortConfig.key === 'initial' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Name
                    {sortConfig.key === 'name' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('department')}
                >
                  <div className="flex items-center gap-2">
                    Department
                    {sortConfig.key === 'department' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('faculty_type')}
                >
                  <div className="flex items-center gap-2">
                    Faculty Type
                    {sortConfig.key === 'faculty_type' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-center">Contact</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading teachers...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <Users className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900">No teachers found</p>
                        <p className="text-sm mt-1">
                          {searchQuery ? 'Try adjusting your search terms.' : 'Upload a CSV file to get started.'}
                        </p>
                    </div>
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.includes(teacher.id)}
                        onChange={() => handleSelectOne(teacher.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {editingId === teacher.id ? (
                        <input
                          type="text"
                          name="initial"
                          value={editFormData.initial}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      ) : (
                        teacher.initial
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {editingId === teacher.id ? (
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      ) : (
                        teacher.name
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {editingId === teacher.id ? (
                        <input
                          type="text"
                          name="department"
                          value={editFormData.department || ''}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      ) : (
                        teacher.department || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {editingId === teacher.id ? (
                        <select
                          name="faculty_type"
                          value={editFormData.faculty_type || 'Permanent'}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          <option value="Permanent">Permanent</option>
                          <option value="Adjunct">Adjunct</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          teacher.faculty_type === 'Permanent' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {teacher.faculty_type || 'Permanent'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(teacher.email || teacher.contact_details) ? (
                        <a 
                          href={`mailto:${teacher.email || teacher.contact_details}`} 
                          className="inline-flex items-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" 
                          title={`Email ${teacher.email || teacher.contact_details}`}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === teacher.id ? (
                          <>
                            <button
                              onClick={() => handleSave(teacher.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditClick(teacher)}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(teacher.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{teachers.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-700">
              Page {pagination.page} of {Math.max(1, Math.ceil(pagination.total / pagination.limit))}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900">Add New Teacher</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTeacher} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initial</label>
                <input
                  type="text"
                  required
                  value={newTeacherData.initial}
                  onChange={(e) => setNewTeacherData({...newTeacherData, initial: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="e.g. MRA"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newTeacherData.name}
                  onChange={(e) => setNewTeacherData({...newTeacherData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="e.g. Mahady Rahman"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newTeacherData.email}
                  onChange={(e) => setNewTeacherData({...newTeacherData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="e.g. mahady@northsouth.edu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={newTeacherData.department}
                  onChange={(e) => setNewTeacherData({...newTeacherData, department: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="e.g. ECE"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Faculty Type</label>
                <select
                  value={newTeacherData.faculty_type}
                  onChange={(e) => setNewTeacherData({...newTeacherData, faculty_type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Adjunct">Adjunct</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  Create Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTeachers;
