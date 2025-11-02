// src/pages/UserManagementPage.jsx
import { useState, useEffect } from 'react';
import { repository, networkApi } from '../services/api';
import { useLiveQuery } from 'dexie-react-hooks';
import { Loader2, AlertCircle, Plus, Edit2, Trash2, KeyRound, UserCheck, UserX } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';

// Mini-formularz do tworzenia użytkownika
function UserForm({ user, onSubmit, onCancel }) {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [isStaff, setIsStaff] = useState(user?.is_staff || false);
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { username, is_staff: isStaff, is_active: isActive };
      if (!user && password) { // Tylko przy tworzeniu
        payload.password = password;
      }
      await onSubmit(payload, user?.id);
      onCancel();
    } catch (err) {
      toast.error(`Błąd: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="username">Nazwa użytkownika</Label>
        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
      {!user && ( // Pokaż hasło tylko przy tworzeniu
        <div>
          <Label htmlFor="password">Hasło (min. 8 znaków)</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
      )}
      <div className="flex items-center space-x-2">
        <Checkbox id="is_staff" checked={isStaff} onCheckedChange={setIsStaff} />
        <Label htmlFor="is_staff">Admin (może zarządzać użytkownikami)</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="is_active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="is_active">Aktywny (może się logować)</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Anuluj</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (user ? 'Zapisz zmiany' : 'Stwórz użytkownika')}
        </Button>
      </div>
    </form>
  );
}

// Mini-formularz do zmiany hasła
function PasswordForm({ user, onSubmit, onCancel }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(password, user.id);
            onCancel();
        } catch (err) {
            toast.error(`Błąd: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="password">Nowe hasło (min. 8 znaków)</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>Anuluj</Button>
                <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zmień hasło'}
                </Button>
            </div>
        </form>
    );
}

export function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Stany dialogów
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // null = nowy, obiekt = edycja

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await networkApi.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (payload) => {
    await networkApi.createUser(payload);
    toast.success("Użytkownik stworzony!");
    fetchUsers(); // Odśwież listę
  };
  
  const handleUpdate = async (payload, id) => {
    await networkApi.updateUser(id, payload);
    toast.success("Użytkownik zaktualizowany!");
    fetchUsers(); // Odśwież listę
  };

  const handleSetPassword = async (password, id) => {
    await networkApi.setUserPassword(id, password);
    toast.success("Hasło zmienione!");
  };

  const handleDelete = async (id) => {
    if (window.confirm("Czy na pewno chcesz usunąć tego użytkownika? Tej akcji nie można cofnąć.")) {
      try {
        await networkApi.deleteUser(id);
        toast.success("Użytkownik usunięty.");
        fetchUsers();
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Zarządzanie użytkownikami</h1>
        <Button onClick={() => { setSelectedUser(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj użytkownika
        </Button>
      </div>

      <div className="space-y-4">
        {users.map(user => (
          <Card key={user.id} className="bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{user.username}</h3>
                <div className="flex gap-2">
                  {user.is_staff ? (
                    <Badge variant="default">Admin</Badge>
                  ) : (
                    <Badge variant="secondary">Operator</Badge>
                  )}
                  {user.is_active ? (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      <UserCheck className="w-4 h-4 mr-1"/> Aktywny
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <UserX className="w-4 h-4 mr-1"/> Nieaktywny
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Dołączył: {new Date(user.date_joined).toLocaleDateString('pl-PL')}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" title="Zmień hasło" onClick={() => { setSelectedUser(user); setIsPasswordOpen(true); }}>
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Edytuj" onClick={() => { setSelectedUser(user); setIsFormOpen(true); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Usuń" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(user.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog do tworzenia / edycji */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent onClose={() => setIsFormOpen(false)}>
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edytuj użytkownika' : 'Stwórz nowego użytkownika'}</DialogTitle>
          </DialogHeader>
          <UserForm 
            user={selectedUser}
            onSubmit={selectedUser ? handleUpdate : handleCreate}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Dialog do zmiany hasła */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent onClose={() => setIsPasswordOpen(false)}>
          <DialogHeader>
            <DialogTitle>Zmień hasło dla: {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <PasswordForm
            user={selectedUser}
            onSubmit={handleSetPassword}
            onCancel={() => setIsPasswordOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
