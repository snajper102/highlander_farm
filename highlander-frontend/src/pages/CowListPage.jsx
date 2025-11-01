// src/pages/CowListPage.jsx

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CowCard } from '../components/CowCard';
import { CowForm } from '../components/CowForm';
import { DeleteCowDialog } from '../components/DeleteCowDialog';
import { api } from '../services/api';

// Przyjmujemy propsy z App.jsx do zarządzania modem "Dodaj"
export function CowListPage({ isAddDialogOpen, setIsAddDialogOpen, openAddDialog }) {
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Stany dialogów Edit i Delete pozostają lokalne
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCow, setSelectedCow] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    fetchCows();
  }, []);

  const fetchCows = async () => {
    try {
      setLoading(true);
      const data = await api.getCows();
      setCows(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja zamykająca wszystkie dialogi i resetująca stan
  const closeAllDialogs = () => {
    setIsAddDialogOpen(false); // Używamy settera z propsów
    setIsEditDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setSelectedCow(null);
    setFormError(null);
    setPhotoFile(null); 
  };

  // Handler "Dodaj" używa settera z propsów
  const handleAddCow = async (formData) => {
    try {
      setFormLoading(true);
      setFormError(null);
      const { photo, ...dataToSend } = formData;
      const newCow = await api.createCow(dataToSend);
      if (photoFile && newCow.id) {
        await api.uploadPhoto(newCow.id, photoFile);
      }
      await fetchCows();
      closeAllDialogs();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Reszta handlerów (Edit, Delete) bez zmian
  const handleEditCow = async (formData) => {
    try {
      setFormLoading(true);
      setFormError(null);
      const { photo, ...dataToSend } = formData;
      const updatedCow = await api.updateCow(selectedCow.id, dataToSend);
      if (photoFile && updatedCow.id) {
        await api.uploadPhoto(updatedCow.id, photoFile);
      }
      await fetchCows();
      closeAllDialogs();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCow = async () => {
    if (!selectedCow) return;
    try {
      setFormLoading(true);
      setFormError(null);
      await api.deleteCow(selectedCow.id);
      await fetchCows();
      closeAllDialogs();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Openery dialogów (Edit, Delete) bez zmian
  const openEditDialog = (cow) => {
    setSelectedCow(cow);
    setFormError(null);
    setPhotoFile(null); 
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (cow) => {
    setSelectedCow(cow);
    setFormError(null);
    setPhotoFile(null); 
    setIsDeleteDialogOpen(true);
  };
  
  // openAddDialog jest teraz przekazywane z góry
  
  const getCowCountLabel = () => {
    const count = cows.length;
    if (count === 1) return 'krowa';
    if (count > 1 && count < 5) return 'krowy';
    return 'krów';
  };

  // Stany ładowania i błędu (bez zmian)
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error} - Upewnij się, że backend Django działa na localhost:8000
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* NAGŁÓWEK ZOSTAŁ USUNIĘTY 
        (Jest teraz w App.jsx -> MainLayout)
      */}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Pasek z liczbą krów i przyciskiem - widoczny tylko na mobile */}
        <div className="flex sm:hidden items-center justify-between mb-4">
          <Badge variant="outline" className="text-base px-4 py-2">
            {cows.length} {getCowCountLabel()}
          </Badge>
          <Button onClick={openAddDialog} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Dodaj
          </Button>
        </div>

        {cows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">
              Brak krów w bazie danych.
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj pierwszą krowę
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cows.map((cow) => (
              <CowCard
                key={cow.id}
                cow={cow}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onClick={() => console.log('View cow details:', cow)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog (używa propsów isAddDialogOpen, setIsAddDialogOpen) */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent onClose={closeAllDialogs}>
          <DialogHeader>
            <DialogTitle>Dodaj nową krowę</DialogTitle>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <CowForm
            onSubmit={handleAddCow}
            onCancel={closeAllDialogs}
            loading={formLoading}
            onPhotoChange={setPhotoFile} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (działa lokalnie) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent onClose={closeAllDialogs}>
          <DialogHeader>
            <DialogTitle>Edytuj krowę</DialogTitle>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <CowForm
            cow={selectedCow}
            onSubmit={handleEditCow}
            onCancel={closeAllDialogs}
            loading={formLoading}
            onPhotoChange={setPhotoFile} 
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog (działa lokalnie) */}
      <DeleteCowDialog
        cow={selectedCow}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteCow}
        loading={formLoading}
        error={formError}
      />

      {/* Footer został usunięty, bo mamy dolną nawigację */}
    </div>
  );
}
