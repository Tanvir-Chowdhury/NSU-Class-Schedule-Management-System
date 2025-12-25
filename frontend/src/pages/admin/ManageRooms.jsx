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
  MapPin,
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const ManageRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'room_number', direction: 'asc' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });
  const [newRoomData, setNewRoomData] = useState({
    room_number: '',
    capacity: 40,
    type: 'THEORY'
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const fileInputRef = useRef(null);
  
  const { token } = useAuth();

  useEffect(() => {
    fetchRooms(1, sortConfig, searchQuery);
  }, [sortConfig, searchQuery]);

  const fetchRooms = async (page = 1, currentSort = sortConfig, currentSearch = searchQuery) => {
    try {
      const response = await axios.get('http://localhost:8000/admin/rooms', {
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
      setRooms(response.data.items);
      setPagination(prev => ({ ...prev, page, total: response.data.total }));
    } catch (error) {
      console.error('Failed to fetch rooms', error);
      setStatus({ type: 'error', message: 'Failed to load rooms.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.limit)) {
      fetchRooms(newPage, sortConfig, searchQuery);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      await axios.post('http://localhost:8000/admin/upload-rooms', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setStatus({ type: 'success', message: 'Rooms uploaded successfully.' });
      fetchRooms();
    } catch (error) {
      console.error('Upload failed', error);
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to upload rooms.' });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/admin/rooms', newRoomData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Room created successfully.' });
      setIsModalOpen(false);
      setNewRoomData({ room_number: '', capacity: 40, type: 'THEORY' });
      fetchRooms();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to create room.' });
    }
  };

  const handleEditClick = (room) => {
    setEditingId(room.id);
    setEditFormData({ ...room });
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
      await axios.put(`http://localhost:8000/admin/rooms/${id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Room updated successfully.' });
      setEditingId(null);
      fetchRooms(pagination.page);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to update room.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await axios.delete(`http://localhost:8000/admin/rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Room deleted successfully.' });
      fetchRooms(pagination.page);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete room.' });
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
      setSelectedIds(rooms.map(r => r.id));
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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} rooms?`)) return;

    try {
      await axios.post('http://localhost:8000/admin/rooms/bulk-delete', 
        { ids: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: 'success', message: 'Selected rooms deleted successfully.' });
      setSelectedIds([]);
      fetchRooms(pagination.page);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete selected rooms.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Rooms</h1>
          <p className="text-slate-500">View and manage classrooms and labs.</p>
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
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
          placeholder="Search by room number..."
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
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedIds.length > 0 && selectedIds.length === rooms.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('room_number')}
                >
                  <div className="flex items-center gap-2">
                    Room Number
                    {sortConfig.key === 'room_number' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('capacity')}
                >
                  <div className="flex items-center gap-2">
                    Capacity
                    {sortConfig.key === 'capacity' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    {sortConfig.key === 'type' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading rooms...
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <MapPin className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900">No rooms found</p>
                        <p className="text-sm mt-1">
                          {searchQuery ? 'Try adjusting your search terms.' : 'Add a room to get started.'}
                        </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.includes(room.id)}
                        onChange={() => handleSelectOne(room.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {editingId === room.id ? (
                        <input
                          type="text"
                          name="room_number"
                          value={editFormData.room_number}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      ) : (
                        room.room_number
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {editingId === room.id ? (
                        <input
                          type="number"
                          name="capacity"
                          value={editFormData.capacity}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      ) : (
                        room.capacity
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === room.id ? (
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
                          room.type === 'LAB' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {room.type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === room.id ? (
                          <>
                            <button
                              onClick={() => handleSave(room.id)}
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
                              onClick={() => handleEditClick(room)}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(room.id)}
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
            Showing <span className="font-medium">{rooms.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
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

      {/* Add Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900">Add New Room</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  value={newRoomData.room_number}
                  onChange={(e) => setNewRoomData({...newRoomData, room_number: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="e.g. NAC614"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newRoomData.capacity}
                    onChange={(e) => setNewRoomData({...newRoomData, capacity: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={newRoomData.type}
                    onChange={(e) => setNewRoomData({...newRoomData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="THEORY">THEORY</option>
                    <option value="LAB">LAB</option>
                  </select>
                </div>
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
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRooms;
