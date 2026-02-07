import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout.jsx';
import { Button, Input, Select, Card, Badge } from '../components/UI.jsx';
import { ApiService } from '../services/api.js';
import { DEPARTMENTS, DIVISIONS } from '../constants.js';
import { 
  PlusCircle, Users, BookOpen, ClipboardList, 
  CheckCircle, FileText, UserCheck, MessageSquare, Award, Trash2, Download, Link, Send
} from 'lucide-react';

export const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('ADD_PROJECT');
  const [successMsg, setSuccessMsg] = useState(null);

  const [projects, setProjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  const loadData = async () => {
    try {
      const [p, g, users, a] = await Promise.all([
        ApiService.getProjects(),
        ApiService.getGroups(),
        ApiService.getUsers(),
        ApiService.getAssignments()
      ]);
      setProjects(p);
      setGroups(g);
      setTeachers(users.filter(u => u.role === 'TEACHER'));
      setAssignments(a);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
    loadData();
  };

  const tabs = [
    { id: 'ADD_PROJECT', label: 'Add Proj', icon: PlusCircle },
    { id: 'ASSIGN_PROJECT', label: 'Assign', icon: UserCheck },
    { id: 'CREATE_GROUP', label: 'Group', icon: Users },
    { id: 'VIEW_GUIDE', label: 'Guides', icon: BookOpen },
    { id: 'VIEW_ASSIGNMENTS', label: 'Assigns', icon: ClipboardList },
    { id: 'SUBMITTED_PROJECTS', label: 'Subs', icon: CheckCircle },
    { id: 'CLASSROOM', label: 'Classroom', icon: Users },
    { id: 'USERS', label: 'Users', icon: Users },
    { id: 'CHATS', label: 'Chats', icon: MessageSquare },
    { id: 'MARKS', label: 'Marks', icon: Award }
  ];

  return (
    <Layout user={user} onLogout={onLogout} title="Admin Dashboard">
      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={18} />
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {successMsg && (
        <div className="success-msg animate-fadeIn">
          <CheckCircle size={20} />
          {successMsg}
        </div>
      )}

      <div className="animate-fadeIn">
        {activeTab === 'ADD_PROJECT' && <AddProjectForm teachers={teachers} onSuccess={showSuccess} adminId={user.id} />}
        {activeTab === 'ASSIGN_PROJECT' && <AssignProjectForm projects={projects} groups={groups} adminId={user.id} onSuccess={showSuccess} />}
        {activeTab === 'CREATE_GROUP' && <CreateGroupForm onSuccess={showSuccess} />}
        {activeTab === 'VIEW_GUIDE' && <ViewGuidesTable assignments={assignments} groups={groups} projects={projects} teachers={teachers} />}
        {activeTab === 'VIEW_ASSIGNMENTS' && <ViewAssignmentsList assignments={assignments} groups={groups} projects={projects} />}
        {activeTab === 'SUBMITTED_PROJECTS' && <SubmittedProjectsList assignments={assignments} groups={groups} projects={projects} />}
        {activeTab === 'CLASSROOM' && <AdminClassroomManager user={user} />}
        {activeTab === 'USERS' && <UsersManagement onSuccess={showSuccess} />}
        {activeTab === 'CHATS' && <ChatMonitor teachers={teachers} adminUser={user} />}
        {activeTab === 'MARKS' && <MarksManager onSuccess={showSuccess} />}
      </div>
    </Layout>
  );
};

const AdminClassroomManager = ({ user }) => {
  // Logic virtually identical to Teacher's Classroom manager, but Admin sees ALL groups
  const [groups, setGroups] = useState([]);
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
    setGroups(all); // Admin sees all
  };

  const deleteGroup = async (g) => {
    if(!window.confirm("Delete group? This will remove it for all members.")) return;
    await ApiService.deleteClassroomGroup(g.id);
    fetchGroups();
    setSelectedGroup(null);
  };

  const sendMessage = async () => {
    if(!message || !selectedGroup) return;
    const msgData = {
      senderId: user.id,
      senderName: user.fullName + ' (Admin)',
      role: 'ADMIN',
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
    <Card title="All Classroom Groups">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
         <div className="overflow-y-auto space-y-2 border-r pr-2">
            {groups.map(g => (
              <div key={g.id} className="p-3 border rounded bg-white hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedGroup(g)}>
                 <div className="flex justify-between items-start">
                    <div>
                       <div className="font-bold">{g.name}</div>
                       <div className="text-xs text-gray-500">Teacher: {g.teacherName}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteGroup(g); }} className="text-red-500 p-1"><Trash2 size={16}/></button>
                 </div>
              </div>
            ))}
            {groups.length === 0 && <p className="text-gray-400 text-center py-4">No groups.</p>}
         </div>

         <div className="col-span-2 flex flex-col h-full">
            {selectedGroup ? (
              <>
                <div className="border-b pb-2 mb-2 font-bold">{selectedGroup.name} - Chat</div>
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
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">Select a group</div>
            )}
         </div>
       </div>
    </Card>
  );
};

const CreateGroupForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    groupLeader: '', department: '', division: ''
  });
  const [groupSize, setGroupSize] = useState(3);
  const [members, setMembers] = useState(['', '']); // Initially 2 members (total 3 with leader)

  useEffect(() => {
    // Adjust members array size when groupSize changes (subtract 1 for leader)
    setMembers(prev => {
      const needed = Math.max(0, groupSize - 1);
      if (prev.length === needed) return prev;
      if (prev.length < needed) return [...prev, ...Array(needed - prev.length).fill('')];
      return prev.slice(0, needed);
    });
  }, [groupSize]);

  const updateMember = (index, val) => {
    const newMembers = [...members];
    newMembers[index] = val;
    setMembers(newMembers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newGroup = {
      id: `g${Date.now()}`,
      groupLeader: formData.groupLeader,
      department: formData.department,
      division: formData.division,
      groupSize: parseInt(groupSize),
      members: [formData.groupLeader, ...members.filter(m => m.trim() !== '')]
    };
    await ApiService.addGroup(newGroup);
    setFormData({ groupLeader: '', department: '', division: '' });
    setMembers(Array(Math.max(0, groupSize - 1)).fill(''));
    onSuccess('Student group created successfully!');
  };

  return (
    <Card title="Create Student Group" className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Input 
            label="Group Leader (Username)" 
            value={formData.groupLeader}
            onChange={e => setFormData({...formData, groupLeader: e.target.value})}
            required
            placeholder="e.g. student1"
          />
          <Select 
            label="Department"
            options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
            value={formData.department}
            onChange={e => setFormData({...formData, department: e.target.value})}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Division"
            options={DIVISIONS.map(d => ({ value: d, label: d }))}
            value={formData.division}
            onChange={e => setFormData({...formData, division: e.target.value})}
            required
          />
          <Input 
             label="Group Size (Min 1)"
             type="number"
             min="1"
             max="10"
             value={groupSize}
             onChange={e => setGroupSize(Math.max(1, parseInt(e.target.value)))}
             required
          />
        </div>

        {members.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <label className="ui-label">Group Members</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {members.map((m, i) => (
                 <Input 
                    key={i}
                    placeholder={`Member ${i + 2} Username`}
                    value={m}
                    onChange={e => updateMember(i, e.target.value)}
                    required
                />
               ))}
            </div>
          </div>
        )}

        <Button type="submit" className="w-full">Create Group</Button>
      </form>
    </Card>
  );
};

const MarksManager = ({ onSuccess }) => {
  const [filterDept, setFilterDept] = useState('');
  const [filterDiv, setFilterDiv] = useState('');
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [marks, assignments, submissions, groups, projects] = await Promise.all([
         ApiService.getMarks(),
         ApiService.getAssignments(),
         ApiService.getSubmissions(),
         ApiService.getGroups(),
         ApiService.getProjects()
      ]);

      let combined = marks.map(m => {
        const assignment = assignments.find(a => a.projectId === m.projectId && a.groupId === m.groupId);
        const group = groups.find(g => g.id === m.groupId);
        const project = projects.find(p => p.id === m.projectId);
        const submission = submissions.find(s => s.assignmentId === assignment?.id);
    
        return {
           ...m,
           groupLeader: group?.groupLeader,
           projectTitle: project?.title,
           division: group?.division,
           department: group?.department,
           studentLink: submission?.link || submission?.fileName || ''
        };
      });
      setData(combined);
    };
    fetchData();
  }, []);

  const filteredData = data.filter(d => {
     if(filterDept && d.department !== filterDept) return false;
     if(filterDiv && d.division !== filterDiv) return false;
     return true;
  });

  const handleUpdate = async (id, updates) => {
    const mark = data.find(m => m.id === id);
    if(mark) {
       await ApiService.saveMark({ ...mark, ...updates });
       setData(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
       onSuccess("Updates saved");
    }
  };

  const exportData = () => {
     if(filteredData.length === 0) return alert("No data to export");
     
     const headers = ["Group Leader", "Department", "Division", "Project", "Teacher Marks", "Admin Marks", "Rubrics"];
     const rows = filteredData.map(d => [
       d.groupLeader, d.department, d.division, d.projectTitle, d.teacherMarks, d.adminMarks, `"${d.rubrics || ''}"`
     ]);

     const csvContent = [
       headers.join(','),
       ...rows.map(r => r.join(','))
     ].join('\n');

     const blob = new Blob([csvContent], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `marks_export_${new Date().toISOString().split('T')[0]}.csv`;
     a.click();
  };

  return (
    <Card title="Finalize Marks & Rubrics">
      <div className="flex gap-4 mb-4 items-end">
         <div className="w-1/3">
           <Select 
             label="Filter by Department"
             options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
             value={filterDept}
             onChange={e => setFilterDept(e.target.value)}
           />
         </div>
         <div className="w-1/3">
           <Select 
             label="Filter by Division"
             options={DIVISIONS.map(d => ({ value: d, label: d }))}
             value={filterDiv}
             onChange={e => setFilterDiv(e.target.value)}
           />
         </div>
         <div className="pb-3">
            <Button variant="secondary" onClick={exportData}>
               <Download size={16}/> Export CSV
            </Button>
         </div>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
           <thead>
             <tr>
               <th>Group Leader</th>
               <th>Project</th>
               <th>Link</th>
               <th>Teacher Marks</th>
               <th>Rubrics/Comments</th>
               <th>Admin Marks</th>
               <th>Status</th>
             </tr>
           </thead>
           <tbody>
             {filteredData.map((row) => (
               <tr key={row.id}>
                 <td className="font-medium">{row.groupLeader}</td>
                 <td>{row.projectTitle}</td>
                 <td className="min-w-[150px]">
                    <div className="flex flex-col gap-1">
                      {row.studentLink && (
                        <span className="text-xs text-indigo-600 truncate max-w-[150px] inline-block" title={row.studentLink}>
                           {row.studentLink}
                        </span>
                      )}
                      <input 
                         type="text"
                         className="ui-input"
                         style={{fontSize: '0.75rem', padding: '0.25rem'}}
                         placeholder="Project URL..."
                         defaultValue={row.projectLink}
                         onBlur={(e) => handleUpdate(row.id, { projectLink: e.target.value })}
                      />
                    </div>
                 </td>
                 <td className="text-indigo-600 font-bold text-center">{row.teacherMarks || '-'}</td>
                 <td className="text-xs">{row.rubrics || 'No rubrics'}</td>
                 <td>
                   <input 
                      type="number" 
                      className="ui-input w-20 text-center font-bold" 
                      defaultValue={row.adminMarks} 
                      onBlur={(e) => handleUpdate(row.id, { adminMarks: parseInt(e.target.value) })}
                   />
                 </td>
                 <td>
                   {row.isSubmittedToAdmin ? <Badge color="green">Submitted</Badge> : <Badge color="yellow">Pending</Badge>}
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
        {filteredData.length === 0 && <div className="text-center py-8 text-gray-500">No marks submitted by teachers yet.</div>}
      </div>
    </Card>
  );
};

// ... Include AddProjectForm, AssignProjectForm, ViewGuidesTable, ViewAssignmentsList, SubmittedProjectsList, UsersManagement, ChatMonitor from before (unchanged or minor tweaks) ...
const AddProjectForm = ({ teachers, onSuccess, adminId }) => {
  const [formData, setFormData] = useState({
    title: '', description: '', department: '', guideId: '', dueDate: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newProject = {
      id: `p${Date.now()}`,
      ...formData,
      createdBy: adminId
    };
    await ApiService.addProject(newProject);
    setFormData({ title: '', description: '', department: '', guideId: '', dueDate: '' });
    onSuccess('Project added successfully!');
  };

  return (
    <Card title="Add New Project" className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Project Title" 
          value={formData.title} 
          onChange={e => setFormData({...formData, title: e.target.value})} 
          required 
        />
        <div className="w-full">
          <label className="ui-label">Description</label>
          <textarea 
            className="ui-input"
            rows={3}
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Department"
            options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
            value={formData.department}
            onChange={e => setFormData({...formData, department: e.target.value})}
            required
          />
          <Select 
            label="Guide (Teacher)"
            options={teachers.map(t => ({ value: t.id, label: t.fullName }))}
            value={formData.guideId}
            onChange={e => setFormData({...formData, guideId: e.target.value})}
            required
          />
        </div>
        <Input 
          label="Due Date" 
          type="date"
          value={formData.dueDate}
          onChange={e => setFormData({...formData, dueDate: e.target.value})}
          required
        />
        <Button type="submit" className="w-full">Save Project</Button>
      </form>
    </Card>
  );
};

const AssignProjectForm = ({ projects, groups, adminId, onSuccess }) => {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  const groupDetails = groups.find(g => g.id === selectedGroup);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedProject || !selectedGroup) return;

    const assignments = await ApiService.getAssignments();
    const existing = assignments.find(a => a.projectId === selectedProject && a.groupId === selectedGroup);
    if(existing) {
        alert("This project is already assigned to this group.");
        return;
    }

    const assignment = {
      id: `a${Date.now()}`,
      projectId: selectedProject,
      groupId: selectedGroup,
      assignedBy: adminId,
      status: 'ASSIGNED',
      assignedDate: new Date().toISOString()
    };
    await ApiService.assignProject(assignment);
    setSelectedProject('');
    setSelectedGroup('');
    onSuccess('Project assigned to group successfully!');
  };

  return (
    <Card title="Assign Project to Group" className="max-w-2xl mx-auto">
      <form onSubmit={handleAssign} className="space-y-6">
        <Select 
          label="Select Project"
          options={projects.map(p => ({ value: p.id, label: `${p.title} (${p.department})` }))}
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          required
        />
        
        <Select 
          label="Select Student Group"
          options={groups.map(g => ({ value: g.id, label: `Leader: ${g.groupLeader} - Div ${g.division}` }))}
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
          required
        />

        {groupDetails && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Selected Group Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <p><strong>Leader:</strong> {groupDetails.groupLeader}</p>
              <p><strong>Department:</strong> {groupDetails.department}</p>
              <p><strong>Division:</strong> {groupDetails.division}</p>
              <p><strong>Size:</strong> {groupDetails.groupSize} Students</p>
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={!selectedProject || !selectedGroup}>
          Assign Project
        </Button>
      </form>
    </Card>
  );
};

const ViewGuidesTable = ({ assignments, groups, projects, teachers }) => {
  const data = assignments.map((a) => {
    const group = groups.find((g) => g.id === a.groupId);
    const project = projects.find((p) => p.id === a.projectId);
    const guide = teachers.find((t) => t.id === project?.guideId);
    return {
      id: a.id,
      leader: group?.groupLeader || 'Unknown',
      guideName: guide?.fullName || 'Unassigned',
      projectTitle: project?.title || 'Unknown',
      dept: project?.department
    };
  });

  return (
    <Card title="View Guides Allocation">
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Group Leader</th>
              <th>Department</th>
              <th>Project</th>
              <th>Assigned Guide</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map((item) => (
              <tr key={item.id}>
                <td className="font-medium text-gray-900 dark:text-white">{item.leader}</td>
                <td>{item.dept}</td>
                <td>{item.projectTitle}</td>
                <td className="text-indigo-600 dark:text-indigo-400 font-medium">{item.guideName}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="text-center">No assignments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const ViewAssignmentsList = ({ assignments, groups, projects }) => {
   const data = assignments.map((a) => {
    const group = groups.find((g) => g.id === a.groupId);
    const project = projects.find((p) => p.id === a.projectId);
    return {
      id: a.id,
      projectTitle: project?.title,
      group: group ? `Leader: ${group.groupLeader} (Div ${group.division})` : 'Unknown Group',
      status: a.status,
      dueDate: project?.dueDate
    };
  });

  return (
    <Card title="All Project Assignments">
       <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Project Title</th>
              <th>Assigned Group</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
             {data.length > 0 ? data.map((item) => (
              <tr key={item.id}>
                <td className="font-medium">{item.projectTitle}</td>
                <td>{item.group}</td>
                <td>{item.dueDate}</td>
                <td>
                  <Badge color={item.status === 'SUBMITTED' ? 'green' : 'yellow'}>{item.status}</Badge>
                </td>
              </tr>
            )) : (
               <tr><td colSpan={4} className="text-center">No active assignments.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const SubmittedProjectsList = ({ assignments, groups, projects }) => {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    ApiService.getSubmissions().then(setSubmissions);
  }, []);
  
  const data = submissions.map((sub) => {
    const assignment = assignments.find((a) => a.id === sub.assignmentId);
    const project = projects.find((p) => p.id === assignment?.projectId);
    const group = groups.find((g) => g.id === assignment?.groupId);
    
    return {
      id: sub.id,
      project: project?.title,
      groupLeader: group?.groupLeader,
      date: sub.submissionDate,
      file: sub.fileName || 'No File',
      link: sub.link,
      grade: sub.grade || 'Pending'
    };
  });

  return (
    <Card title="Submitted Projects">
       <div className="grid gap-4">
         {data.length > 0 ? data.map((item) => (
           <div key={item.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
             <div className="flex justify-between items-start">
               <div>
                 <h4 className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">{item.project}</h4>
                 <p className="text-sm text-gray-600 dark:text-gray-400">Submitted by: <span className="font-medium">{item.groupLeader}</span></p>
               </div>
               <Badge color={item.grade === 'Pending' ? 'yellow' : 'green'}>{item.grade}</Badge>
             </div>
             <div className="mt-3 flex flex-col gap-2 text-sm text-gray-500">
               {item.file !== 'No File' && <span className="flex items-center gap-1"><FileText size={16}/> {item.file}</span>}
               {item.link && <a href={item.link} target="_blank" className="flex items-center gap-1 text-indigo-500 hover:underline"><CheckCircle size={16}/> {item.link}</a>}
               <span className="flex items-center gap-1 text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</span>
             </div>
           </div>
         )) : (
            <div className="text-center py-10 text-gray-500">No submissions yet.</div>
         )}
       </div>
    </Card>
  );
};

const UsersManagement = ({ onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '', password: '123', fullName: '', role: 'STUDENT', department: DEPARTMENTS[0], division: DIVISIONS[0], prn: ''
  });
  const [filterRole, setFilterRole] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDiv, setFilterDiv] = useState('');

  useEffect(() => {
    ApiService.getUsers().then(u => {
      // Admin sees everyone EXCEPT developers
      setUsers(u.filter(user => user.role !== 'DEVELOPER'));
    });
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    const user = {
      id: `u${Date.now()}`,
      ...newUser,
      prn: newUser.role === 'STUDENT' ? newUser.prn : undefined,
      division: newUser.role === 'STUDENT' ? newUser.division : undefined
    };
    await ApiService.register(user);
    // Refresh list
    const u = await ApiService.getUsers();
    setUsers(u.filter(user => user.role !== 'DEVELOPER'));
    onSuccess("User registered successfully");
    setNewUser({ username: '', password: '123', fullName: '', role: 'STUDENT', department: DEPARTMENTS[0], division: DIVISIONS[0], prn: '' });
  };

  const filteredUsers = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterDept && u.department !== filterDept) return false;
    if (filterRole === 'STUDENT' && filterDiv && u.division !== filterDiv) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <Card title="All Users">
        <div className="filter-row">
           <Select className="filter-item" label="Filter Role" options={['ADMIN','TEACHER','STUDENT'].map(r=>({value:r, label:r}))} value={filterRole} onChange={e => setFilterRole(e.target.value)} />
           <Select className="filter-item" label="Filter Dept" options={DEPARTMENTS.map(d=>({value:d, label:d}))} value={filterDept} onChange={e => setFilterDept(e.target.value)} />
           {filterRole === 'STUDENT' && (
             <Select className="filter-item" label="Filter Div" options={DIVISIONS.map(d=>({value:d, label:d}))} value={filterDiv} onChange={e => setFilterDiv(e.target.value)} />
           )}
        </div>

        <div className="table-wrapper max-h-96">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Dept</th>
                <th>Div/PRN</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.fullName}</td>
                  <td>{u.role}</td>
                  <td>{u.department}</td>
                  <td>{u.role === 'STUDENT' ? `${u.division} / ${u.prn}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const ChatMonitor = ({ teachers, adminUser }) => {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if(selectedTeacher) {
       ApiService.getAssignmentsForTeacher(selectedTeacher).then(async (assignments) => {
          const allGroups = await ApiService.getGroups();
          const allProjects = await ApiService.getProjects();
          
          const mappedGroups = assignments.map(a => {
             const grp = allGroups.find(g => g.id === a.groupId);
             const proj = allProjects.find(p => p.id === a.projectId);
             return { ...grp, projectName: proj?.title };
          }).filter(Boolean);
          setGroups(mappedGroups);
       });
    }
  }, [selectedTeacher]);

  useEffect(() => {
    if(selectedGroup) {
      const fetchChats = async () => {
         const allChats = await ApiService.getChats();
         setChats(allChats.filter(c => c.targetId === selectedGroup && c.targetType === 'GROUP'));
      };
      fetchChats();
      const interval = setInterval(fetchChats, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const deleteMessage = async (id) => {
    await ApiService.deleteChat(id);
    setChats(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
      <Card title="1. Select Teacher" className="h-full overflow-y-auto">
        <div className="space-y-2">
          {teachers.map(t => (
            <button key={t.id} onClick={() => { setSelectedTeacher(t.id); setSelectedGroup(''); }} className={`w-full text-left p-3 rounded-lg ${selectedTeacher === t.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50'}`}>
              <div className="font-semibold">{t.fullName}</div>
              <div className="text-xs text-gray-500">{t.department}</div>
            </button>
          ))}
        </div>
      </Card>
      
      <Card title="2. Select Group" className="h-full overflow-y-auto">
        {selectedTeacher ? (
          <div className="space-y-2">
             {groups.map((g) => (
               <button key={g.id} onClick={() => setSelectedGroup(g.id)} className={`w-full text-left p-3 rounded-lg ${selectedGroup === g.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50'}`}>
                 <div className="font-semibold">{g.groupLeader}</div>
                 <div className="text-xs text-gray-500">{g.projectName}</div>
               </button>
             ))}
             {groups.length === 0 && <div className="text-gray-400 text-center py-4">No groups assigned.</div>}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-10">Select a teacher first</div>
        )}
      </Card>

      <Card title="3. Chat History" className="h-full flex flex-col">
        {selectedGroup ? (
          <div className="flex-1 overflow-y-auto space-y-4 p-2 bg-gray-50 rounded-lg">
             {chats.length > 0 ? chats.map(c => (
               <div key={c.id} className={`p-3 rounded-lg max-w-[80%] group relative ${c.senderId === selectedTeacher ? 'bg-indigo-100 ml-auto' : 'bg-white mr-auto'}`}>
                  <div className="flex justify-between items-center gap-2">
                    <div className="text-xs font-bold text-gray-600 mb-1">{c.senderName}</div>
                    <button onClick={() => deleteMessage(c.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="text-sm">{c.message}</div>
                  <div className="text-[10px] text-gray-400 text-right mt-1">{new Date(c.timestamp).toLocaleString()}</div>
               </div>
             )) : <div className="text-center text-gray-400 mt-10">No messages yet.</div>}
             <div ref={bottomRef} />
          </div>
        ) : (
          <div className="text-gray-400 text-center py-10">Select a group to view chats</div>
        )}
      </Card>
    </div>
  );
};