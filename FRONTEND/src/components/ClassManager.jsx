import { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  collection, 
  getDocs, 
  getDoc,
  query, 
  where, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  arrayUnion,
  arrayRemove
} from '../firebase/config';
import ClassDetails from './ClassDetails';

const COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#DBEAFE",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  success: "#16A34A",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  border: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  white: "#FFFFFF",
  grayLight: "#F9FAFB",
};

function ClassManager({ userData, role }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    grade: '',
    schedule: '',
    color: '#2563EB',
    meetLink: ''
  });

  const colorOptions = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2", "#E11D48", "#EA580C"];

  // Fetch classes
  useEffect(() => {
    fetchClasses();
  }, [role]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      let classesList = [];
      
      if (role === 'teacher') {
        // Teacher sees their own classes
        const q = query(collection(db, "classes"), where("teacherId", "==", auth.currentUser?.uid));
        const querySnapshot = await getDocs(q);
        classesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        // Student sees ALL available classes
        const querySnapshot = await getDocs(collection(db, "classes"));
        classesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      setClasses(classesList);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        const classRef = doc(db, "classes", editingClass.id);
        await updateDoc(classRef, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        alert("Class updated successfully!");
      } else {
        await addDoc(collection(db, "classes"), {
          ...formData,
          teacherId: auth.currentUser.uid,
          teacherName: userData?.fullName,
          status: "active",
          enrolledStudents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        alert("Class created successfully!");
      }
      resetForm();
      fetchClasses();
    } catch (error) {
      console.error("Error saving class:", error);
      alert("Error saving class: " + error.message);
    }
  };

  const handleDelete = async (classId) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
      try {
        await deleteDoc(doc(db, "classes", classId));
        alert("Class deleted successfully!");
        fetchClasses();
      } catch (error) {
        console.error("Error deleting class:", error);
        alert("Error deleting class: " + error.message);
      }
    }
  };

  const enrollInClass = async (classId) => {
    try {
      // Check if already enrolled
      const checkEnrollment = query(
        collection(db, "enrollments"), 
        where("studentId", "==", auth.currentUser?.uid),
        where("classId", "==", classId)
      );
      const existing = await getDocs(checkEnrollment);
      
      if (!existing.empty) {
        alert("You are already enrolled in this class!");
        return;
      }
      
      // Add enrollment record
      await addDoc(collection(db, "enrollments"), {
        studentId: auth.currentUser.uid,
        studentName: userData?.fullName,
        classId: classId,
        enrolledAt: new Date().toISOString(),
        status: "active"
      });
      
      // Add student to class's enrolledStudents array
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, {
        enrolledStudents: arrayUnion(auth.currentUser.uid)
      });
      
      alert("Successfully enrolled in class!");
      fetchClasses();
    } catch (error) {
      console.error("Error enrolling:", error);
      alert("Error enrolling in class: " + error.message);
    }
  };

  const handleJoinClass = (meetLink) => {
    if (meetLink) {
      window.open(meetLink, '_blank');
    } else {
      alert("No meeting link has been set for this class yet.");
    }
  };

  const handleViewClass = (classId) => {
    setSelectedClassId(classId);
  };

  const handleBackToList = () => {
    setSelectedClassId(null);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingClass(null);
    setFormData({
      name: '',
      description: '',
      grade: '',
      schedule: '',
      color: '#2563EB',
      meetLink: ''
    });
  };

  const editClass = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      description: classItem.description || '',
      grade: classItem.grade,
      schedule: classItem.schedule,
      color: classItem.color,
      meetLink: classItem.meetLink || ''
    });
    setShowForm(true);
  };

  // If a class is selected, show ClassDetails
  if (selectedClassId) {
    return (
      <ClassDetails 
        classId={selectedClassId} 
        userData={userData} 
        role={role} 
        onBack={handleBackToList}
      />
    );
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Loading classes...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>Classes</h1>
        {role === 'teacher' && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "10px 20px",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            {showForm ? "Cancel" : "+ Create New Class"}
          </button>
        )}
      </div>

      {/* Create/Edit Class Form */}
      {showForm && role === 'teacher' && (
        <div style={{
          background: COLORS.white,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          border: `1px solid ${COLORS.border}`
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            {editingClass ? "Edit Class" : "Create New Class"}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Class Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="3"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  resize: "vertical"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Grade/Level *</label>
                <input
                  type="text"
                  required
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  placeholder="e.g., Grade 10"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Schedule *</label>
                <input
                  type="text"
                  required
                  value={formData.schedule}
                  onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                  placeholder="e.g., Mon, Wed, Fri · 10:00 AM"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
            </div>

            {/* Google Meet Link Field */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Google Meet Link</label>
              <input
                type="url"
                value={formData.meetLink}
                onChange={(e) => setFormData({...formData, meetLink: e.target.value})}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                Students will use this link to join your live classes
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Class Color</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({...formData, color})}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: color,
                      border: formData.color === color ? `3px solid ${COLORS.text}` : "none",
                      cursor: "pointer"
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="submit"
                style={{
                  padding: "10px 24px",
                  background: COLORS.primary,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {editingClass ? "Update Class" : "Create Class"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: "10px 24px",
                  background: COLORS.grayLight,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: 60,
          background: COLORS.white,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <p style={{ color: COLORS.textMuted }}>
            {role === 'teacher' 
              ? "You haven't created any classes yet. Click 'Create New Class' to get started!"
              : "No classes available yet. Check back later!"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 20 }}>
          {classes.map(classItem => {
            const isEnrolled = classItem.enrolledStudents?.includes(auth.currentUser?.uid);
            
            return (
              <div
                key={classItem.id}
                style={{
                  background: COLORS.white,
                  borderRadius: 16,
                  overflow: "hidden",
                  border: `1px solid ${COLORS.border}`,
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
              >
                <div style={{ height: 8, background: classItem.color }} />
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{classItem.name}</h3>
                    {role === 'teacher' && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); editClass(classItem); }}
                          style={{
                            padding: "4px 8px",
                            background: COLORS.primaryLight,
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(classItem.id); }}
                          style={{
                            padding: "4px 8px",
                            background: COLORS.dangerLight,
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            color: COLORS.danger
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {classItem.description && (
                    <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 12 }}>
                      {classItem.description.substring(0, 100)}{classItem.description.length > 100 ? "..." : ""}
                    </p>
                  )}
                  
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
                    <strong>Teacher:</strong> {classItem.teacherName}
                  </div>
                  
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
                    <strong>Grade:</strong> {classItem.grade}
                  </div>
                  
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
                    <strong>Schedule:</strong> {classItem.schedule}
                  </div>
                  
                  {role === 'teacher' && (
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
                      <strong>Enrolled:</strong> {classItem.enrolledStudents?.length || 0} students
                    </div>
                  )}
                  
                  {/* Two buttons for students: Join Class (Live) and View Details */}
                  {role === 'student' && (
                    <div style={{ display: "flex", gap: 10 }}>
                      {/* JOIN CLASS BUTTON - Opens Google Meet */}
                      <button
                        onClick={() => handleJoinClass(classItem.meetLink)}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#10B981",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6
                        }}
                      >
                        <span>🎥</span> Join Live Class
                      </button>
                      
                      {/* VIEW CLASS BUTTON - Shows class details */}
                      <button
                        onClick={() => handleViewClass(classItem.id)}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: isEnrolled ? COLORS.success : classItem.color,
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 13
                        }}
                      >
                        {isEnrolled ? "📖 View Class" : "🔍 View Details"}
                      </button>
                    </div>
                  )}
                  
                  {/* Teacher view - Single button */}
                  {role === 'teacher' && (
                    <button
                      onClick={() => handleViewClass(classItem.id)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: COLORS.primaryLight,
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 13,
                        color: COLORS.primaryDark
                      }}
                    >
                      View Class Details
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ClassManager;