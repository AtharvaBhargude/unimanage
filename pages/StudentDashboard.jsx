import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout.jsx';
import { Card, Button, Input, Badge, Select } from '../components/UI.jsx';
import { ApiService } from '../services/api.js';
import { CheckCircle, MessageSquare, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Menu, X, Clock, LogOut, Link, FileText, Save } from 'lucide-react';

export const StudentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('PROJECT');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ collegeYear: '', semester: '' });

  useEffect(() => {
    // Check if user has Year/Sem
    if ((!user.collegeYear || !user.semester) && user.role === 'STUDENT') {
       setShowProfileModal(true);
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!profileData.collegeYear || !profileData.semester) return alert("Please select both Year and Semester.");
    const updatedUser = await ApiService.updateUser(user.id, {
      collegeYear: parseInt(profileData.collegeYear),
      semester: parseInt(profileData.semester)
    });
    // Normally we'd update parent state or context, but for now just hide modal and alert
    alert("Profile Updated. Please refresh if changes don't appear immediately.");
    setShowProfileModal(false);
    window.location.reload(); // Simple reload to sync user state in App.js
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Student Dashboard">
      {/* Profile Header Info */}
      <div className="mb-4 px-4">
         <div className="text-sm font-semibold text-gray-500">
            {user.collegeYear ? `${user.collegeYear} Year` : 'Year N/A'} • {user.semester ? `Semester ${user.semester}` : 'Sem N/A'}
         </div>
         {(!user.collegeYear || !user.semester) && (
            <button onClick={() => setShowProfileModal(true)} className="text-xs text-indigo-600 underline">Update Profile</button>
         )}
      </div>

      <div className="student-tabs">
        {['PROJECT', 'GROUPS', 'TEST'].map(tab => (
           <button 
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`student-tab-btn ${activeTab === tab ? 'active' : ''}`}
           >
             {tab}
           </button>
        ))}
      </div>

      <div className="animate-fadeIn">
        {activeTab === 'PROJECT' && <ProjectTab user={user} />}
        {activeTab === 'GROUPS' && <GroupsTab user={user} />}
        {activeTab === 'TEST' && <TestTab user={user} />}
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-lg max-w-sm w-full">
              <h3 className="font-bold text-lg mb-4">Complete Your Profile</h3>
              <p className="text-sm text-gray-500 mb-4">Please enter your current academic details.</p>
              <div className="space-y-3">
                 <Select 
                    label="College Year"
                    options={['1','2','3','4'].map(y => ({value:y, label: `${y} Year`}))}
                    value={profileData.collegeYear}
                    onChange={e => setProfileData({...profileData, collegeYear: e.target.value})}
                 />
                 <Select 
                    label="Semester"
                    options={['1','2','3','4','5','6','7','8'].map(s => ({value:s, label: `Semester ${s}`}))}
                    value={profileData.semester}
                    onChange={e => setProfileData({...profileData, semester: e.target.value})}
                 />
                 <Button className="w-full" onClick={handleProfileUpdate}>Save Profile</Button>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

const ProjectTab = ({ user }) => {
  const [myAssignment, setMyAssignment] = useState(null);
  const [project, setProject] = useState(null);
  const [chats, setChats] = useState([]);
  const [msg, setMsg] = useState('');
  const [submission, setSubmission] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [isMarksSubmitted, setIsMarksSubmitted] = useState(false);
  const [daysLeft, setDaysLeft] = useState(null);
  const bottomRef = useRef(null);
  const prevChatCountRef = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      const assign = await ApiService.getAssignmentForStudent(user.username);
      if (assign) {
        setMyAssignment(assign);
        const proj = await ApiService.getProjectById(assign.projectId);
        setProject(proj || null);
        setProgress(assign.progress || 0);
        
        // Calculate days left
        if (proj && proj.dueDate) {
           const due = new Date(proj.dueDate);
           const diff = due - new Date();
           const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
           setDaysLeft(days);
        }

        const subs = await ApiService.getSubmissions();
        const sub = subs.find(s => s.assignmentId === assign.id);
        setSubmission(sub || null);

        // Check if marks submitted
        const marks = await ApiService.getMarks();
        const markEntry = marks.find(m => m.projectId === proj.id && m.groupId === assign.groupId);
        if (markEntry && markEntry.isSubmittedToAdmin) {
           setIsMarksSubmitted(true);
        }
      }
    };
    fetchData();
  }, [user.username]);

  useEffect(() => {
    if(!myAssignment) return;
    const refresh = async () => {
       const allChats = await ApiService.getChats();
       setChats(allChats.filter(c => c.targetId === myAssignment.groupId && c.targetType === 'GROUP'));
    };
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [myAssignment]);

  // Only scroll when new messages are added, not on every refresh
  useEffect(() => {
    if (chats.length !== prevChatCountRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
      prevChatCountRef.current = chats.length;
    }
  }, [chats]);

  const updateProgress = async () => {
     if(!myAssignment) return;
     await ApiService.updateAssignment(myAssignment.id, { progress: parseInt(progress) });
     alert("Status Updated!");
  };

  const sendChat = async () => {
    if (!msg || !myAssignment) return;
    await ApiService.addChat({
      id: `c${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      targetId: myAssignment.groupId,
      targetType: 'GROUP',
      message: msg,
      timestamp: new Date().toISOString()
    });
    setMsg('');
  };

  const deleteMessage = async (id) => {
    await ApiService.deleteChat(id);
    setChats(prev => prev.filter(c => c.id !== id));
  };

  const submitProject = async (e) => {
    e.preventDefault();
    if (daysLeft < 0) return alert("Deadline passed. Cannot submit.");
    if(myAssignment) {
      if (!fileUrl && !fileName) return alert("Please provide a link or upload a file.");
      
      await ApiService.addSubmission({
        id: `s${Date.now()}`,
        assignmentId: myAssignment.id,
        submittedBy: user.username,
        submissionDate: new Date().toISOString(),
        link: fileUrl,
        fileName: fileName
      });
      setSubmission({ id: `s${Date.now()}`, submissionDate: new Date().toISOString(), link: fileUrl, fileName }); 
      alert("Submitted!");
    }
  };

  const unsubmitProject = async () => {
    if (!submission) return;
    if (isMarksSubmitted) return alert("Teacher has already graded this project. Cannot unsubmit.");
    if (daysLeft < 0) return alert("Deadline passed. Cannot unsubmit.");
    
    await ApiService.deleteSubmission(submission.id);
    setSubmission(null);
    alert("Submission removed. You can submit again.");
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  if (!project) return <Card><div className="text-center py-10">No project assigned yet.</div></Card>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        {daysLeft !== null && daysLeft <= 1 && daysLeft >= 0 && (
           <div className="bg-red-100 text-red-800 p-3 rounded-lg flex items-center gap-2 animate-pulse font-bold">
              <AlertTriangle size={20}/> Warning: Project due date is tomorrow!
           </div>
        )}

        <Card title={project.title}>
          <p className="text-gray-600 mb-4">{project.description}</p>
          <div className={`p-3 rounded-lg text-sm mb-4 font-semibold ${daysLeft < 0 ? 'bg-red-100 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>
             Due Date: {project.dueDate} {daysLeft < 0 && "(Overdue)"}
          </div>
          
          <div className="border-t pt-4">
             <label className="font-semibold block mb-2">Update Project Status</label>
             <div className="flex items-center gap-2 mb-2">
                <input type="range" min="0" max="100" value={progress} onChange={e => setProgress(e.target.value)} className="flex-1"/>
                <span className="font-mono w-10 text-right">{progress}%</span>
             </div>
             <Button size="sm" variant="outline" onClick={updateProgress}><Save size={14}/> Save Status</Button>
          </div>
        </Card>

        <Card title="Submission">
          {submission ? (
             <div>
                <div className="text-green-600 flex items-center gap-2 mb-4"><CheckCircle /> Submitted on {new Date(submission.submissionDate).toLocaleDateString()}</div>
                {!isMarksSubmitted && daysLeft >= 0 && (
                   <Button variant="danger" size="sm" onClick={unsubmitProject}>Unsubmit</Button>
                )}
                {isMarksSubmitted && <div className="text-xs text-gray-500 mt-2">Grading Locked by Teacher</div>}
             </div>
          ) : (
            <form onSubmit={submitProject} className="space-y-4">
               {daysLeft < 0 ? (
                  <div className="text-center text-red-600 font-bold py-4">Submission Closed</div>
               ) : (
                 <>
                   <div>
                     <label className="ui-label">Project Link</label>
                     <div className="flex items-center gap-2">
                       <Link size={16} className="text-gray-400"/>
                       <Input placeholder="https://..." value={fileUrl} onChange={e => setFileUrl(e.target.value)} className="mb-0" />
                     </div>
                   </div>
                   
                   <div className="text-center text-sm text-gray-400">- OR -</div>

                   <div>
                     <label className="ui-label">Upload File</label>
                     <div className="flex items-center gap-2">
                       <FileText size={16} className="text-gray-400"/>
                       <input type="file" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                     </div>
                   </div>

                   <Button type="submit" className="w-full mt-2">Submit Project</Button>
                 </>
               )}
            </form>
          )}
        </Card>
      </div>

      <Card title="Guide Chat" className="h-[500px] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 mb-4">
           {chats.map(c => (
             <div key={c.id} className={`max-w-[80%] p-3 rounded-lg shadow-sm group relative ${c.senderId === user.id ? 'ml-auto bg-indigo-100 dark:bg-indigo-900 text-gray-900 dark:text-gray-100' : 'mr-auto bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
               <div className="flex justify-between items-start gap-2">
                 <div className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">{c.senderName}</div>
                 {c.senderId === user.id && (
                    <button onClick={() => deleteMessage(c.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={12} />
                    </button>
                 )}
               </div>
               <div>{c.message}</div>
               <div className="text-[10px] text-gray-400 dark:text-gray-500 text-right">{new Date(c.timestamp).toLocaleTimeString()}</div>
             </div>
           ))}
           <div ref={bottomRef} />
        </div>
        <div className="flex gap-2">
          <Input placeholder="Ask your guide..." value={msg} onChange={e => setMsg(e.target.value)} className="flex-1" />
          <Button onClick={sendChat}><MessageSquare size={18} /></Button>
        </div>
      </Card>
    </div>
  );
};

const GroupsTab = ({ user }) => {
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [joinKey, setJoinKey] = useState('');
  const [activeGroup, setActiveGroup] = useState(null);
  const bottomRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    fetchMyGroups();
  }, []);

  // Only scroll when new messages are added, not on every refresh
  useEffect(() => {
    if (!activeGroup) return;
    const msgCount = activeGroup.messages?.length || 0;
    if (msgCount !== prevMessageCountRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
      prevMessageCountRef.current = msgCount;
    }
  }, [activeGroup?.messages]);

  const fetchMyGroups = async () => {
    const all = await ApiService.getClassroomGroups();
    setJoinedGroups(all.filter(g => g.studentIds.includes(user.id)));
  };

  const joinGroup = async () => {
    const all = await ApiService.getClassroomGroups();
    const group = all.find(g => g.joinKey === joinKey.toUpperCase());
    if (!group) return alert("Invalid Key");
    
    if (group.studentIds.includes(user.id)) return alert("Already joined");

    await ApiService.updateClassroomGroup(group.id, {
      ...group,
      studentIds: [...group.studentIds, user.id]
    });
    alert("Joined successfully!");
    setJoinKey('');
    fetchMyGroups();
  };

  const leaveGroup = async (g) => {
    if(!window.confirm("Leave group?")) return;
    await ApiService.updateClassroomGroup(g.id, {
      ...g,
      studentIds: g.studentIds.filter(id => id !== user.id)
    });
    fetchMyGroups();
    setActiveGroup(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="My Groups">
         <div className="flex gap-2 mb-4">
           <Input placeholder="Enter Key" value={joinKey} onChange={e => setJoinKey(e.target.value)} className="mb-0" />
           <Button onClick={joinGroup}>Join</Button>
         </div>
         <div className="space-y-2">
           {joinedGroups.map(g => (
             <div key={g.id} className="p-3 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => setActiveGroup(g)}>
                <div className="font-bold">{g.name}</div>
                <div className="text-xs text-gray-500">Teacher: {g.teacherName}</div>
             </div>
           ))}
         </div>
      </Card>

      <div className="lg:col-span-2">
        {activeGroup ? (
           <Card title={activeGroup.name}>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <span>Teacher Announcements</span>
                 <Button variant="danger" size="sm" onClick={() => leaveGroup(activeGroup)}><LogOut size={16}/> Leave</Button>
              </div>
              <div className="space-y-3 h-[400px] overflow-y-auto">
                 {activeGroup.messages?.length > 0 ? activeGroup.messages.map((m, i) => (
                   <div key={i} className="bg-indigo-50 p-3 rounded border border-indigo-100">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold text-indigo-700">{m.senderName}</span>
                        <span className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleString()}</span>
                      </div>
                      <p>{m.message}</p>
                   </div>
                 )) : <p className="text-center text-gray-400">No messages yet.</p>}
                 <div ref={bottomRef} />
              </div>
              {/* No Input for Students */}
              <div className="p-2 bg-gray-100 text-xs text-center text-gray-500 mt-2 rounded">
                 Read Only Channel
              </div>
           </Card>
        ) : (
          <Card><div className="text-center py-10 text-gray-400">Select a group to view announcements</div></Card>
        )}
      </div>
    </div>
  );
};

const TestTab = ({ user }) => {
  const [availableTests, setAvailableTests] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [confirmingQuiz, setConfirmingQuiz] = useState(null);

  useEffect(() => {
    if (user.division && user.department) {
      const load = async () => {
         const assignments = await ApiService.getTestAssignments();
         // Find assignments matching student's div/dept and are active
         const myTests = assignments.filter(a => 
            a.division === user.division && 
            a.department === user.department && 
            a.isActive
         );

         // Fetch full quiz details for active assignments
         const allQuizzes = await ApiService.getQuizzes();
         const fullTests = myTests.map(a => {
            const q = allQuizzes.find(quiz => quiz.id === a.quizId);
            // Check Year/Sem matching if user has it set
            if (user.collegeYear && q.collegeYear && user.collegeYear !== q.collegeYear) return null;
            if (user.semester && q.semester && user.semester !== q.semester) return null;
            return q ? { ...q, assignmentId: a.id } : null;
         }).filter(Boolean);

         setAvailableTests(fullTests);
      };
      const int = setInterval(load, 5000); // Poll for new tests
      load();
      return () => clearInterval(int);
    }
  }, [user.division, user.department, user.collegeYear, user.semester]);

  const initiateTest = async (q) => {
    const results = await ApiService.getQuizResults();
    // Check if student already took THIS quiz
    const existingResult = results.find(r => r.quizId === q.id && r.studentId === user.id);
    if(existingResult) {
       alert(`You have already submitted this test.\nScore: ${existingResult.score} / ${existingResult.totalQuestions}`);
       return;
    }
    setConfirmingQuiz(q);
  };

  const startTestConfirmed = () => {
    if (!confirmingQuiz) return;
    const q = confirmingQuiz;
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(console.error);
    setActiveQuiz(q);
    setConfirmingQuiz(null);
  };

  return (
    <>
      <Card title="Available Tests">
         {availableTests.length > 0 ? (
           <div className="grid gap-4">
             {availableTests.map(q => (
               <div key={q.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                 <div>
                   <h4 className="font-bold">{q.title}</h4>
                   <p className="text-sm text-gray-500">{q.questions.length} Questions | {q.timeLimit} Mins</p>
                 </div>
                 <Button onClick={() => initiateTest(q)}>Start Test</Button>
               </div>
             ))}
           </div>
         ) : <div className="text-center text-gray-400 py-10">No active tests available for your class.</div>}
      </Card>

      {confirmingQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
           <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center">
                 <h3 className="text-xl font-bold mb-2">{confirmingQuiz.title}</h3>
                 <p className="text-gray-600 mb-6">
                   Time Limit: {confirmingQuiz.timeLimit} Minutes.<br/>
                   Fullscreen required. Tab switching is monitored.
                 </p>
                 <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setConfirmingQuiz(null)} className="flex-1">Cancel</Button>
                    <Button onClick={startTestConfirmed} className="flex-1">Start Now</Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeQuiz && <FullScreenQuiz quiz={activeQuiz} user={user} onClose={() => setActiveQuiz(null)} />}
    </>
  );
};

const FullScreenQuiz = ({ quiz, user, onClose }) => {
  const [answers, setAnswers] = useState({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
  const [isSidebarOpen, setSidebarOpen] = useState(true); // Default open to show navigation
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if(prev <= 1) {
          clearInterval(timer);
          handleSubmit(true, 'TIMEOUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Violation Monitoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolationCount(prev => {
          const newCount = prev + 1;
          recordViolation(newCount);
          if (newCount > 3) {
            handleSubmit(true, 'VIOLATION_AUTO_SUBMIT');
          } else {
            triggerWarning();
          }
          return newCount;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const triggerWarning = () => {
    setShowViolationWarning(true);
    setTimeout(() => {
      setShowViolationWarning(false);
    }, 10000);
  };

  const recordViolation = async (count) => {
    await ApiService.addViolation({
      id: `v${Date.now()}`,
      quizId: quiz.id,
      studentName: user.fullName,
      testName: quiz.title,
      timestamp: new Date().toISOString()
    });
  };

  const handleSubmit = async (auto = false, reason = 'NORMAL') => {
    if(!auto && !confirm("Submit Test?")) return;

    let score = 0;
    quiz.questions.forEach(q => {
       if(answers[q.id] === q.correctOption) score++;
    });

    await ApiService.addQuizResult({
      id: `r${Date.now()}`,
      quizId: quiz.id,
      quizTitle: quiz.title,
      studentId: user.id,
      studentName: user.fullName,
      // Store current details as snapshot
      prn: user.prn,
      division: user.division,
      department: user.department,
      collegeYear: user.collegeYear,
      semester: user.semester,
      
      score: score,
      totalQuestions: quiz.questions.length,
      date: new Date().toISOString(),
      submissionType: reason
    });

    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    
    if (reason === 'VIOLATION_AUTO_SUBMIT') {
      alert("Test Auto-Submitted due to multiple tab switching violations!");
    } else if (reason === 'TIMEOUT') {
      alert("Time is up! Test Submitted.");
    } else {
      alert(`Test Submitted!\nYour Score: ${score} / ${quiz.questions.length}`);
    }
    
    onClose();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQuestion = quiz.questions[currentQIndex];

  return (
    <div className="quiz-container">
       {/* Warning Overlay */}
       {showViolationWarning && (
         <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg z-[100] flex items-center gap-3 animate-bounce">
            <AlertTriangle size={24} />
            <div>
              <div className="font-bold">Tab Switch Detected! ({violationCount}/3)</div>
              <div className="text-xs">Do not switch tabs or test will auto-submit.</div>
            </div>
         </div>
       )}

       {/* Mobile Header Toggle */}
       <div className="mobile-toggle bg-white z-50">
          <div className="font-bold flex items-center gap-2">
             <Clock size={16} className={timeLeft < 60 ? "text-red-500" : "text-gray-700"} /> 
             {formatTime(timeLeft)}
          </div>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
       </div>

       <div className={`quiz-sidebar ${isSidebarOpen ? 'mobile-expanded' : 'mobile-collapsed'}`}>
          <div className="p-4 border-b hidden md:flex justify-between items-center bg-gray-50">
             <div>
               <div className="font-bold text-lg mb-1 truncate w-40" title={quiz.title}>{quiz.title}</div>
               {/* Timer fixed here */}
               <div className="flex items-center gap-2 font-mono text-xl text-indigo-600">
                  <Clock size={20}/> {formatTime(timeLeft)}
               </div>
             </div>
             {/* Minimize Button */}
             <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 md:block hidden p-2">
               <ChevronLeft />
             </button>
          </div>
          
          {/* Collapsed View Indicator */}
          {!isSidebarOpen && (
             <button onClick={() => setSidebarOpen(true)} className="p-4 text-center w-full hover:bg-gray-200 hidden md:block border-b">
               <ChevronRight />
             </button>
          )}

          {isSidebarOpen && (
            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Question Navigator</h4>
               <div className="question-grid">
                  {quiz.questions.map((q, idx) => (
                    <button 
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`q-nav-btn ${idx === currentQIndex ? 'active' : (answers[q.id] !== undefined ? 'answered' : '')}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
               </div>
            </div>
          )}
          
          {isSidebarOpen && (
            <div className="p-4 border-t bg-white">
               <Button variant="primary" className="w-full" onClick={() => handleSubmit(false)}>Submit Test</Button>
            </div>
          )}
       </div>

       <div className="quiz-content relative">
          <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center">
             <div className="mb-6">
                <span className="text-gray-400 text-sm uppercase tracking-wide font-bold">Question {currentQIndex + 1}</span>
                <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-2">{currentQuestion.text}</h3>
             </div>
             
             <div className="space-y-3">
                {currentQuestion.options.map((opt, optIdx) => {
                  const isSelected = answers[currentQuestion.id] === optIdx;
                  return (
                    <div 
                      key={optIdx} 
                      onClick={() => setAnswers({...answers, [currentQuestion.id]: optIdx})}
                      className={`option-label ${isSelected ? 'selected' : ''}`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-600' : 'border-gray-400'}`}>
                         {isSelected && <div className="w-3 h-3 rounded-full bg-indigo-600" />}
                      </div>
                      <span className="text-lg">{opt}</span>
                    </div>
                  );
                })}
             </div>

             <div className="flex justify-between mt-8 pt-8 border-t">
                <Button variant="outline" onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))} disabled={currentQIndex === 0}>
                  <ChevronLeft size={16}/> Previous
                </Button>
                <Button onClick={() => setCurrentQIndex(Math.min(quiz.questions.length - 1, currentQIndex + 1))} disabled={currentQIndex === quiz.questions.length - 1}>
                  Next <ChevronRight size={16}/>
                </Button>
             </div>
          </div>
          
          {/* Always visible submit button for mobile/safety */}
          <div className="absolute top-4 right-4 md:hidden">
             <Button size="sm" onClick={() => handleSubmit(false)}>Submit</Button>
          </div>
       </div>
    </div>
  );
};