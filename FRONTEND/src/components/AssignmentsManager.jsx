import { useState, useEffect } from 'react';
import { 
  db, 
  storage,
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  ref,
  uploadBytes,
  getDownloadURL
} from '../firebase/config';
import { auth } from '../firebase/config';

const COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#DBEAFE",
  success: "#16A34A",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  gray: "#6B7280",
  grayLight: "#F9FAFB",
  border: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  white: "#FFFFFF",
};

function AssignmentsManager({ userData, role }) {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionAssignmentId, setSubmissionAssignmentId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    totalPoints: 100,
    classId: '',
    className: ''
  });

  // Fetch classes and assignments
 useEffect(() => {
  console.log("AssignmentsManager - Role:", role);
  console.log("AssignmentsManager - User:", userData?.fullName);
  console.log("AssignmentsManager - User UID:", auth.currentUser?.uid);
  fetchData();
}, [role]);

  const fetchData = async () => {
  try {
    setLoading(true);
    
    // Step 1: Fetch classes based on role
    let classesList = [];
    
    if (role === 'teacher') {
      // Teacher sees their own classes
      console.log("Fetching teacher classes...");
      const q = query(collection(db, "classes"), where("teacherId", "==", auth.currentUser?.uid));
      const querySnapshot = await getDocs(q);
      classesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classesList);
      console.log("Teacher classes found:", classesList.length);
      
      // Teacher sees assignments from THEIR classes
      let allAssignments = [];
      
      // If teacher has classes, get assignments for each class
      if (classesList.length > 0) {
        for (const classItem of classesList) {
          console.log("Fetching assignments for class:", classItem.name);
          const assignmentsQuery = query(
            collection(db, "assignments"), 
            where("classId", "==", classItem.id),
            orderBy("createdAt", "desc")
          );
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          const classAssignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          allAssignments = [...allAssignments, ...classAssignments];
        }
      }
      
      // Also get any assignments teacher created directly (by teacherId)
      const teacherAssignmentsQuery = query(
        collection(db, "assignments"), 
        where("teacherId", "==", auth.currentUser?.uid),
        orderBy("createdAt", "desc")
      );
      const teacherAssignmentsSnapshot = await getDocs(teacherAssignmentsQuery);
      const teacherAssignments = teacherAssignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Merge both sets (avoid duplicates)
      const allIds = new Set();
      const mergedAssignments = [...allAssignments, ...teacherAssignments].filter(assignment => {
        if (allIds.has(assignment.id)) return false;
        allIds.add(assignment.id);
        return true;
      });
      
      setAssignments(mergedAssignments);
      console.log("Total teacher assignments found:", mergedAssignments.length);
      
    } else {
      // STUDENT VIEW - Your existing student code
      console.log("Fetching student enrollments...");
      const enrollmentsQuery = query(collection(db, "enrollments"), where("studentId", "==", auth.currentUser?.uid));
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      const classIds = enrollmentsSnapshot.docs.map(doc => doc.data().classId);
      
      console.log("Enrolled class IDs:", classIds);
      
      if (classIds.length === 0) {
        setClasses([]);
        setAssignments([]);
        setLoading(false);
        return;
      }
      
      // Get class details for each enrolled class
      for (const classId of classIds) {
        const classDoc = await getDoc(doc(db, "classes", classId));
        if (classDoc.exists()) {
          classesList.push({ id: classDoc.id, ...classDoc.data() });
        }
      }
      setClasses(classesList);
      
      // Get assignments from enrolled classes
      let allAssignments = [];
      for (const classId of classIds) {
        const assignmentsQuery = query(
          collection(db, "assignments"), 
          where("classId", "==", classId),
          orderBy("dueDate", "asc")
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const classAssignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allAssignments = [...allAssignments, ...classAssignments];
      }
      
      // Get submissions for each assignment
      for (let assignment of allAssignments) {
        const submissionQuery = query(
          collection(db, "submissions"),
          where("assignmentId", "==", assignment.id),
          where("studentId", "==", auth.currentUser?.uid)
        );
        const submissionSnapshot = await getDocs(submissionQuery);
        if (!submissionSnapshot.empty) {
          assignment.userSubmission = submissionSnapshot.docs[0].data();
        }
      }
      
      setAssignments(allAssignments);
      console.log("Assignments found for student:", allAssignments.length);
    }
    
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    setLoading(false);
  }
};


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedClassData = classes.find(c => c.id === formData.classId);
      
      if (editingAssignment) {
        const assignmentRef = doc(db, "assignments", editingAssignment.id);
        await updateDoc(assignmentRef, {
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          totalPoints: parseInt(formData.totalPoints),
          updatedAt: new Date().toISOString()
        });
        alert("Assignment updated successfully!");
      } else {
        await addDoc(collection(db, "assignments"), {
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          totalPoints: parseInt(formData.totalPoints),
          classId: formData.classId,
          className: selectedClassData?.name || '',
          teacherId: auth.currentUser.uid,
          teacherName: userData?.fullName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        alert("Assignment created successfully!");
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving assignment:", error);
      alert("Error saving assignment: " + error.message);
    }
  };

  const handleDelete = async (assignmentId) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      try {
        await deleteDoc(doc(db, "assignments", assignmentId));
        alert("Assignment deleted successfully!");
        fetchData();
      } catch (error) {
        console.error("Error deleting assignment:", error);
        alert("Error deleting assignment: " + error.message);
      }
    }
  };

  const handleSubmitAssignment = async (assignmentId) => {
  if (!submissionText && !submissionFile) {
    alert("Please enter a submission or upload a file");
    return;
  }
  
  setSubmitting(true);
  try {
    let fileUrl = null;
    
    if (submissionFile) {
      // Create a cleaner file path
      const timestamp = Date.now();
      const safeFileName = submissionFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `submissions/${assignmentId}/${auth.currentUser.uid}/${timestamp}_${safeFileName}`;
      const fileRef = ref(storage, filePath);
      
      console.log("Uploading to:", filePath); // Debug log
      
      await uploadBytes(fileRef, submissionFile);
      fileUrl = await getDownloadURL(fileRef);
      console.log("Upload successful, URL:", fileUrl); // Debug log
    }
    
    await addDoc(collection(db, "submissions"), {
      assignmentId: assignmentId,
      studentId: auth.currentUser.uid,
      studentName: userData?.fullName,
      content: submissionText,
      attachments: fileUrl ? [fileUrl] : [],
      submittedAt: new Date().toISOString(),
      status: "submitted",
      grade: null,
      feedback: null
    });
    
    alert("Assignment submitted successfully!");
    setSubmissionText('');
    setSubmissionFile(null);
    setSubmissionAssignmentId(null);
    fetchData();
  } catch (error) {
    console.error("Error submitting assignment:", error);
    alert("Error submitting assignment: " + error.message);
  } finally {
    setSubmitting(false);
  }
};

  const resetForm = () => {
    setShowForm(false);
    setEditingAssignment(null);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      totalPoints: 100,
      classId: '',
      className: ''
    });
  };

  const editAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      dueDate: assignment.dueDate,
      totalPoints: assignment.totalPoints,
      classId: assignment.classId,
      className: assignment.className
    });
    setShowForm(true);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Loading assignments...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>Assignments</h1>
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
            {showForm ? "Cancel" : "+ Create New Assignment"}
          </button>
        )}
      </div>

      {/* Show message if student has no classes */}
      {role === 'student' && classes.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: 60,
          background: COLORS.white,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <p style={{ color: COLORS.textMuted }}>
            You're not enrolled in any classes yet. 
            Go to "My Classes" and enroll in a class to see assignments.
          </p>
        </div>
      )}

      {/* Create/Edit Assignment Form (Teachers only) */}
      {showForm && role === 'teacher' && (
        <div style={{
          background: COLORS.white,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          border: `1px solid ${COLORS.border}`
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            {editingAssignment ? "Edit Assignment" : "Create New Assignment"}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Assignment Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                rows="4"
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
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Class *</label>
                <select
                  required
                  value={formData.classId}
                  onChange={(e) => {
                    const selected = classes.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      classId: e.target.value,
                      className: selected?.name || ''
                    });
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    fontSize: 14
                  }}
                >
                  <option value="">Select a class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Due Date *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
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

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Total Points</label>
              <input
                type="number"
                value={formData.totalPoints}
                onChange={(e) => setFormData({...formData, totalPoints: e.target.value})}
                min="0"
                step="1"
                style={{
                  width: "200px",
                  padding: "10px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
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
                {editingAssignment ? "Update Assignment" : "Create Assignment"}
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

      {/* Assignments List */}
      {assignments.length === 0 && role === 'student' && classes.length > 0 ? (
        <div style={{
          textAlign: "center",
          padding: 60,
          background: COLORS.white,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <p style={{ color: COLORS.textMuted }}>
            No assignments have been posted for your classes yet. Check back later!
          </p>
        </div>
      ) : assignments.length === 0 && role === 'teacher' ? (
        <div style={{
          textAlign: "center",
          padding: 60,
          background: COLORS.white,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <p style={{ color: COLORS.textMuted }}>
            You haven't created any assignments yet. Click 'Create New Assignment' to get started!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {assignments.map(assignment => {
            const isOverdue = new Date(assignment.dueDate) < new Date();
            const submitted = assignment.userSubmission?.status === "submitted";
            const graded = assignment.userSubmission?.grade !== null;
            
            return (
              <div
                key={assignment.id}
                style={{
                  background: COLORS.white,
                  borderRadius: 16,
                  border: `1px solid ${COLORS.border}`,
                  overflow: "hidden"
                }}
              >
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 4 }}>{assignment.title}</h3>
                      <div style={{ fontSize: 13, color: COLORS.textMuted }}>{assignment.className}</div>
                    </div>
                    {role === 'teacher' && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => editAssignment(assignment)}
                          style={{
                            padding: "4px 12px",
                            background: COLORS.primaryLight,
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            color: COLORS.primaryDark
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id)}
                          style={{
                            padding: "4px 12px",
                            background: COLORS.dangerLight,
                            border: "none",
                            borderRadius: 6,
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
                  
                  {assignment.description && (
                    <p style={{ fontSize: 13, color: COLORS.text, marginBottom: 12 }}>
                      {assignment.description}
                    </p>
                  )}
                  
                  <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, color: COLORS.textMuted, flexWrap: "wrap" }}>
                    <div>
                      <strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()} at {new Date(assignment.dueDate).toLocaleTimeString()}
                      {isOverdue && !submitted && (
                        <span style={{ color: COLORS.danger, marginLeft: 8 }}>⚠️ Overdue</span>
                      )}
                    </div>
                    <div>
                      <strong>Points:</strong> {assignment.totalPoints}
                    </div>
                    {role === 'teacher' && (
                      <div>
                        <strong>Created by:</strong> {assignment.teacherName}
                      </div>
                    )}
                  </div>
                  
                  {role === 'student' && (
                    <div style={{ marginTop: 16 }}>
                      {submitted ? (
                        <div style={{
                          padding: 12,
                          background: graded ? COLORS.successLight : COLORS.warningLight,
                          borderRadius: 8
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            {graded ? `✓ Graded: ${assignment.userSubmission.grade}/${assignment.totalPoints}` : "✓ Submitted - Pending Review"}
                          </div>
                          {assignment.userSubmission.feedback && (
                            <div style={{ fontSize: 13, marginTop: 8 }}>
                              <strong>Feedback:</strong> {assignment.userSubmission.feedback}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{
                          background: COLORS.grayLight,
                          padding: 16,
                          borderRadius: 8
                        }}>
                          {submissionAssignmentId === assignment.id ? (
                            <>
                              <textarea
                                placeholder="Write your submission here..."
                                value={submissionText}
                                onChange={(e) => setSubmissionText(e.target.value)}
                                rows="3"
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  border: `1px solid ${COLORS.border}`,
                                  borderRadius: 8,
                                  fontSize: 14,
                                  marginBottom: 12,
                                  resize: "vertical"
                                }}
                              />
                              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                <label style={{
                                  padding: "8px 16px",
                                  background: COLORS.white,
                                  border: `1px solid ${COLORS.border}`,
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontSize: 13
                                }}>
                                  📎 Upload File
                                  <input
                                    type="file"
                                    hidden
                                    onChange={(e) => setSubmissionFile(e.target.files[0])}
                                  />
                                </label>
                                {submissionFile && (
                                  <span style={{ fontSize: 12, color: COLORS.success }}>
                                    Selected: {submissionFile.name}
                                  </span>
                                )}
                                <button
                                  onClick={() => handleSubmitAssignment(assignment.id)}
                                  disabled={submitting}
                                  style={{
                                    padding: "8px 24px",
                                    background: COLORS.primary,
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    fontWeight: 600,
                                    opacity: submitting ? 0.7 : 1
                                  }}
                                >
                                  {submitting ? "Submitting..." : "Submit"}
                                </button>
                                <button
                                  onClick={() => {
                                    setSubmissionAssignmentId(null);
                                    setSubmissionText('');
                                    setSubmissionFile(null);
                                  }}
                                  style={{
                                    padding: "8px 16px",
                                    background: COLORS.grayLight,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontSize: 13
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => setSubmissionAssignmentId(assignment.id)}
                              style={{
                                padding: "10px 24px",
                                background: assignment.color || COLORS.primary,
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                cursor: "pointer",
                                fontWeight: 600
                              }}
                            >
                              Submit Assignment
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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

export default AssignmentsManager;