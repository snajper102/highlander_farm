// src/components/DeleteCowDialog.jsx
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, AlertCircle, Archive } from 'lucide-react'; // Importuj ikonę Archive

export function DeleteCowDialog({ cow, open, onOpenChange, onConfirm, loading, error }) {
  if (!cow) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          {/* ZMIANA TEKSTU */}
          <DialogTitle>Czy na pewno zarchiwizować krowę?</DialogTitle>
        </DialogHeader>
                
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {/* ZMIANA TEKSTU */}
            Krowa zostanie oznaczona jako "Zarchiwizowana" i zniknie z domyślnej listy.
            Jej historia i dane zostaną zachowane.
          </p>
                    
          <div className="bg-card p-4 rounded-lg border">
            <p className="font-semibold">{cow.name}</p>
            <p className="text-sm text-muted-foreground">Tag: {cow.tag_id}</p>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3 pt-4">
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archiwizowanie...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Tak, zarchiwizuj
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
