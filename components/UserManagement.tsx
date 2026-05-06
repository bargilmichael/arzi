
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { Language, translations } from '../translations';

interface UserProfile {
  uid: string | null;
  email: string;
  displayName: string | null;
  role: 'admin' | 'contractor' | 'viewer';
  discipline?: string;
}

interface Props {
  lang: Language;
}

const UserManagement: React.FC<Props> = ({ lang }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserProfile['role']>('viewer');
  const [newDiscipline, setNewDiscipline] = useState<string>('all');
  const t = translations[lang];

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      // Sort users: admins first, then by email
      const sortedUsers = usersData.sort((a: any, b: any) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.email.localeCompare(b.email);
      });
      setUsers(sortedUsers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserProfile['role']) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
    } catch (error) {
      console.error("Error updating role:", error);
      alert(t.errorUpdatingRole);
    }
  };

  const handleDisciplineChange = async (userId: string, discipline: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { discipline });
    } catch (error) {
      console.error("Error updating discipline:", error);
      alert(t.errorUpdatingRole); // Reusing translation for simplicity or add specific one if needed
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      // Use email as document ID for pre-added users to avoid duplicates
      const userRef = doc(db, 'users', newEmail.trim().toLowerCase());
      await setDoc(userRef, {
        uid: null,
        email: newEmail.trim().toLowerCase(),
        displayName: null,
        role: newRole,
        discipline: newRole === 'contractor' ? newDiscipline : 'all'
      });
      setNewEmail('');
      setNewRole('viewer');
      setNewDiscipline('all');
      alert(t.userAdded);
    } catch (error) {
      console.error("Error adding user:", error);
      alert(t.errorAddingUser);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === 'bargil.michael@gmail.com') return;
    const confirmMsg = lang === 'he' ? `האם למחוק את המשתמש ${email}?` : lang === 'ru' ? `Удалить пользователя ${email}?` : `هل تريد حذف المستخدم ${email}؟`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  if (loading) return (
    <div className="p-8 text-center font-bold text-gray-500">
      {lang === 'he' ? 'טוען משתמשים...' : lang === 'ru' ? 'Загрузка пользователей...' : 'جاري تحميل المستخدمين...'}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
          <span className="bg-blue-50 p-2 rounded-xl">➕</span> 
          {t.addUser}
        </h2>
        
        <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4">
          <input 
            type="email" 
            placeholder={t.emailPlaceholder}
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            required
            className="flex-1 p-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold transition-all"
          />
          <select 
            value={newRole}
            onChange={e => setNewRole(e.target.value as UserProfile['role'])}
            className="p-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-black transition-all bg-white"
          >
            <option value="admin">{t.adminRole}</option>
            <option value="contractor">{t.contractorRole}</option>
            <option value="viewer">{t.viewerRole}</option>
          </select>

          {newRole === 'contractor' && (
            <select 
              value={newDiscipline}
              onChange={e => setNewDiscipline(e.target.value)}
              className="p-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-black transition-all bg-white animate-in slide-in-from-right-2"
            >
              <option value="all">{t.allDisciplines}</option>
              <option value="plumbing">{t.discipline_plumbing}</option>
              <option value="general">{t.discipline_general}</option>
              <option value="rappelling">{t.discipline_rappelling}</option>
              <option value="telefire">{t.discipline_telefire}</option>
              <option value="itumit">{t.discipline_itumit}</option>
              <option value="emperion">{t.discipline_emperion}</option>
              <option value="workers">{t.discipline_workers}</option>
            </select>
          )}

          <button 
            type="submit" 
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
          >
            {t.add}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
          <span className="bg-blue-50 p-2 rounded-xl">👥</span> 
          {t.userManagement}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">{t.userName}</th>
                <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">{t.userEmail}</th>
                <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">{t.userRole}</th>
                <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">{t.discipline || 'תחום'}</th>
                <th className="py-4 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-black text-gray-700">{user.displayName || '---'}</td>
                  <td className="py-4 px-4 font-bold text-gray-500 text-sm">{user.email}</td>
                  <td className="py-4 px-4">
                    <select 
                      value={user.role} 
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserProfile['role'])}
                      disabled={user.email === 'bargil.michael@gmail.com'}
                      className={`px-4 py-2 rounded-xl font-black text-xs border-2 transition-all outline-none ${
                        user.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' :
                        user.role === 'contractor' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        'bg-gray-50 text-gray-600 border-gray-100'
                      } ${user.email === 'bargil.michael@gmail.com' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}
                    >
                      <option value="admin">{t.adminRole}</option>
                      <option value="contractor">{t.contractorRole}</option>
                      <option value="viewer">{t.viewerRole}</option>
                    </select>
                  </td>
                  <td className="py-4 px-4">
                    {user.role === 'contractor' && (
                      <select 
                        value={user.discipline || 'all'} 
                        onChange={(e) => handleDisciplineChange(user.id, e.target.value)}
                        className="px-4 py-2 rounded-xl font-black text-xs border-2 border-gray-100 bg-white hover:border-blue-400 transition-all outline-none cursor-pointer"
                      >
                        <option value="all">{t.allDisciplines}</option>
                        <option value="plumbing">{t.discipline_plumbing}</option>
                        <option value="general">{t.discipline_general}</option>
                        <option value="rappelling">{t.discipline_rappelling}</option>
                        <option value="telefire">{t.discipline_telefire}</option>
                        <option value="itumit">{t.discipline_itumit}</option>
                        <option value="emperion">{t.discipline_emperion}</option>
                        <option value="workers">{t.discipline_workers}</option>
                      </select>
                    )}
                    {user.role !== 'contractor' && <span className="text-gray-300 font-bold text-xs uppercase">---</span>}
                  </td>
                  <td className="py-4 px-4 text-left">
                    {user.email !== 'bargil.michael@gmail.com' && (
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-400 hover:text-red-600 p-2 transition-colors"
                          title={lang === 'he' ? 'מחק משתמש' : lang === 'ru' ? 'Удалить пользователя' : 'حذف المستخدم'}
                        >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <p className="text-xs font-bold text-blue-700 leading-relaxed">
            💡 {t.roleExplanation}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
