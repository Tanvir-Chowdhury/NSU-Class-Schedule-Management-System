import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import defaultTeacherImg from '../assets/tl.webp'; 
import { Search, Filter, Mail, Briefcase, User, X, BookOpen, FlaskConical, Building, FileText, ChevronRight } from 'lucide-react';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Dynamic Options State
  const [deptOptions, setDeptOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [department, setDepartment] = useState('All');
  const [facultyType, setFacultyType] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  // 1. Fetch Dynamic Filters (Departments/Types) on Mount
  useEffect(() => {
    const fetchFilters = async () => {
        try {
            const res = await axios.get('http://localhost:8000/public/filters');
            setDeptOptions(res.data.departments || []);
            setTypeOptions(res.data.faculty_types || []);
        } catch (error) {
            console.error("Failed to load filters", error);
        }
    };
    fetchFilters();
  }, []);

  // 2. Fetch Teachers Data
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      try {
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (department !== 'All') params.department = department;
        if (facultyType !== 'All') params.faculty_type = facultyType;
        if (sortBy) params.sort_by = sortBy;

        const response = await axios.get('http://localhost:8000/public/teachers', { params });
        setTeachers(response.data);
      } catch (error) {
        console.error('Failed to fetch teachers:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchTeachers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, department, facultyType, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Navbar />

      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
            Faculty Members
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Meet our distinguished faculty members dedicated to academic excellence and research at North South University.
          </p>

          {/* Controls Bar */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Name or Initial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>

            {/* Department Filter (Dynamic) */}
            <div className="md:col-span-2 relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none shadow-sm cursor-pointer"
              >
                <option value="All">All Depts</option>
                {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Type Filter (Dynamic) */}
            <div className="md:col-span-2 relative">
                <select
                  value={facultyType}
                  onChange={(e) => setFacultyType(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none shadow-sm cursor-pointer"
                >
                  <option value="All">All Types</option>
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none">▼</div>
            </div>

            {/* Sort */}
            <div className="md:col-span-3 relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none shadow-sm cursor-pointer"
              >
                <option value="name">Sort by Name</option>
                <option value="initial">Sort by Initial</option>
                <option value="department">Sort by Dept</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none">▼</div>
            </div>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
        {loading ? (
           <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
           </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <User className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No teachers found</h3>
            <p className="text-slate-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {teachers.map((teacher) => (
              <div 
                key={teacher.id}
                onClick={() => setSelectedTeacher(teacher)}
                className="group bg-white rounded-lg border border-slate-200 p-4 hover:shadow-lg hover:border-indigo-100 transition-all duration-200 cursor-pointer flex items-center gap-4"
              >
                {/* Image (Small Avatar) */}
                <div className="h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                  <img 
                    src={teacher.profile_picture || defaultTeacherImg} 
                    alt={teacher.initial}
                    className="w-full h-full object-cover"
                    onError={(e) => {e.target.src = defaultTeacherImg}}
                  />
                </div>

                {/* Primary Info */}
                <div className="flex-grow min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    
                    {/* Name & Initial */}
                    <div className="md:col-span-4">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {teacher.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 font-mono">
                                {teacher.initial}
                            </span>
                            {teacher.faculty_type && (
                                <span className="text-xs text-slate-500 truncate">
                                    • {teacher.faculty_type}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Department */}
                    <div className="md:col-span-3 hidden md:block">
                         {teacher.department ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {teacher.department}
                            </span>
                         ) : (
                            <span className="text-xs text-slate-400 italic">No Dept</span>
                         )}
                    </div>

                    {/* Email */}
                    <div className="md:col-span-4 hidden md:flex items-center gap-2 text-sm text-slate-500 truncate">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                    </div>

                    {/* Arrow */}
                    <div className="md:col-span-1 flex justify-end">
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* Popup Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedTeacher(null)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative animate-in fade-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedTeacher(null)}
              className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-slate-100 rounded-full text-slate-500 hover:text-red-500 transition-colors z-10 border border-slate-200"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Modal Left: Image & Key Info */}
            <div className="md:w-2/5 bg-slate-50 p-8 flex flex-col items-center text-center border-r border-slate-100">
               <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg mb-6">
                 <img 
                    src={selectedTeacher.profile_picture || defaultTeacherImg} 
                    alt={selectedTeacher.initial}
                    className="w-full h-full object-cover"
                    onError={(e) => {e.target.src = defaultTeacherImg}}
                 />
               </div>
               <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedTeacher.name}</h2>
               <div className="flex flex-wrap justify-center gap-2 mb-6">
                 <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm font-mono">{selectedTeacher.initial}</span>
                 {selectedTeacher.department && (
                   <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-full font-medium text-sm">{selectedTeacher.department}</span>
                 )}
                 {selectedTeacher.faculty_type && (
                   <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full font-medium text-sm">{selectedTeacher.faculty_type}</span>
                 )}
               </div>
               
               <div className="w-full space-y-3 text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 text-sm text-slate-600 break-all">
                    <Mail className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                    <span>{selectedTeacher.email}</span>
                  </div>
                  {selectedTeacher.contact_details && (
                     <div className="flex items-start gap-3 text-sm text-slate-600">
                       <Building className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                       <span className="whitespace-pre-line">{selectedTeacher.contact_details}</span>
                     </div>
                  )}
               </div>
            </div>

            {/* Modal Right: Detailed Info */}
            <div className="md:w-3/5 p-8 space-y-8">
               
               {/* Research Interests */}
               <div>
                   <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                     <FlaskConical className="h-5 w-5 text-indigo-600" /> Research Interests
                   </h3>
                   <div className="text-slate-600 leading-relaxed text-sm bg-slate-50 p-4 rounded-lg">
                     {selectedTeacher.research_interests 
                        ? selectedTeacher.research_interests.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)
                        : <span className="text-slate-400 italic">No research interests listed.</span>
                     }
                   </div>
               </div>

               {/* Projects */}
               <div>
                   <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                     <BookOpen className="h-5 w-5 text-indigo-600" /> Current Projects
                   </h3>
                   <div className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                     {selectedTeacher.projects || <span className="text-slate-400 italic">No ongoing projects listed.</span>}
                   </div>
               </div>

               {/* Published Papers */}
               <div>
                   <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                     <FileText className="h-5 w-5 text-indigo-600" /> Selected Publications
                   </h3>
                   <div className="text-slate-600 leading-relaxed text-sm">
                     {selectedTeacher.published_papers 
                        ? <div className="whitespace-pre-line">{selectedTeacher.published_papers}</div>
                        : <span className="text-slate-400 italic">No publications listed.</span>
                     }
                   </div>
               </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;