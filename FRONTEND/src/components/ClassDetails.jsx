import { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  getDoc, 
  getDocs,
  doc, 
  updateDoc,
  query,
  where,
  arrayUnion,
  addDoc
} from '../firebase/config';
import { auth } from '../firebase/config';

const COLORS = {
  primary: "#2563EB",
  primaryLight: "#DBEAFE",
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

function ClassDetails({ classId, userData, role, onBack }) {
  const [classData, setClassData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchClassDetails();
  }, [classId]);

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      
      const classDoc = await getDoc(doc(db, "classes", classId));
      if (!classDoc.exists()) {
        alert("Class not found");
        onBack();
        return;
      }
      const classInfo = { id: classDoc.id, ...classDoc.data() };
      setClassData(classInfo);
      
      if (role === 'student') {
        const enrollmentQuery = query(
          collection(db, "enrollments"),
          where("studentId", "==", auth.currentUser?.uid),
          where("classId", "==", classId)
        );
        const enrollmentSnapshot = await getDocs(enrollmentQuery);
        setIsEnrolled(!enrollmentSnapshot.empty);
      }
      
      const assignmentsQuery = query(
        collection(db, "assignments"),
        where("classId", "==", classId)
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignmentsList = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(assignmentsList);
      
      if (role === 'teacher' && classInfo.enrolledStudents?.length > 0) {
        const studentsList = [];
        for (const studentId of classInfo.enrolledStudents) {
          const userDoc = await getDoc(doc(db, "users", studentId));
          if (userDoc.exists()) {
            studentsList.push({ id: studentId, ...userDoc.data() });
          }
        }
        setStudents(studentsList);
      }
      
    } catch (error) {
      console.error("Error fetching class details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!auth.currentUser) return;
    
    setEnrolling(true);
    try {
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("studentId", "==", auth.currentUser.uid),
        where("classId", "==", classId)
      );
      const existing = await getDocs(enrollmentQuery);
      
      if (!existing.empty) {
        alert("You are already enrolled in this class!");
        setIsEnrolled(true);
        setEnrolling(false);
        return;
      }
      
      await addDoc(collection(db, "enrollments"), {
        studentId: auth.currentUser.uid,
        studentName: userData?.fullName,
        classId: classId,
        enrolledAt: new Date().toISOString(),
        status: "active"
      });
      
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, {
        enrolledStudents: arrayUnion(auth.currentUser.uid)
      });
      
      alert("Successfully enrolled in class!");
      setIsEnrolled(true);
      fetchClassDetails();
      
    } catch (error) {
      console.error("Error enrolling:", error);
      alert("Error enrolling in class: " + error.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleJoinClass = () => {
    if (classData?.meetLink) {
      window.open(classData.meetLink, '_blank');
    } else {
      alert("No meeting link has been set for this class yet. Please contact your teacher.");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <div style={{ fontSize: 18, color: COLORS.textMuted }}>Loading class details...</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <div style={{ fontSize: 18, color: COLORS.textMuted }}>Class not found</div>
        <button onClick={onBack} style={{ marginTop: 20, padding: "10px 20px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Go Back</button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          color: COLORS.primary,
          cursor: "pointer",
          fontSize: 14,
          marginBottom: 20,
          padding: 0
        }}
      >
        ← Back to Classes
      </button>

      <div style={{
        background: `linear-gradient(135deg, ${classData.color || COLORS.primary} 0%, ${classData.color || COLORS.primary}CC 100%)`,
        borderRadius: 24,
        padding: 32,
        marginBottom: 24,
        color: "#fff"
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 8 }}>{classData.name}</h1>
        <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 16 }}>{classData.description}</p>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
          <div>👨‍🏫 Teacher: {classData.teacherName}</div>
          <div>📚 {classData.grade}</div>
          <div>📅 {classData.schedule}</div>
          {classData.meetLink && <div>🎥 Google Meet Available</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {role === 'student' && isEnrolled && classData.meetLink && (
          <button
            onClick={handleJoinClass}
            style={{
              flex: 1,
              padding: "14px",
              background: "#10B981",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            🎥 Join Live Class
          </button>
        )}
        
        {role === 'student' && !isEnrolled && (
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            style={{
              flex: 1,
              padding: "14px",
              background: classData.color || COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: enrolling ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 16,
              opacity: enrolling ? 0.7 : 1
            }}
          >
            {enrolling ? "Enrolling..." : "🔗 Enroll in Class"}
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📝 Assignments</h2>
          {assignments.length === 0 ? (
            <div style={{
              background: COLORS.white,
              borderRadius: 16,
              padding: 40,
              textAlign: "center",
              border: `1px solid ${COLORS.border}`
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <p style={{ color: COLORS.textMuted }}>No assignments yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {assignments.map(assignment => (
                <div key={assignment.id} style={{
                  background: COLORS.white,
                  borderRadius: 12,
                  padding: 16,
                  border: `1px solid ${COLORS.border}`
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{assignment.title}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.primary }}>
                    Points: {assignment.totalPoints}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {role === 'teacher' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>👥 Enrolled Students ({students.length})</h2>
            {students.length === 0 ? (
              <div style={{
                background: COLORS.white,
                borderRadius: 16,
                padding: 40,
                textAlign: "center",
                border: `1px solid ${COLORS.border}`
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👨‍🎓</div>
                <p style={{ color: COLORS.textMuted }}>No students enrolled yet</p>
              </div>
            ) : (
              <div style={{
                background: COLORS.white,
                borderRadius: 16,
                border: `1px solid ${COLORS.border}`,
                overflow: "hidden"
              }}>
                {students.map((student, index) => (
                  <div key={student.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: index < students.length - 1 ? `1px solid ${COLORS.border}` : "none"
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: COLORS.primaryLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      color: COLORS.primary
                    }}>
                      {student.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{student.fullName}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>{student.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {role === 'student' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📋 Class Information</h2>
            <div style={{
              background: COLORS.white,
              borderRadius: 16,
              padding: 20,
              border: `1px solid ${COLORS.border}`
            }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Teacher</div>
                <div style={{ fontWeight: 500 }}>{classData.teacherName}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Grade Level</div>
                <div style={{ fontWeight: 500 }}>{classData.grade}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Schedule</div>
                <div style={{ fontWeight: 500 }}>{classData.schedule}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Status</div>
                <div>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    background: isEnrolled ? COLORS.successLight : COLORS.warningLight,
                    color: isEnrolled ? COLORS.success : COLORS.warning,
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {isEnrolled ? "Enrolled" : "Not Enrolled"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClassDetails;