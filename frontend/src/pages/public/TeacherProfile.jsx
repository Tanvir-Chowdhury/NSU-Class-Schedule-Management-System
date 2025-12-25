import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { User, BookOpen, Briefcase, Phone, Clock, Mail, ArrowLeft, Loader2 } from 'lucide-react';

const PublicTeacherProfile = () => {
  const { id } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/profile/public/teacher/${id}`);
        setTeacher(response.data);
      } catch (err) {
        setError("Teacher profile not found.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeacher();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Profile Not Found</h2>
        <p className="text-slate-500">The teacher profile you are looking for does not exist.</p>
        <Link to="/" className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Link>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          </div>
          <div className="px-8 pb-8">
            <div className="relative -mt-16 mb-6 flex flex-col md:flex-row items-center md:items-end gap-6">
              <div className="h-32 w-32 rounded-full bg-white p-1 shadow-xl">
                <div className="h-full w-full rounded-full overflow-hidden bg-slate-100 border-2 border-slate-100">
                  {teacher.profile_picture ? (
                    <img src={teacher.profile_picture} alt={teacher.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-full w-full p-6 text-slate-400" />
                  )}
                </div>
              </div>
              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold text-slate-900">{teacher.name}</h1>
                <p className="text-lg text-slate-500 font-medium">{teacher.initial}</p>
              </div>
            </div>

            {/* Contact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
              {teacher.contact_details && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Contact Details</h3>
                    <p className="text-slate-600 whitespace-pre-line">{teacher.contact_details}</p>
                  </div>
                </div>
              )}
              {/* Note: Email is in User model, not Teacher model directly in public endpoint unless we joined it. 
                  The current public endpoint returns TeacherSchema which doesn't have email. 
                  If we want email, we need to update the backend to include it in the response.
                  For now, I'll skip email or assume it's in contact details if they added it.
              */}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Office Hours */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-blue-600" />
                Office Hours
              </h3>
              {teacher.office_hours && teacher.office_hours.length > 0 ? (
                <div className="space-y-3">
                  {teacher.office_hours.map((oh, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="font-semibold text-slate-800">{oh.day}</p>
                      <p className="text-sm text-slate-600">{oh.start_time} - {oh.end_time}</p>
                      {oh.course_id && <p className="text-xs text-blue-600 mt-1">Course ID: {oh.course_id}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No office hours listed.</p>
              )}
            </div>
          </div>

          {/* Right Column - Academic Info */}
          <div className="lg:col-span-2 space-y-6">
            {teacher.research_interests && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Research Interests
                </h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {teacher.research_interests}
                </p>
              </div>
            )}

            {teacher.published_papers && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Selected Publications
                </h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {teacher.published_papers}
                </p>
              </div>
            )}

            {teacher.projects && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Projects
                </h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {teacher.projects}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicTeacherProfile;