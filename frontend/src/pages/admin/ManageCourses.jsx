import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Upload, 
  FileSpreadsheet, 
  Loader2, 
  Edit2, 
  Save, 
  X, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  BookOpen,
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'code', direction: 'asc' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });
  const [newCourseData, setNewCourseData] = useState({
    code: '',
    title: '',
    credits: 3,
    type: 'THEORY',
    duration_mode: 'STANDARD'
  });
  const [selectedIds, setSelectedIds] = useState([]);
  
  const fileInputRef = useRef(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchCourses(1, sortConfig, searchQuery);
  }, [sortConfig, searchQuery]);

  const downloadPDF = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/courses', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10000 }
      });
      const allCourses = response.data.items || [];

      const doc = new jsPDF();
      doc.text("Courses List", 14, 10);
      
      const tableColumn = ["Code", "Title", "Credits", "Type", "Duration"];
      const tableRows = [];

      allCourses.forEach(course => {
        const courseData = [
          course.code,
          course.title,
          course.credits,
          course.type,
          course.duration_mode
        ];
        tableRows.push(courseData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      doc.save("courses.pdf");
    } catch (error) {
      console.error("Failed to download PDF", error);
      setStatus({ type: 'error', message: 'Failed to download PDF.' });
    }
  };

  const downloadCSV = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/courses', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10000 }
      });
      const allCourses = response.data.items || [];

      const headers = ["Code,Title,Credits,Type,Duration"];
      const rows = allCourses.map(course => 
        `${course.code},"${course.title}",${course.credits},${course.type},${course.duration_mode}`
      );

      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "courses.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download CSV", error);
      setStatus({ type: 'error', message: 'Failed to download CSV.' });
    }
  };

  const fetchCourses = async (page = 1, currentSort = sortConfig, currentSearch = searchQuery) => {
    try {
      const response = await axios.get(`http://localhost:8000/admin/courses`, {
        params: {
          page,
          limit: pagination.limit,
          search: currentSearch,
          sort_by: currentSort.key,
          sort_order: currentSort.direction,
          _t: Date.now() // Prevent caching
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data.items);
      setPagination(prev => ({ ...prev, page, total: response.data.total }));
    } catch (error) {
      console.error('Failed to fetch courses', error);
      setStatus({ type: 'error', message: 'Failed to load courses.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.limit)) {
      fetchCourses(newPage, sortConfig, searchQuery);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/admin/courses', newCourseData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Course created successfully.' });
      setIsModalOpen(false);
      setNewCourseData({
        code: '',
        title: '',
        credits: 3,
        type: 'THEORY',
        duration_mode: 'STANDARD'
      });
      fetchCourses();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to create course.' });
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
      await axios.post('http://localhost:8000/admin/upload-courses', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setStatus({ type: 'success', message: 'Courses uploaded successfully.' });
      fetchCourses();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Upload failed.' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEditClick = (course) => {
    setEditingId(course.id);
    setEditFormData({ ...course });
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
      await axios.put(`http://localhost:8000/admin/courses/${id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Course updated successfully.' });
      setEditingId(null);
      fetchCourses();
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to update course.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      await axios.delete(`http://localhost:8000/admin/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Course deleted successfully.' });
      fetchCourses();
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete course.' });
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Client-side filtering/sorting removed in favor of server-side
  const filteredAndSortedCourses = courses;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAndSortedCourses.map(c => c.id));
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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} courses?`)) return;

    try {
      await axios.post('http://localhost:8000/admin/courses/bulk-delete', 
        { ids: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: 'success', message: 'Selected courses deleted successfully.' });
      setSelectedIds([]);
      fetchCourses();
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete selected courses.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Courses</h1>
          <p className="text-slate-500">View and manage academic courses.</p>
        </div>
        
        <div className="flex gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </button>
          <button
            onClick={downloadPDF}
            className="inline-flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </button>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors shadow-sm"
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

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by course code or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-900 placeholder-slate-400 outline-none"
        />
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {status.message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            {/* ... table content ... */}
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredAndSortedCourses.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center gap-2">
                    Code
                    {sortConfig.key === 'code' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('sections_count')}
                >
                  <div className="flex items-center gap-2">
                    Sections
                    {sortConfig.key === 'sections_count' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-2">
                    Title
                    {sortConfig.key === 'title' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    {sortConfig.key === 'type' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('duration_mode')}
                >
                  <div className="flex items-center gap-2">
                    Duration
                    {sortConfig.key === 'duration_mode' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading courses...
                  </td>
                </tr>
              ) : filteredAndSortedCourses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <BookOpen className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900">No courses found</p>
                        <p className="text-sm mt-1">
                          {searchQuery ? 'Try adjusting your search terms.' : 'Upload a CSV file to get started.'}
                        </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.includes(course.id)}
                        onChange={() => handleSelectOne(course.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {editingId === course.id ? (
                        <input
                          type="text"
                          name="code"
                          value={editFormData.code}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      ) : (
                        course.code
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {editingId === course.id ? (
                        <input
                          type="number"
                          name="sections_count"
                          value={editFormData.sections_count || 0}
                          onChange={(e) => setEditFormData({ ...editFormData, sections_count: parseInt(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          min="0"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {course.sections_count || 0}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {editingId === course.id ? (
                        <input
                          type="text"
                          name="title"
                          value={editFormData.title}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      ) : (
                        course.title
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === course.id ? (
                        <select
                          name="type"
                          value={editFormData.type}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          <option value="THEORY">THEORY</option>
                          <option value="LAB">LAB</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          course.type === 'LAB' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {course.type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === course.id ? (
                        <select
                          name="duration_mode"
                          value={editFormData.duration_mode}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          <option value="STANDARD">Standard (1.5h)</option>
                          <option value="EXTENDED">Extended (3h)</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          course.duration_mode === 'EXTENDED' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {course.duration_mode === 'EXTENDED' ? '3h 10m' : '1h 30m'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === course.id ? (
                          <>
                            <button
                              onClick={() => handleSave(course.id)}
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
                              onClick={() => handleEditClick(course)}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(course.id)}
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
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="text-sm text-slate-500">
          Showing <span className="font-medium">{Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-slate-700">
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit) || 1}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Add Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900">Add New Course</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  value={newCourseData.code}
                  onChange={(e) => setNewCourseData({...newCourseData, code: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="e.g. CSE327"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={newCourseData.title}
                  onChange={(e) => setNewCourseData({...newCourseData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="e.g. Software Engineering"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Credits</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={newCourseData.credits}
                    onChange={(e) => setNewCourseData({...newCourseData, credits: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={newCourseData.type}
                    onChange={(e) => setNewCourseData({...newCourseData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="THEORY">THEORY</option>
                    <option value="LAB">LAB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration Mode</label>
                <select
                  value={newCourseData.duration_mode}
                  onChange={(e) => setNewCourseData({...newCourseData, duration_mode: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="STANDARD">Standard (1.5h)</option>
                  <option value="EXTENDED">Extended (3h)</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Standard is for regular classes. Extended is typically for labs.
                </p>
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
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCourses;
