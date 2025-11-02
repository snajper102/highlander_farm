// src/pages/cow-detail/DocumentList.jsx
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { repository } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Loader2, Upload, FileText, FileImage, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

const getFileIcon = (filename) => {
  if (!filename) return <FileText className="w-5 h-5 text-muted-foreground" />;
  const ext = filename.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return <FileImage className="w-5 h-5 text-blue-500" />;
  }
  if (ext === 'pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  return <FileText className="w-5 h-5 text-gray-500" />;
};

function DocumentUploadForm({ cowId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Proszę wybrać plik.");
      return;
    }
    if (cowId < 0) {
      toast.error("Nie można dodać dokumentu do niezsynchronizowanej krowy.");
      return;
    }
    
    setLoading(true);
    try {
      await repository.uploadDocument(cowId, title || file.name, file);
      setFile(null);
      setTitle('');
      e.target.reset(); 
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      toast.error(`Błąd przesyłania: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Prześlij nowy dokument</CardTitle>
        <CardDescription>
          Przesyłanie plików działa tylko w trybie online.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="doc_title">Tytuł / Opis</Label>
            <Input
              id="doc_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Paszport, Wyniki badań..."
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="doc_file">Plik (PDF, JPG, PNG)</Label>
            <Input
              id="doc_file"
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              disabled={loading}
              className="file:text-primary"
            />
          </div>
          <Button type="submit" disabled={loading || !file}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Prześlij plik
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function DocumentList({ cowId }) {
  const documents = useLiveQuery(
    () => repository.getDocumentsQuery(cowId),
    [cowId],
    undefined // Ustawiamy undefined, aby pokazać loader
  );

  const [loading, setLoading] = useState(false);

  const syncDocs = () => {
    if (cowId > 0 && navigator.onLine) {
      setLoading(true);
      repository.syncDocuments(cowId).finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    syncDocs();
  }, [cowId]);
  
  const handleDelete = async (docId) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten dokument?")) {
        try {
            await repository.deleteDocument(docId);
            // useLiveQuery odświeży listę
        } catch (err) {
            toast.error(err.message);
        }
    }
  };

  if (documents === undefined || (loading && !documents)) {
     return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <DocumentUploadForm cowId={cowId} onUploadSuccess={syncDocs} />
      
      <Card>
        <CardHeader>
          <CardTitle>Zapisane dokumenty</CardTitle>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <p className="text-muted-foreground">Brak dokumentów dla tej krowy.</p>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted">
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.filename)}
                    <div>
                      <h4 className="font-medium text-foreground">{doc.title}</h4>
                      <p className="text-sm text-muted-foreground">{doc.filename} - {new Date(doc.uploaded_at).toLocaleDateString('pl-PL')}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Pobierz" asChild disabled={!doc.file_url}>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" title="Usuń" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
