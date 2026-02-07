import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout.jsx';
import { Card, Badge, Button, Input, Select } from '../components/UI.jsx';
import { ApiService } from '../services/api.js';
import { DIVISIONS, DEPARTMENTS } from '../constants.js';
import { MessageCircle, CheckSquare, Send, Save, Trash2, Clock, PlayCircle, StopCircle, Plus, Users, ArrowRight, Key, AlertTriangle, ChevronLeft, Download, FileText, Link } from 'lucide-react';

export const TeacherDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('TEACHER');

  return (
    <Layout user={user} onLogout={onLogout} title="Teacher Dashboard">
      <div className="teacher-nav">
        <button
          onClick={() => setActiveTab('TEACHER')}
          className={`teacher-nav-btn ${activeTab === 'TEACHER' ? 'active' : ''}`}
        >
          Teacher Tab (Classroom)
        </button>
        <button
          onClick={() => setActiveTab('GUIDE')}
          className={`teacher-nav-btn ${activeTab === 'GUIDE' ? 'active' : ''}`}
        >
          Guide Tab (Projects)
        </button>
      </div>

      <div className="animate-fadeIn">
        {activeTab === 'TEACHER' ? <TeacherTab user={user} /> : <GuideTab user={user} />}
      </div>
    </Layout>
  );
};

const TeacherTab = ({ user }) => {
  const [subTab, setSubTab] = useState('TEST');
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 sub-menu">
        <button onClick={() => setSubTab('TEST')} className={`sub-menu-btn ${subTab === 'TEST' ? 'active' : ''}`}>
          <CheckSquare size={20} />
          <span className="font-semibold">Test Management</span>
        </button>
        <button onClick={() => setSubTab('GROUPS')} className={`sub-menu-btn ${subTab === 'GROUPS' ? 'active' : ''}`}>
          <Users size={20} />
          <span className="font-semibold">Classroom Groups</span>
        </button>
      </div>
      
      <div className="lg:col-span-3">
        {subTab === 'TEST' && <TestManager user={user} />}
        {subTab === 'GROUPS' && <ClassroomGroupsManager user={user} />}
      </div>
    </div>
  );
};

const TestManager = ({ user }) => {
  const [mode, setMode] = useState('CREATE'); // CREATE, ASSIGN, ASSIGNED, SUBMITTED, VIOLATIONS
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [results, setResults] = useState([]);
  const [violations, setViolations] = useState([]);
  const [selectedViolationTest, setSelectedViolationTest] = useState(null);

  useEffect(() => {
    refreshData();
  }, [mode]);

  const refreshData = async () => {
    const [allQuizzes, allAssignments] = await Promise.all([
      ApiService.getQuizzes(),
      ApiService.getTestAssignments()
    ]);
    const teacherQuizzes = allQuizzes.filter(q => q.createdBy === user.id);
    setQuizzes(teacherQuizzes);
    setAssignments(allAssignments.filter(a => a.assignedBy === user.id));
    
    if (mode === 'SUBMITTED') {
      const res = await ApiService.getQuizResults();
      const myQuizIds = teacherQuizzes.map(q => q.id);
      setResults(res.filter(r => myQuizIds.includes(r.quizId)));
    }

    if (mode === 'VIOLATIONS') {
      const allViolations = await ApiService.getViolations();
      // Filter violations based on matching test names
      const myTitles = teacherQuizzes.map(q => q.title);
      setViolations(allViolations.filter(v => myTitles.includes(v.testName)));
    }
  };

  const deleteViolation = async (id) => {
    await ApiService.deleteViolation(id);
    refreshData();
  };

  const deleteAllViolations = async () => {
    if(!window.confirm("Are you sure you want to delete ALL violation records? This cannot be undone.")) return;
    await ApiService.deleteAllViolations();
    refreshData();
  };

  return (
    <Card>
      <div className="flex border-b mb-4 overflow-x-auto">
        {['CREATE', 'ASSIGN', 'ASSIGNED', 'SUBMITTED', 'VIOLATIONS'].map(m => (
          <button 
            key={m} 
            onClick={() => { setMode(m); setSelectedViolationTest(null); }}
            className={`flex-1 py-2 px-4 text-sm font-semibold whitespace-nowrap transition-colors ${mode === m ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'CREATE' && <QuizCreator user={user} quizzes={quizzes} onCreated={() => { refreshData(); }} />}
      {mode === 'ASSIGN' && <QuizAssigner quizzes={quizzes} user={user} onAssigned={() => { refreshData(); setMode('ASSIGNED'); }} />}
      {mode === 'ASSIGNED' && <AssignedTestsList assignments={assignments} onUpdate={refreshData} />}
      {mode === 'SUBMITTED' && <TestResultsList results={results} onUpdate={refreshData} />}
      
      {mode === 'VIOLATIONS' && (
        !selectedViolationTest ? (
          <div className="space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="font-bold text-gray-700">Tests with Violations</h3>
               {violations.length > 0 && (
                 <Button variant="danger" size="sm" onClick={deleteAllViolations}>
                   <Trash2 size={16}/> Delete All
                 </Button>
               )}
             </div>
             {(() => {
                const uniqueTests = [...new Set(violations.map(v => v.testName))];
                if (uniqueTests.length === 0) return <p className="text-gray-500 text-center py-4">No violations recorded.</p>;
                return (
                  <div className="grid gap-3">
                    {uniqueTests.map(testName => {
                       const count = violations.filter(v => v.testName === testName).length;
                       return (
                         <div key={testName} onClick={() => setSelectedViolationTest(testName)} className="p-4 border rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center">
                            <span className="font-bold">{testName}</span>
                            <Badge color="red">{count} Violations</Badge>
                         </div>
                       );
                    })}
                  </div>
                );
             })()}
          </div>
        ) : (
          <div>
             <div className="flex items-center gap-2 mb-4">
               <button onClick={() => setSelectedViolationTest(null)} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft/></button>
               <h3 className="font-bold text-lg">{selectedViolationTest} - Violations</h3>
             </div>
             <div className="table-wrapper">
               <table className="w-full text-sm text-left">
                 <thead className="bg-red-50 text-xs uppercase text-red-700">
                   <tr>
                     <th className="px-4 py-2">Student</th>
                     <th className="px-4 py-2">Timestamp</th>
                     <th className="px-4 py-2">Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   {violations.filter(v => v.testName === selectedViolationTest).map(v => (
                     <tr key={v.id} className="border-b border-red-100 hover:bg-red-50">
                       <td className="px-4 py-2 font-medium text-red-900">{v.studentName}</td>
                       <td className="px-4 py-2 text-xs text-red-600">{new Date(v.timestamp).toLocaleString()}</td>
                       <td><button onClick={() => deleteViolation(v.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16}/></button></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )
      )}
    </Card>
  );
};

const QuizCreator = ({ user, quizzes, onCreated }) => {
  const [quiz, setQuiz] = useState({ title: '', questions: [], timeLimit: 30, collegeYear: '', semester: '' });
  const [currentQ, setCurrentQ] = useState({ text: '', opt1: '', opt2: '', opt3: '', opt4: '', correct: 0 });

  const addQuestion = () => {
    if (!currentQ.text || !currentQ.opt1) return;
    const newQ = {
      id: `q${Date.now()}`,
      text: currentQ.text,
      options: [currentQ.opt1, currentQ.opt2, currentQ.opt3, currentQ.opt4],
      correctOption: currentQ.correct
    };
    setQuiz({ ...quiz, questions: [...(quiz.questions || []), newQ] });
    setCurrentQ({ text: '', opt1: '', opt2: '', opt3: '', opt4: '', correct: 0 });
  };

  const saveQuiz = async () => {
    if (!quiz.title || (quiz.questions?.length || 0) === 0) return alert("Title and questions required.");
    if (!quiz.collegeYear || !quiz.semester) return alert("Year and Semester required.");
    
    await ApiService.addQuiz({
      id: `qz${Date.now()}`,
      title: quiz.title,
      createdBy: user.id,
      questions: quiz.questions,
      timeLimit: parseInt(quiz.timeLimit),
      collegeYear: parseInt(quiz.collegeYear),
      semester: parseInt(quiz.semester)
    });
    alert('Quiz created!');
    setQuiz({ title: '', questions: [], timeLimit: 30, collegeYear: '', semester: '' });
    onCreated();
  };

  const deleteQuiz = async (id) => {
    if(!window.confirm("Delete this quiz template?")) return;
    await ApiService.deleteQuiz(id);
    onCreated();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700">Create New Quiz</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Quiz Title" value={quiz.title} onChange={e => setQuiz({...quiz, title: e.target.value})} />
          <Input label="Time Limit (mins)" type="number" value={quiz.timeLimit} onChange={e => setQuiz({...quiz, timeLimit: e.target.value})} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
             label="College Year" 
             options={['1','2','3','4'].map(y => ({value:y, label:`${y} Year`}))}
             value={quiz.collegeYear} 
             onChange={e => setQuiz({...quiz, collegeYear: e.target.value})} 
          />
          <Select 
             label="Semester" 
             options={['1','2','3','4','5','6','7','8'].map(s => ({value:s, label:`Semester ${s}`}))}
             value={quiz.semester} 
             onChange={e => setQuiz({...quiz, semester: e.target.value})} 
          />
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold mb-3">Add Question</h4>
          <Input className="mb-2" placeholder="Question Text" value={currentQ.text} onChange={e => setCurrentQ({...currentQ, text: e.target.value})} />
          <div className="grid grid-cols-2 gap-2 mb-2">
              <Input placeholder="Option 1" value={currentQ.opt1} onChange={e => setCurrentQ({...currentQ, opt1: e.target.value})} />
              <Input placeholder="Option 2" value={currentQ.opt2} onChange={e => setCurrentQ({...currentQ, opt2: e.target.value})} />
              <Input placeholder="Option 3" value={currentQ.opt3} onChange={e => setCurrentQ({...currentQ, opt3: e.target.value})} />
              <Input placeholder="Option 4" value={currentQ.opt4} onChange={e => setCurrentQ({...currentQ, opt4: e.target.value})} />
          </div>
          <Select label="Correct Option" options={[{value:'0', label:'Option 1'}, {value:'1', label:'Option 2'}, {value:'2', label:'Option 3'}, {value:'3', label:'Option 4'}]} value={currentQ.correct} onChange={e => setCurrentQ({...currentQ, correct: parseInt(e.target.value)})} />
          <Button onClick={addQuestion} variant="secondary" className="mt-2 w-full">Add Question</Button>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Questions ({quiz.questions?.length})</h4>
          <Button onClick={saveQuiz} className="w-full">Create Quiz Template</Button>
        </div>
      </div>

      <div className="border-t pt-6">
         <h3 className="font-semibold text-gray-700 mb-4">My Created Quizzes</h3>
         <div className="space-y-2 max-h-60 overflow-y-auto">
            {quizzes.map(q => (
              <div key={q.id} className="p-3 border rounded flex justify-between items-center bg-white">
                 <div>
                    <div className="font-bold">{q.title}</div>
                    <div className="text-xs text-gray-500">
                       {q.questions.length} Qs | {q.timeLimit} Mins | Year {q.collegeYear} Sem {q.semester}
                    </div>
                 </div>
                 <button onClick={() => deleteQuiz(q.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
              </div>
            ))}
            {quizzes.length === 0 && <p className="text-gray-400 text-center">No quizzes created yet.</p>}
         </div>
      </div>
    </div>
  );
};

const QuizAssigner = ({ quizzes, user, onAssigned }) => {
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [filterYear, setFilterYear] = useState('');
  const [filterSem, setFilterSem] = useState('');

  const filteredQuizzes = quizzes.filter(q => {
     if(filterYear && q.collegeYear !== parseInt(filterYear)) return false;
     if(filterSem && q.semester !== parseInt(filterSem)) return false;
     return true;
  });

  const handleAssign = async () => {
    if (!selectedQuiz) return;
    const quiz = quizzes.find(q => q.id === selectedQuiz);
    
    await ApiService.assignTest({
      id: `ta${Date.now()}`,
      quizId: quiz.id,
      quizTitle: quiz.title,
      assignedBy: user.id,
      division,
      department,
      assignedDate: new Date().toISOString(),
      isActive: false
    });
    alert(`Assigned ${quiz.title} to ${department} - Div ${division}`);
    onAssigned();
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 py-4">
       <div className="grid grid-cols-2 gap-4">
          <Select 
             label="Filter Year" 
             options={['1','2','3','4'].map(y => ({value:y, label:`${y} Year`}))}
             value={filterYear} 
             onChange={e => setFilterYear(e.target.value)} 
          />
          <Select 
             label="Filter Semester" 
             options={['1','2','3','4','5','6','7','8'].map(s => ({value:s, label:`Semester ${s}`}))}
             value={filterSem} 
             onChange={e => setFilterSem(e.target.value)} 
          />
       </div>

       <Select 
          label="Select Quiz Template" 
          options={filteredQuizzes.map(q => ({value: q.id, label: `${q.title} (Yr ${q.collegeYear})`}))} 
          value={selectedQuiz} 
          onChange={e => setSelectedQuiz(e.target.value)} 
       />
       
       <div className="grid grid-cols-2 gap-4">
          <Select label="Department" options={DEPARTMENTS.map(d => ({value:d, label:d}))} value={department} onChange={e => setDepartment(e.target.value)} />
          <Select label="Division" options={DIVISIONS.map(d => ({value:d, label:d}))} value={division} onChange={e => setDivision(e.target.value)} />
       </div>
       <Button onClick={handleAssign} className="w-full">Assign to Class</Button>
    </div>
  );
};

const AssignedTestsList = ({ assignments, onUpdate }) => {
  const toggleActive = async (a) => {
    await ApiService.updateTestAssignment(a.id, { isActive: !a.isActive });
    onUpdate();
  };
  
  const deleteAssignment = async (id) => {
    if(!window.confirm("Remove this assignment?")) return;
    await ApiService.deleteTestAssignment(id);
    onUpdate();
  };

  return (
    <div className="space-y-3">
       {assignments.map(a => (
         <div key={a.id} className="p-4 border rounded-lg flex justify-between items-center bg-white">
            <div>
               <h4 className="font-bold">{a.quizTitle}</h4>
               <p className="text-sm text-gray-500">{a.department} - Div {a.division}</p>
            </div>
            <div className="flex items-center gap-2">
               <Button variant={a.isActive ? 'danger' : 'primary'} size="sm" onClick={() => toggleActive(a)}>
                  {a.isActive ? <><StopCircle size={16} /> Stop</> : <><PlayCircle size={16} /> Start Test</>}
               </Button>
               <button onClick={() => deleteAssignment(a.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18}/></button>
            </div>
         </div>
       ))}
       {assignments.length === 0 && <p className="text-center text-gray-500">No tests assigned yet.</p>}
    </div>
  );
};

const TestResultsList = ({ results, onUpdate }) => {
  const [filterDept, setFilterDept] = useState('');
  const [filterDiv, setFilterDiv] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [pruneMonths, setPruneMonths] = useState('');

  const filteredResults = results.filter(r => {
     if(filterDept && r.department !== filterDept) return false;
     if(filterDiv && r.division !== filterDiv) return false;
     if(filterYear && r.collegeYear !== parseInt(filterYear)) return false;
     if(filterSem && r.semester !== parseInt(filterSem)) return false;
     return true;
  });

  const exportCSV = () => {
     if(filteredResults.length === 0) return alert("No data to export");
     const headers = ["College Year", "Semester", "PRN", "Student Name", "Division", "Department", "Test Name", "Score", "Total", "Date"];
     const rows = filteredResults.map(r => [
        r.collegeYear || '',
        r.semester || '',
        r.prn || '',
        r.studentName,
        r.division,
        r.department,
        r.quizTitle,
        r.score,
        r.totalQuestions,
        new Date(r.date).toLocaleDateString()
     ]);
     
     const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
     const blob = new Blob([csvContent], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `results_export.csv`;
     a.click();
  };

  const handlePrune = async () => {
     if(!pruneMonths) return alert("Enter months");
     if(!confirm(`Delete records older than ${pruneMonths} months?`)) return;
     const res = await ApiService.pruneResults(parseInt(pruneMonths));
     alert(`Deleted ${res.deletedCount} old records.`);
     onUpdate();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
         <Select options={DEPARTMENTS.map(d=>({value:d, label:d}))} value={filterDept} onChange={e=>setFilterDept(e.target.value)} label="Dept"/>
         <Select options={DIVISIONS.map(d=>({value:d, label:d}))} value={filterDiv} onChange={e=>setFilterDiv(e.target.value)} label="Div"/>
         <Select options={['1','2','3','4'].map(y=>({value:y, label:`Yr ${y}`}))} value={filterYear} onChange={e=>setFilterYear(e.target.value)} label="Year"/>
         <Select options={['1','2','3','4','5','6','7','8'].map(s=>({value:s, label:`Sem ${s}`}))} value={filterSem} onChange={e=>setFilterSem(e.target.value)} label="Sem"/>
      </div>
      
      <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
         <Button size="sm" variant="secondary" onClick={exportCSV}><Download size={16}/> Export CSV</Button>
         <div className="flex items-center gap-2">
            <input type="number" placeholder="Months old" className="ui-input w-24 py-1" value={pruneMonths} onChange={e=>setPruneMonths(e.target.value)} />
            <Button size="sm" variant="danger" onClick={handlePrune}>Clear Old</Button>
         </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs uppercase">
            <tr>
              <th className="px-4 py-2">PRN</th>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Test</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Yr/Sem</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map(r => (
              <tr key={r.id} className="border-b">
                <td className="px-4 py-2 text-xs font-mono">{r.prn || '-'}</td>
                <td className="px-4 py-2 font-medium">
                   {r.studentName}
                   <div className="text-xs text-gray-400">{r.department} {r.division}</div>
                </td>
                <td className="px-4 py-2">{r.quizTitle}</td>
                <td className="px-4 py-2 text-indigo-600 font-bold">{r.score} / {r.totalQuestions}</td>
                <td className="px-4 py-2">{r.collegeYear ? `Y${r.collegeYear} S${r.semester}` : '-'}</td>
                <td className="px-4 py-2">
                   {r.submissionType === 'VIOLATION_AUTO_SUBMIT' ? 
                      <Badge color="red">Auto</Badge> : 
                      <Badge color="green">Ok</Badge>
                   }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ClassroomGroupsManager = ({ user }) => {
  const [groups, setGroups] = useState([]);
  const [mode, setMode] = useState('GROUPS');
  const [newGroupName, setNewGroupName] = useState('');
  const [joinKey, setJoinKey] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [message, setMessage] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedGroup?.messages]);

  const fetchGroups = async () => {
    const all = await ApiService.getClassroomGroups();
    setGroups(all.filter(g => g.teacherId === user.id || g.studentIds.includes(user.id)));
  };

  const createGroup = async () => {
    if (!newGroupName) return;
    const key = Math.random().toString(36).substring(2, 8).toUpperCase();
    await ApiService.addClassroomGroup({
      id: `cg${Date.now()}`,
      name: newGroupName,
      joinKey: key,
      teacherId: user.id,
      teacherName: user.fullName,
      studentIds: [],
      messages: []
    });
    setNewGroupName('');
    fetchGroups();
    alert(`Group Created! Key: ${key}`);
    setMode('KEYS');
  };

  const deleteGroup = async (g) => {
    if(!window.confirm("Delete group? This will remove it for all members.")) return;
    await ApiService.deleteClassroomGroup(g.id);
    fetchGroups();
    setSelectedGroup(null);
    setMode('GROUPS');
  };

  const joinGroup = async () => {
    const all = await ApiService.getClassroomGroups();
    const group = all.find(g => g.joinKey === joinKey.toUpperCase());
    if (!group) return alert("Invalid Key");
    if (group.teacherId === user.id) return alert("You created this group.");
    if (group.studentIds.includes(user.id)) return alert("Already joined.");
    
    await ApiService.updateClassroomGroup(group.id, {
      ...group,
      studentIds: [...group.studentIds, user.id]
    });
    alert("Joined Group!");
    setJoinKey('');
    fetchGroups();
    setMode('GROUPS');
  };

  const sendMessage = async () => {
    if(!message || !selectedGroup) return;
    const msgData = {
      senderId: user.id,
      senderName: user.fullName,
      role: 'TEACHER',
      message: message,
      timestamp: new Date().toISOString()
    };
    const updated = {
      ...selectedGroup,
      messages: [...(selectedGroup.messages || []), msgData]
    };
    await ApiService.updateClassroomGroup(selectedGroup.id, updated);
    setSelectedGroup(updated);
    setMessage('');
  };

  return (
    <Card title="Classroom Groups">
       <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button variant={mode === 'GROUPS' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('GROUPS')}>My Groups</Button>
          <Button variant={mode === 'CREATE' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('CREATE')}>Create</Button>
          <Button variant={mode === 'KEYS' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('KEYS')}>Group Keys</Button>
          <Button variant={mode === 'JOIN' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('JOIN')}>Join Group</Button>
       </div>

       {mode === 'GROUPS' && (
         <div className="grid gap-3">
            {groups.map(g => (
              <div key={g.id} className="p-3 border rounded bg-white hover:shadow-md cursor-pointer flex justify-between items-center" onClick={() => { setSelectedGroup(g); setMode('CHAT'); }}>
                 <div>
                    <div className="font-bold">{g.name}</div>
                    <div className="text-xs text-gray-500">{g.teacherId === user.id ? 'Created by Me' : `Teacher: ${g.teacherName}`}</div>
                 </div>
                 <div className="flex items-center gap-2">
                   {g.teacherId === user.id && (
                     <button onClick={(e) => { e.stopPropagation(); deleteGroup(g); }} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                   )}
                   <MessageCircle size={20} className="text-indigo-600"/>
                 </div>
              </div>
            ))}
            {groups.length === 0 && <p className="text-gray-400 text-center py-4">No groups yet.</p>}
         </div>
       )}

       {mode === 'CREATE' && (
         <div className="max-w-sm mx-auto py-4 space-y-3">
            <Input label="Group Name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
            <Button onClick={createGroup} className="w-full">Generate Key & Create</Button>
         </div>
       )}

       {mode === 'KEYS' && (
         <div className="space-y-2">
            {groups.filter(g => g.teacherId === user.id).map(g => (
               <div key={g.id} className="p-3 bg-indigo-50 border border-indigo-100 rounded flex justify-between">
                  <span className="font-semibold">{g.name}</span>
                  <span className="font-mono bg-white px-2 rounded border">{g.joinKey}</span>
               </div>
            ))}
            {groups.filter(g => g.teacherId === user.id).length === 0 && <p className="text-center text-gray-400">You haven't created any groups.</p>}
         </div>
       )}

       {mode === 'JOIN' && (
         <div className="max-w-sm mx-auto py-4 space-y-3">
            <Input label="Enter Group Key" value={joinKey} onChange={e => setJoinKey(e.target.value)} />
            <Button onClick={joinGroup} className="w-full">Join Group</Button>
         </div>
       )}

       {mode === 'CHAT' && selectedGroup && (
          <div className="h-[500px] flex flex-col">
             <div className="border-b pb-2 mb-2 flex justify-between items-center">
                <h3 className="font-bold">{selectedGroup.name}</h3>
                <Button size="sm" variant="outline" onClick={() => setMode('GROUPS')}>Back</Button>
             </div>
             <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded mb-4 space-y-3">
                {selectedGroup.messages?.map((m, i) => (
                   <div key={i} className={`p-2 rounded max-w-[80%] ${m.senderId === user.id ? 'ml-auto bg-indigo-100' : 'bg-white border'}`}>
                      <div className="flex justify-between items-baseline gap-2">
                         <span className="font-bold text-xs text-indigo-700">{m.senderName}</span>
                         <span className="text-[10px] text-gray-400">{new Date(m.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm">{m.message}</p>
                   </div>
                ))}
                <div ref={bottomRef} />
             </div>
             <div className="flex gap-2">
                <Input placeholder="Message..." value={message} onChange={e => setMessage(e.target.value)} className="mb-0 flex-1" />
                <Button onClick={sendMessage}><Send size={18}/></Button>
             </div>
          </div>
       )}
    </Card>
  );
};

const GuideTab = ({ user }) => {
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      const allAssignments = await ApiService.getAssignments();
      const allProjects = await ApiService.getProjects();
      const allGroups = await ApiService.getGroups();

      const myProjects = allProjects.filter(p => p.guideId === user.id);
      const myProjectIds = myProjects.map(p => p.id);
      const relevantAssignments = allAssignments.filter(a => myProjectIds.includes(a.projectId));

      const displayData = relevantAssignments.map(a => {
        const project = myProjects.find(p => p.id === a.projectId);
        const group = allGroups.find(g => g.id === a.groupId);
        return {
          id: a.id,
          projectId: project?.id,
          groupId: group?.id,
          title: project?.title,
          leader: group?.groupLeader,
          project
        };
      });
      setAssignedGroups(displayData);
    };
    fetchGroups();
  }, [user.id]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700">My Project Groups</h3>
        {assignedGroups.map(g => (
          <div 
            key={g.id} 
            onClick={() => setSelectedGroup(g.groupId)}
            className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedGroup === g.groupId ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
          >
            <h4 className="font-bold">{g.title}</h4>
            <p className="text-sm opacity-80">Leader: {g.leader}</p>
          </div>
        ))}
      </div>
      
      <div className="lg:col-span-2">
        {selectedGroup ? (
           <GroupWorkspace groupId={selectedGroup} user={user} projectData={assignedGroups.find(g => g.groupId === selectedGroup)} />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed">
            Select a group to manage
          </div>
        )}
      </div>
    </div>
  );
};

const GroupWorkspace = ({ groupId, user, projectData }) => {
  const [chats, setChats] = useState([]);
  const [msg, setMsg] = useState('');
  const [marks, setMarks] = useState('');
  const [rubrics, setRubrics] = useState('');
  const [progress, setProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [markEntry, setMarkEntry] = useState(null);
  const [submission, setSubmission] = useState(null);
  const bottomRef = useRef(null);

  // Sync with student updates (assignment progress)
  const [studentProgress, setStudentProgress] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      const allChats = await ApiService.getChats();
      setChats(allChats.filter(c => c.targetType === 'GROUP' && c.targetId === groupId));
      
      const allMarks = await ApiService.getMarks();
      const existingMark = allMarks.find(m => m.groupId === groupId && m.projectId === projectData.projectId);

      // Check assignment for student progress & submission
      const allAssignments = await ApiService.getAssignments();
      const assign = allAssignments.find(a => a.id === projectData.id);
      if (assign) setStudentProgress(assign.progress || 0);

      const allSubs = await ApiService.getSubmissions();
      const sub = allSubs.find(s => s.assignmentId === projectData.id);
      setSubmission(sub || null);
      
      if (existingMark) {
        setMarkEntry(existingMark);
        setMarks(existingMark.teacherMarks || '');
        setRubrics(existingMark.rubrics || '');
        setProgress(existingMark.progress || 0);
        setIsSubmitted(existingMark.isSubmittedToAdmin);
      } else {
        setMarkEntry(null);
        setMarks('');
        setRubrics('');
        setProgress(0);
        setIsSubmitted(false);
      }
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [groupId, projectData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const sendChat = async () => {
    if (!msg) return;
    await ApiService.addChat({
      id: `c${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      targetId: groupId,
      targetType: 'GROUP',
      message: msg,
      timestamp: new Date().toISOString()
    });
    setMsg('');
  };

  const saveProgress = async () => {
    const entry = {
      id: markEntry?.id || `m${Date.now()}`,
      groupId,
      projectId: projectData.projectId,
      teacherMarks: parseInt(marks) || 0,
      rubrics: rubrics,
      progress: parseInt(progress),
      isSubmittedToAdmin: isSubmitted
    };
    await ApiService.saveMark(entry);
    alert("Draft saved");
  };

  const submitMarks = async () => {
    if (!submission) return alert("Student group has not submitted the project yet.");
    if (!marks || !rubrics) return alert("Marks and Rubrics are required.");
    
    const entry = {
      id: markEntry?.id || `m${Date.now()}`,
      groupId,
      projectId: projectData.projectId,
      teacherMarks: parseInt(marks),
      rubrics: rubrics,
      progress: 100,
      isSubmittedToAdmin: true
    };
    await ApiService.saveMark(entry);
    setIsSubmitted(true);
    setProgress(100);
  };

  const unsubmitMarks = async () => {
    if(!isSubmitted) return;
    const entry = {
      ...markEntry,
      isSubmittedToAdmin: false
    };
    await ApiService.saveMark(entry);
    setIsSubmitted(false);
  };

  return (
    <div className="space-y-6">
      <Card title="Project Tracking & Grading">
         <div className="space-y-4">
           {submission ? (
              <div className="bg-green-50 p-3 rounded text-sm text-green-700 mb-2 flex items-center justify-between">
                 <span>Submitted on {new Date(submission.submissionDate).toLocaleDateString()}</span>
                 <div className="flex gap-2">
                    {submission.link && <a href={submission.link} target="_blank" className="underline flex items-center gap-1"><Link size={14}/> Link</a>}
                    {submission.fileName && <span className="flex items-center gap-1"><FileText size={14}/> {submission.fileName}</span>}
                 </div>
              </div>
           ) : (
              <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-700 mb-2 flex items-center gap-2">
                 <AlertTriangle size={16}/> Student has not submitted project file/link yet.
              </div>
           )}

           <div className="bg-blue-50 p-3 rounded text-sm text-blue-700 mb-2">
             Student Self-Reported Progress: <span className="font-bold">{studentProgress}%</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="ui-label">Marks</label>
                 <Input type="number" value={marks} onChange={e => setMarks(e.target.value)} disabled={isSubmitted} className="mb-0" />
              </div>
              <div>
                 <label className="ui-label">Rubrics / Comments</label>
                 <textarea className="ui-input" rows={1} value={rubrics} onChange={e => setRubrics(e.target.value)} disabled={isSubmitted} />
              </div>
           </div>

           <div className="flex justify-end gap-2 pt-2">
             {!isSubmitted && <Button variant="outline" onClick={saveProgress}>Save Draft</Button>}
             {isSubmitted ? (
               <div className="flex items-center gap-2">
                  <Badge color="green">Submitted to Admin</Badge>
                  <Button size="sm" variant="secondary" onClick={unsubmitMarks}>Unsubmit</Button>
               </div>
             ) : (
               <Button onClick={submitMarks} disabled={!submission}><Save size={16} /> Finalize & Submit</Button>
             )}
           </div>
         </div>
      </Card>

      <Card title={`Chat with ${projectData.leader}'s Group`} className="chat-box">
        <div className="chat-messages">
           {chats.map(c => (
             <div key={c.id} className={`chat-msg ${c.senderId === user.id ? 'ml-auto bg-indigo-50 border-indigo-100 max-w-[80%]' : 'mr-auto max-w-[80%]'}`}>
               <div className="flex justify-between items-baseline gap-2">
                  <div className="chat-sender">{c.senderName}</div>
                  <div className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleTimeString()}</div>
               </div>
               <div className="text-sm">{c.message}</div>
             </div>
           ))}
           <div ref={bottomRef} />
        </div>
        <div className="flex gap-2">
          <Input placeholder="Message group..." value={msg} onChange={e => setMsg(e.target.value)} className="mb-0 flex-1" />
          <Button onClick={sendChat}><Send size={18} /></Button>
        </div>
      </Card>
    </div>
  );
};